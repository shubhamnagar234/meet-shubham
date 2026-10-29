import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// ── Rate limiting (simple in-memory, resets per cold start) ──────────────────
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
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

import { buildSystemInstruction } from "@/app/data/shubhamProfile";

// ── Handler ───────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 },
    );
  }

  // Parse body
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

  if (question.trim().length > 1000) {
    return NextResponse.json(
      { error: "Question must be 1,000 characters or fewer." },
      { status: 400 },
    );
  }

  // Validate API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not configured.");
    return NextResponse.json(
      { error: "Server configuration error. Please contact the site owner." },
      { status: 500 },
    );
  }

  // Build conversation history (keep last 6 turns, bounded)
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
        const validParts = (turn.parts as unknown[]).filter(
          (p) =>
            p &&
            typeof p === "object" &&
            "text" in p &&
            typeof (p as { text: unknown }).text === "string",
        ) as Array<{ text: string }>;
        if (validParts.length > 0) {
          safeHistory.push({ role: turn.role, parts: validParts });
        }
      }
    }
  }

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
  ].filter(Boolean) as string[];
  const uniqueModels = Array.from(new Set(candidateModels));

  // Call Gemini with model fallback
  try {
    const client = new GoogleGenAI({ apiKey });
    const systemInstruction = buildSystemInstruction();

    let lastError: unknown = null;
    for (const modelId of uniqueModels) {
      try {
        const response = await client.models.generateContent({
          model: modelId,
          contents: [
            ...safeHistory,
            { role: "user", parts: [{ text: question.trim() }] },
          ],
          config: {
            systemInstruction,
            thinkingConfig: {
              thinkingBudget: 0,
            },
            maxOutputTokens: 800,
            temperature: 0.7,
          },
        });

        const answer =
          response.text?.trim() ??
          response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ??
          "";

        if (answer) {
          return NextResponse.json({ answer });
        }
      } catch (modelErr) {
        lastError = modelErr;
        const errMsg =
          modelErr instanceof Error ? modelErr.message : String(modelErr);
        console.warn(`Model ${modelId} failed, attempting next model: ${errMsg}`);
      }
    }

    if (lastError) throw lastError;

    return NextResponse.json(
      { error: "The AI returned an empty response. Please try again." },
      { status: 502 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Gemini API error:", msg);

    if (msg.includes("API_KEY_INVALID") || msg.includes("401")) {
      return NextResponse.json(
        { error: "Authentication failed. The API key may be invalid." },
        { status: 401 },
      );
    }
    if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
      return NextResponse.json(
        { error: "API quota exceeded. Please try again in a moment." },
        { status: 429 },
      );
    }
    if (msg.includes("timeout") || msg.includes("DEADLINE_EXCEEDED")) {
      return NextResponse.json(
        { error: "The request timed out. Please try again." },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
