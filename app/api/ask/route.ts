import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk";
import { buildSystemInstruction } from "@/app/data/shubhamProfile";
import {
  matchFallbackAnswer,
  UNRECOGNIZED_FALLBACK_MESSAGE,
} from "@/app/data/fallbackAnswers";
import type { MessageProvider, MessageSource } from "@/app/types";

// ── Rate Limiting (in-memory sliding window, resets per cold start) ──────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;
const ipRequests = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipRequests.get(ip);
  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    ipRequests.set(ip, { count: 1, windowStart: now });
    return false;
  }
  if (record.count >= RATE_LIMIT_MAX) return true;
  record.count++;
  return false;
}

// ── Gemini Circuit Breaker & Cooldown Tracker ────────────────────────────────
// When Gemini hits HTTP 429 / RESOURCE_EXHAUSTED, cooldown is activated for
// 10 minutes so subsequent calls immediately skip to Groq without incurring latency.
const CIRCUIT_BREAKER_COOLDOWN_MS = 10 * 60_000;
let geminiCircuitBreakerUntil = 0;
const modelCooldowns = new Map<string, number>();

function isGeminiCooledDown(): boolean {
  if (geminiCircuitBreakerUntil > Date.now()) {
    return true;
  }
  if (geminiCircuitBreakerUntil !== 0) {
    geminiCircuitBreakerUntil = 0; // reset once expired
  }
  return false;
}

function tripGeminiCircuitBreaker(): void {
  geminiCircuitBreakerUntil = Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS;
  console.warn(
    `[Circuit Breaker] Gemini quota exhausted. Tripped circuit breaker for ${CIRCUIT_BREAKER_COOLDOWN_MS / 60_000} minutes. Routing to Groq.`,
  );
}

function isModelCooledDown(modelId: string): boolean {
  const cooldownUntil = modelCooldowns.get(modelId);
  if (!cooldownUntil) return false;
  if (Date.now() > cooldownUntil) {
    modelCooldowns.delete(modelId);
    return false;
  }
  return true;
}

function markModelExhausted(modelId: string): void {
  modelCooldowns.set(modelId, Date.now() + CIRCUIT_BREAKER_COOLDOWN_MS);
}

// ── Helper: Timeout Wrapper for Promises ──────────────────────────────────────
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  timeoutErrorMsg: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(timeoutErrorMsg)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timer),
  );
}

// ── Secondary Provider: Groq Official SDK ─────────────────────────────────────
async function callGroqProvider(
  question: string,
  systemInstruction: string,
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }

  try {
    const groq = new Groq({ apiKey: apiKey.trim() });
    const configuredModel =
      process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-20b";

    // Fallback list of resilient Groq models if the configured one fails
    const candidateModels = Array.from(
      new Set([
        configuredModel,
        "llama-3.3-70b-versatile",
        "qwen/qwen3.8-27b",
        "llama-3.1-8b-instant",
      ]),
    );

    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemInstruction },
      ...history.map((turn) => ({
        role:
          turn.role === "model" ? ("assistant" as const) : ("user" as const),
        content: turn.parts.map((p) => p.text).join(" "),
      })),
      { role: "user", content: question },
    ];

    for (const model of candidateModels) {
      try {
        const response = await groq.chat.completions.create(
          {
            model,
            messages,
            // 800 tokens to ensure thinking/reasoning models (like gpt-oss-20b) have enough space for final content
            max_tokens: 800,
            temperature: 0.2,
          },
          { timeout: 7000 },
        );

        const answer = response.choices?.[0]?.message?.content?.trim();
        if (answer) {
          console.info(`[Provider selected]: groq (model: ${model})`);
          return answer;
        }
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        const isAuthError =
          errMsg.includes("401") ||
          errMsg.toLowerCase().includes("invalid api key") ||
          errMsg.toLowerCase().includes("unauthorized");

        console.warn(`[Groq fallback model error] (${model}):`, errMsg);

        // If credentials are invalid, avoid looping through other models with the same bad key
        if (isAuthError) {
          break;
        }
      }
    }

    return null;
  } catch (clientErr: unknown) {
    const errMsg =
      clientErr instanceof Error ? clientErr.message : String(clientErr);
    console.warn("[Groq client initialization error]:", errMsg);
    return null;
  }
}

// ── Standard Response Helper ──────────────────────────────────────────────────
function buildResponse(
  answer: string,
  provider: MessageProvider,
  fallbackUsed: boolean,
  isFallback: boolean,
  source: MessageSource,
  status = 200,
) {
  return NextResponse.json(
    {
      answer,
      provider,
      fallbackUsed,
      isFallback,
      source,
    },
    { status },
  );
}

