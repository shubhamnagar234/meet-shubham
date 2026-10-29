export type MessageRole = "user" | "assistant";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
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
