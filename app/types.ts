export type MessageRole = "user" | "assistant";

export type MessageSource = "live_ai" | "fallback_bank" | "offline_notice";

export type MessageProvider = "gemini" | "groq" | "local";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isFallback?: boolean;
  source?: MessageSource;
  provider?: MessageProvider;
  fallbackUsed?: boolean;
}

export type AppState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

export interface ConversationTurn {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}
