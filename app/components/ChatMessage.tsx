"use client";

import { User, Bot, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { Message } from "../types";

interface ChatMessageProps {
  message: Message;
  isSpeaking?: boolean;
  isLastAssistant?: boolean;
  onSpeak?: () => void;
  onStop?: () => void;
  onReplay?: () => void;
}

export function ChatMessage({
  message,
  isSpeaking = false,
  isLastAssistant = false,
  onSpeak,
  onStop,
  onReplay,
}: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 animate-fade-in ${isUser ? "justify-end" : "justify-start"}`}
    >
      {/* Avatar — assistant left */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-violet-600 ring-1 ring-blue-500/30"
          aria-hidden="true"
        >
          <Bot size={16} className="text-white" strokeWidth={1.8} />
        </div>
      )}

      <div
        className={`flex flex-col gap-1 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}
      >
        <div
          className={`
            relative px-4 py-3 rounded-2xl text-sm leading-relaxed
            ${
              isUser
                ? "bg-blue-600 text-white rounded-tr-sm"
                : "glass-card text-slate-200 rounded-tl-sm border-slate-700/50"
            }
          `}
        >
          {message.content}

          {/* Speaking indicator overlay */}
          {!isUser && isLastAssistant && isSpeaking && (
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"
              aria-label="Speaking"
            />
          )}
        </div>

        {/* Timestamp */}
        <time
          className="text-[10px] text-slate-500"
          dateTime={message.timestamp.toISOString()}
        >
          {message.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>

        {/* Playback controls for last assistant message */}
        {!isUser && isLastAssistant && (
          <div
            className="flex items-center gap-1 mt-0.5"
            role="group"
            aria-label="Playback controls"
          >
            {isSpeaking ? (
              <button
                onClick={onStop}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-400"
                aria-label="Stop speaking"
                id="stop-speaking-btn"
              >
                <VolumeX size={12} />
                Stop
              </button>
            ) : (
              <>
                <button
                  onClick={onSpeak}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-400"
                  aria-label="Speak this answer"
                  id="speak-answer-btn"
                >
                  <Volume2 size={12} />
                  Speak
                </button>
                <button
                  onClick={onReplay}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-slate-300 hover:bg-slate-700/30 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-400"
                  aria-label="Replay last answer"
                  id="replay-answer-btn"
                >
                  <RotateCcw size={12} />
                  Replay
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Avatar — user right */}
      {isUser && (
        <div
          className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-slate-600 to-slate-700 ring-1 ring-slate-500/30"
          aria-hidden="true"
        >
          <User size={16} className="text-slate-200" strokeWidth={1.8} />
        </div>
      )}
    </div>
  );
}
