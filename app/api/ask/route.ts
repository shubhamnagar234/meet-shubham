import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildSystemInstruction } from "@/app/data/shubhamProfile";
import {
  matchFallbackAnswer,
  UNRECOGNIZED_FALLBACK_MESSAGE,
} from "@/app/data/fallbackAnswers";

// ── Rate limiting (in-memory sliding window, resets per cold start) ──────────
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

// ── Model Quota Cooldown Tracker (Prevents repeated 429 calls) ───────────────
// Models that return 429 RESOURCE_EXHAUSTED are put in cooldown for 15 minutes.
const MODEL_COOLDOWN_MS = 15 * 60_000;
const modelCooldowns = new Map<string, number>();

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
  modelCooldowns.set(modelId, Date.now() + MODEL_COOLDOWN_MS);
}

// ── Optional Second Provider Fallback (e.g. OpenAI / Groq) ───────────────────
// Non-breaking: Only invoked if SECOND_PROVIDER_API_KEY or OPENAI_API_KEY is set.
async function callSecondProviderIfConfigured(
  question: string,
  systemInstruction: string,
  history: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>,
): Promise<string | null> {
  const apiKey =
    process.env.SECOND_PROVIDER_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const endpoint =
    process.env.SECOND_PROVIDER_ENDPOINT ||
    "https://api.openai.com/v1/chat/completions";
  const model =
    process.env.SECOND_PROVIDER_MODEL ||
    (process.env.OPENAI_API_KEY ? "gpt-4o-mini" : "default");

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.map((turn) => ({
      role: turn.role === "model" ? "assistant" : "user",
      content: turn.parts.map((p) => p.text).join(" "),
    })),
    { role: "user", content: question },
  ];

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 400,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
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
  const apiKey = process.env.GEMINI_API_KEY;

  // 4. Try Google Gemini (if API key is present and models are not exhausted)
  if (apiKey) {
    const candidateModels = Array.from(
      new Set(
        [
          process.env.GEMINI_MODEL,
          "gemini-3.5-flash",
          "gemini-3-flash-preview",
          "gemini-3.5-flash-lite",
          "gemini-2.5-flash",
        ].filter(Boolean) as string[],
      ),
    );

    try {
      const client = new GoogleGenAI({ apiKey });

      for (const modelId of candidateModels) {
        // Skip models currently in 429 cooldown
        if (isModelCooledDown(modelId)) {
          continue;
        }

        try {
          const isLite = modelId.toLowerCase().includes("lite");
          const config: Record<string, unknown> = {
            systemInstruction,
            maxOutputTokens: 800,
            temperature: 0.7,
          };

          // Reasoning/flash models use thinkingBudget: 0 to prevent answer truncation
          // Lite models reject thinkingConfig with 400 INVALID_ARGUMENT
          if (!isLite) {
            config.thinkingConfig = { thinkingBudget: 0 };
          }

          const response = await client.models.generateContent({
            model: modelId,
            contents: [
              ...safeHistory,
              { role: "user", parts: [{ text: trimmedQuestion }] },
            ],
            config,
          });

          const answer =
            response.text?.trim() ??
            response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
            "";

          if (answer) {
            return NextResponse.json({
              answer,
              isFallback: false,
              source: "live_ai",
            });
          }
        } catch (modelErr) {
          const errMsg =
            modelErr instanceof Error ? modelErr.message : String(modelErr);

          // Detect HTTP 429 quota exhaustion and put model in cooldown
          if (
            errMsg.includes("RESOURCE_EXHAUSTED") ||
            errMsg.includes("429")
          ) {
            markModelExhausted(modelId);
            console.warn(
              `Model ${modelId} hit rate/quota limit. Marked in cooldown.`,
            );
          } else {
            console.warn(`Model ${modelId} failed: ${errMsg}`);
          }
        }
      }
    } catch (clientErr) {
      console.warn("Gemini client initialization error:", clientErr);
    }
  }

  // 5. Try Optional Second Provider (if configured, e.g. OpenAI)
  const secondProviderAnswer = await callSecondProviderIfConfigured(
    trimmedQuestion,
    systemInstruction,
    safeHistory,
  );
  if (secondProviderAnswer) {
    return NextResponse.json({
      answer: secondProviderAnswer,
      isFallback: false,
      source: "live_ai",
    });
  }

  // 6. Reliable Local Fallback Answer Bank
  // When live AI is rate-limited or unavailable:
  // - If the question matches one of the 10 core questions, return the prepared verified answer.
  // - If unrecognized, return a helpful notice recommending the 10 prepared questions.
  const matchedItem = matchFallbackAnswer(trimmedQuestion);
  if (matchedItem) {
    return NextResponse.json({
      answer: matchedItem.answer,
      isFallback: true,
      source: "fallback_bank",
    });
  }

  return NextResponse.json({
    answer: UNRECOGNIZED_FALLBACK_MESSAGE,
    isFallback: true,
    source: "offline_notice",
  });
}