// ── Main Route Handler ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Abuse Protection & Rate Limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  // 2. Parse & Validate Request Body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("question" in body)) {
    return NextResponse.json(
      { error: "Missing required field: question." },
      { status: 400 },
    );
  }

  const { question, history } = body as {
    question: unknown;
    history?: unknown;
  };

  if (typeof question !== "string" || question.trim().length === 0) {
    return NextResponse.json(
      { error: "Question must be a non-empty string." },
      { status: 400 },
    );
  }

  // Bound maximum question length to 1000 characters
  if (question.trim().length > 1000) {
    return NextResponse.json(
      { error: "Question must be 1,000 characters or fewer." },
      { status: 400 },
    );
  }

  const trimmedQuestion = question.trim();

  // 3. Build Conversation History (bounded to last 6 turns, max 1000 chars/part)
  const safeHistory: Array<{
    role: "user" | "model";
    parts: Array<{ text: string }>;
  }> = [];

  if (Array.isArray(history)) {
    const recent = history.slice(-6);
    for (const turn of recent) {
      if (
        turn &&
        typeof turn === "object" &&
        "role" in turn &&
        "parts" in turn &&
        (turn.role === "user" || turn.role === "model") &&
        Array.isArray(turn.parts)
      ) {
        const validParts = (turn.parts as unknown[])
          .filter(
            (p) =>
              p &&
              typeof p === "object" &&
              "text" in p &&
              typeof (p as { text: unknown }).text === "string",
          )
          .map((p) => ({
            text: (p as { text: string }).text.slice(0, 1000),
          }));
        if (validParts.length > 0) {
          safeHistory.push({ role: turn.role, parts: validParts });
        }
      }
    }
  }

  const systemInstruction = buildSystemInstruction();
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

  // ── PRIORITY 1: GOOGLE GEMINI (PRIMARY) ────────────────────────────────────
  if (geminiApiKey && !isGeminiCooledDown()) {
    const candidateModels = Array.from(
      new Set(
        [
          process.env.GEMINI_MODEL?.trim(),
          "gemini-2.5-flash",
          "gemini-3.5-flash",
          "gemini-3-flash-preview",
          "gemini-3.5-flash-lite",
        ].filter(Boolean) as string[],
      ),
    );

    try {
      const client = new GoogleGenAI({ apiKey: geminiApiKey });

      for (const modelId of candidateModels) {
        if (isModelCooledDown(modelId)) {
          continue;
        }

        try {
          const isLite = modelId.toLowerCase().includes("lite");
          const config: Record<string, unknown> = {
            systemInstruction,
            maxOutputTokens: 800,
            temperature: 0.2,
          };

          // Flash/reasoning models use thinkingBudget: 0 to avoid answer cutoff
          if (!isLite) {
            config.thinkingConfig = { thinkingBudget: 0 };
          }

          const generatePromise = client.models.generateContent({
            model: modelId,
            contents: [
              ...safeHistory,
              { role: "user", parts: [{ text: trimmedQuestion }] },
            ],
            config,
          });

          // 7000ms timeout on primary Gemini call
          const response = await withTimeout(
            generatePromise,
            7000,
            `Gemini request timed out on model ${modelId}`,
          );

          const answer =
            response.text?.trim() ??
            response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
            "";

          if (answer) {
            console.info(`[Provider selected]: gemini (model: ${modelId})`);
            return buildResponse(answer, "gemini", false, false, "live_ai");
          }
        } catch (modelErr: unknown) {
          const errMsg =
            modelErr instanceof Error ? modelErr.message : String(modelErr);

          console.warn(`[Gemini model failure] (${modelId}):`, errMsg);

          // Detect HTTP 429 quota exhaustion and trip circuit breaker
          if (errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("429")) {
            markModelExhausted(modelId);
            tripGeminiCircuitBreaker();
            break; // Stop attempting other Gemini models once quota is exhausted
          }
        }
      }
    } catch (clientErr: unknown) {
      console.warn(
        "[Gemini client error]:",
        clientErr instanceof Error ? clientErr.message : String(clientErr),
      );
    }
  }

  // ── PRIORITY 2: GROQ (SECONDARY AUTOMATIC FALLBACK) ────────────────────────
  const groqAnswer = await callGroqProvider(
    trimmedQuestion,
    systemInstruction,
    safeHistory,
  );

  if (groqAnswer) {
    return buildResponse(groqAnswer, "groq", true, false, "live_ai");
  }

  // ── PRIORITY 3: LOCAL PREPARED-ANSWER BANK (LAST RESORT) ───────────────────
  // When live providers are rate-limited, offline, or unavailable:
  // - Matches one of the 10 core interview questions or quick facts deterministically.
  // - If unrecognized, returns an honest transparent notice without fabricating.
  const matchedItem = matchFallbackAnswer(trimmedQuestion);
  if (matchedItem) {
    console.info(`[Provider selected]: local (matched: ${matchedItem.id})`);
    return buildResponse(
      matchedItem.answer,
      "local",
      true,
      true,
      "fallback_bank",
    );
  }

  console.info("[Provider selected]: local (unrecognized offline notice)");
  return buildResponse(
    UNRECOGNIZED_FALLBACK_MESSAGE,
    "local",
    true,
    true,
    "offline_notice",
  );
}
