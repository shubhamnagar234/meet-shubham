"use client";

import { FormEvent, KeyboardEvent, useRef } from "react";
import { Send } from "lucide-react";

interface TextInputProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (q: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TextInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  placeholder = "Type your question here…",
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
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-2"
      aria-label="Type your question"
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
          disabled={disabled}
          placeholder={placeholder}
          maxLength={1100}
          aria-describedby="char-count"
          className={`
            w-full resize-none px-4 py-3 pr-10
            rounded-xl border text-sm text-slate-200
            bg-slate-800/70 placeholder-slate-500
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-blue-500/60
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isOverLimit ? "border-red-500 focus:ring-red-500/40" : "border-slate-700"}
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

      <button
        type="submit"
        id="send-button"
        aria-label="Send question"
        disabled={disabled || !value.trim() || isOverLimit}
        className="
          shrink-0 w-11 h-11 rounded-xl
          bg-blue-600 hover:bg-blue-500
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600
          flex items-center justify-center
          transition-all duration-200
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        "
      >
        <Send
          size={18}
          className="text-white"
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>
    </form>
  );
}
