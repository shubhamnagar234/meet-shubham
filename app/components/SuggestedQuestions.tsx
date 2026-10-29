"use client";

import { MessageSquare } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  { id: "q1", text: "Tell me your life story.", emoji: "📖" },
  { id: "q2", text: "What is your number-one superpower?", emoji: "⚡" },
  { id: "q3", text: "What are your top three growth areas?", emoji: "🌱" },
  {
    id: "q4",
    text: "What misconception might coworkers have about you?",
    emoji: "🤔",
  },
  {
    id: "q5",
    text: "How do you push beyond your comfort zone?",
    emoji: "🚀",
  },
  {
    id: "q6",
    text: "Tell me about a technical project you are proud of.",
    emoji: "🏆",
  },
  {
    id: "q7",
    text: "How do you use AI coding agents in your workflow?",
    emoji: "🤖",
  },
  {
    id: "q8",
    text: "How do you make sure AI-generated code is correct?",
    emoji: "✅",
  },
  {
    id: "q9",
    text: "Describe a difficult technical problem you solved.",
    emoji: "🔧",
  },
  {
    id: "q10",
    text: "Why do you want to join an AI Agent Team?",
    emoji: "🎯",
  },
];

interface SuggestedQuestionsProps {
  onSelect: (question: string) => void;
  disabled?: boolean;
}

export function SuggestedQuestions({
  onSelect,
  disabled = false,
}: SuggestedQuestionsProps) {
  return (
    <section aria-label="Suggested questions">
      <div className="flex items-center gap-1.5 mb-1.5">
        <MessageSquare size={13} className="text-blue-400" aria-hidden="true" />
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
          Try asking
        </h2>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-22 overflow-y-auto custom-scrollbar pr-1">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q.id}
            id={q.id}
            onClick={() => onSelect(q.text)}
            disabled={disabled}
            className="
              suggestion-chip
              flex items-center gap-1.5 px-2.5 py-1
              text-[11px] text-slate-300
              rounded-full border border-slate-700
              bg-slate-800/60 
              hover:border-blue-500 hover:text-white hover:bg-blue-950/50
              disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none
              transition-all duration-200 cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
            "
            aria-label={`Ask: ${q.text}`}
          >
            <span aria-hidden="true">{q.emoji}</span>
            <span>{q.text}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
