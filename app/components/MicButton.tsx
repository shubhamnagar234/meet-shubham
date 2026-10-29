"use client";

import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { AppState } from "../types";
import { Waveform } from "./Waveform";

interface MicButtonProps {
  state: AppState;
  isSupported: boolean;
  onClick: () => void;
}

const stateConfig = {
  idle: {
    label: "Start listening",
    icon: Mic,
    bg: "bg-blue-600 hover:bg-blue-500",
    ring: "ring-blue-600/30",
    pulse: "mic-idle",
    waveColor: "#60a5fa",
    text: "Click to speak",
  },
  listening: {
    label: "Stop listening",
    icon: Square,
    bg: "bg-orange-500 hover:bg-orange-400",
    ring: "ring-orange-500/40",
    pulse: "mic-listening",
    waveColor: "#f97316",
    text: "Listening…",
  },
  processing: {
    label: "Processing",
    icon: Loader2,
    bg: "bg-violet-600",
    ring: "ring-violet-600/30",
    pulse: "",
    waveColor: "#a78bfa",
    text: "Processing…",
  },
  speaking: {
    label: "Speaking",
    icon: MicOff,
    bg: "bg-emerald-600 hover:bg-emerald-500",
    ring: "ring-emerald-600/30",
    pulse: "mic-speaking",
    waveColor: "#34d399",
    text: "Speaking…",
  },
  error: {
    label: "Try again",
    icon: Mic,
    bg: "bg-red-600 hover:bg-red-500",
    ring: "ring-red-600/30",
    pulse: "",
    waveColor: "#ef4444",
    text: "Error — click to retry",
  },
};

export function MicButton({ state, isSupported, onClick }: MicButtonProps) {
  const config = stateConfig[state];
  const Icon = config.icon;
  const isDisabled = state === "processing";

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Status text */}
      <p
        className="text-sm font-medium tracking-wide uppercase"
        style={{
          color:
            state === "listening"
              ? "#f97316"
              : state === "speaking"
                ? "#34d399"
                : state === "error"
                  ? "#ef4444"
                  : state === "processing"
                    ? "#a78bfa"
                    : "#64748b",
        }}
      >
        {config.text}
      </p>

      {/* Waveform */}
      <Waveform
        isActive={state === "listening" || state === "speaking"}
        color={config.waveColor}
      />

      {/* Mic button */}
      <button
        id="mic-button"
        aria-label={config.label}
        aria-pressed={state === "listening"}
        disabled={isDisabled || !isSupported}
        onClick={onClick}
        className={`
          relative w-20 h-20 rounded-full flex items-center justify-center
          transition-all duration-300 cursor-pointer
          ${config.bg} ${config.pulse}
          ring-4 ${config.ring}
          disabled:opacity-50 disabled:cursor-not-allowed disabled:animation-none
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400
        `}
      >
        <Icon
          size={32}
          className={`text-white ${state === "processing" ? "animate-spin" : ""}`}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>

      {/* Browser support warning */}
      {!isSupported && (
        <p
          className="text-xs text-amber-400 text-center max-w-xs"
          role="alert"
          aria-live="polite"
        >
          🎤 Voice input isn&apos;t available in this browser. Use the text
          input below. (Try Chrome or Edge for full voice support.)
        </p>
      )}
    </div>
  );
}
