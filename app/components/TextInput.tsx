"use client";

import { FormEvent, KeyboardEvent, useRef } from "react";
import { Send } from "lucide-react";
import { AppState } from "../types";
import { MicButton } from "./MicButton";
import { Waveform } from "./Waveform";

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  disabled?: boolean;
  placeholder?: string;
  appState?: AppState;
  isListening?: boolean;
  isSpeaking?: boolean;
  interimTranscript?: string;
  onMicClick?: () => void;
  isSupported?: boolean;
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Ask Shubham anything, or tap mic to speak…",
  appState = "idle",
  isListening = false,
  isSpeaking = false,
  interimTranscript = "",
  onMicClick = () => {},
  isSupported = true,
}: TextInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSubmit(trimmed);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    const ta = inputRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
    }
  };

  const charCount = value.length;
  const isOverLimit = charCount > 1000;

  return (
    <div className="w-full flex flex-col">
      {/* Live Voice Status Indicator Pill */}
      {isListening && (
        <div
          className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 rounded-xl bg-orange-950/40 border border-orange-500/30 text-xs animate-fade-in mb-2 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping shrink-0" />
            <span className="font-semibold text-orange-400 shrink-0">Listening…</span>
            <span className="italic text-orange-200/90 truncate">
              {interimTranscript ? `“${interimTranscript}”` : "Speak now, I'm listening..."}
            </span>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Waveform isActive={true} color="#f97316" />
            <span className="hidden sm:inline text-[10px] text-orange-400/80 uppercase font-mono">
              Tap mic to stop
            </span>
          </div>
        </div>
      )}

      {isSpeaking && (
        <div
          className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs animate-fade-in mb-2 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-semibold text-emerald-400 shrink-0">Speaking answer…</span>
            <span className="text-emerald-200/80 text-[11px] truncate">
              Tap mic or stop to mute
            </span>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <Waveform isActive={true} color="#34d399" />
          </div>
        </div>
      )}

      {/* Main Unified Input Dock */}
      <form
        onSubmit={handleSubmit}
        className="flex items-end gap-2"
        aria-label="Ask your question"
      >
        <div className="flex-1 relative">
          <label htmlFor="question-input" className="sr-only">
            Your question
          </label>
          <textarea
            ref={inputRef}
            id="question-input"
            rows={1}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || isListening}
            placeholder={
              isListening
                ? "Listening to your voice… speak now"
                : placeholder
            }
            maxLength={1100}
            aria-describedby="char-count"
            className={`
              w-full resize-none px-4 py-3 pr-12
              rounded-xl border text-sm text-slate-200
              bg-slate-800/80 placeholder-slate-400
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-blue-500/60
              disabled:opacity-60 disabled:cursor-not-allowed
              ${
                isOverLimit
                  ? "border-red-500 focus:ring-red-500/40"
                  : isListening
                    ? "border-orange-500/60 ring-2 ring-orange-500/30"
                    : "border-slate-700/80 hover:border-slate-600"
              }
              leading-relaxed
            `}
            style={{ minHeight: 48, maxHeight: 120 }}
          />
          {/* Char count */}
          <span
            id="char-count"
            className={`absolute bottom-2 right-3 text-[10px] ${
              isOverLimit ? "text-red-400" : "text-slate-600"
            }`}
            aria-live="polite"
          >
            {charCount}/1000
          </span>
        </div>

        {/* Unified Action Dock: Mic Button + Send Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <MicButton
            state={appState}
            isSupported={isSupported}
            onClick={onMicClick}
            compact={true}
          />

          <button
            type="submit"
            id="send-button"
            aria-label="Send question"
            disabled={disabled || !value.trim() || isOverLimit}
            className="
              shrink-0 w-12 h-12 rounded-xl
              bg-blue-600 hover:bg-blue-500 active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 disabled:active:scale-100
              flex items-center justify-center
              transition-all duration-200 shadow-md shadow-blue-900/30
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
            "
          >
            <Send
              size={22}
              className="text-white"
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>
        </div>
      </form>

      {/* Browser voice support warning */}
      {!isSupported && (
        <p
          className="mt-1.5 text-[11px] text-amber-400/90 text-center"
          role="alert"
          aria-live="polite"
        >
          🎤 Voice input isn&apos;t supported in this browser. You can type your questions above.
        </p>
      )}
    </div>
  );
}
