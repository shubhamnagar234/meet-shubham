"use client";

import { Mic, MicOff, Square, Loader2 } from "lucide-react";
import { AppState } from "../types";
import { Waveform } from "./Waveform";

interface MicButtonProps {
  state: AppState;
  isSupported: boolean;
  onClick: () => void;
  showStatus?: boolean;
  compact?: boolean;
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

export function MicButton({
  state,
  isSupported,
  onClick,
  showStatus = true,
  compact = false,
}: MicButtonProps) {
  const config = stateConfig[state];
  const Icon = config.icon;
  const isDisabled = state === "processing";

  if (compact) {
    return (
      <button
        id="mic-button"
        type="button"
        aria-label={config.label}
        aria-pressed={state === "listening"}
        disabled={isDisabled || !isSupported}
        onClick={onClick}
        title={!isSupported ? "Voice input isn't supported in this browser" : config.label}
        className={`
          relative w-12 h-12 rounded-xl flex items-center justify-center
          transition-all duration-200 cursor-pointer shadow-md shrink-0
          ${config.bg} ${config.pulse}
          ring-2 ${config.ring}
          disabled:opacity-40 disabled:cursor-not-allowed disabled:animation-none
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
        `}
      >
        <Icon
          size={23}
          className={`text-white ${state === "processing" ? "animate-spin" : ""}`}
          strokeWidth={2}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Status text & waveform (optional when embedded in voice bar) */}
      {showStatus && (
        <div className="flex items-center gap-2.5 min-h-5">
          <p
            className="text-xs font-semibold tracking-wider uppercase"
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

          <Waveform
            isActive={state === "listening" || state === "speaking"}
            color={config.waveColor}
          />
        </div>
      )}

      {/* Mic button */}
      <button
        id="mic-button"
        aria-label={config.label}
        aria-pressed={state === "listening"}
        disabled={isDisabled || !isSupported}
        onClick={onClick}
        className={`
          relative w-12 h-12 sm:w-14 sm:h-14 md:w-15 md:h-15 rounded-full flex items-center justify-center
          transition-all duration-300 cursor-pointer shadow-lg shrink-0
          ${config.bg} ${config.pulse}
          ring-3 sm:ring-4 ${config.ring}
          disabled:opacity-50 disabled:cursor-not-allowed disabled:animation-none
          focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-400
        `}
      >
        <Icon
          size={22}
          className={`text-white sm:scale-110 ${state === "processing" ? "animate-spin" : ""}`}
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
