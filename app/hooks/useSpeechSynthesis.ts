"use client";

import { useCallback, useRef, useState, useEffect, useSyncExternalStore } from "react";
import { normalizeForSpeech } from "@/lib/speech/pronunciation";

const emptySubscribe = () => () => {};
const SPEECH_RATE = 1.08; // ~8% boost for crisp, conversational interview cadence

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
  replay: () => void;
  activeEngine: "neural" | "browser" | null;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeEngine, setActiveEngine] = useState<"neural" | "browser" | null>(null);

  const isSupported = useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof window !== "undefined" &&
      (typeof Audio !== "undefined" || "speechSynthesis" in window),
    () => true,
  );

  const lastTextRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearResumeInterval = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
  }, []);

  // Browser Web Speech fallback when server-side Neural TTS is unreachable or fails
  const fallbackWebSpeech = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsSpeaking(false);
        setActiveEngine(null);
        return;
      }

      // Ensure any previous synthesis is stopped
      window.speechSynthesis.cancel();
      clearResumeInterval();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const voices = window.speechSynthesis.getVoices();

      // Preferred voice ranking:
      // 1. Exact match for Microsoft Prabhat / en-IN male natural voices
      // 2. Any en-IN (Indian English) voice
      // 3. High quality natural English voices (Google, Natural, Microsoft)
      // 4. Default English voice
      const preferred =
        voices.find(
          (v) =>
            v.name.toLowerCase().includes("prabhat") ||
            (v.lang.toLowerCase().startsWith("en-in") &&
              !v.name.toLowerCase().includes("heera")),
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en-in")) ||
        voices.find(
          (v) =>
            v.lang.toLowerCase().startsWith("en") &&
            (v.name.includes("Google") ||
              v.name.includes("Microsoft") ||
              v.name.includes("Natural")),
        ) ||
        voices.find((v) => v.lang.toLowerCase().startsWith("en"));

      if (preferred) {
        utterance.voice = preferred;
        utterance.lang = preferred.lang;
      } else {
        utterance.lang = "en-IN";
      }

      utterance.rate = SPEECH_RATE;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        setActiveEngine("browser");

        // Workaround for Chrome/WebKit bug where long speech pauses mid-sentence
        clearResumeInterval();
        resumeIntervalRef.current = setInterval(() => {
          if (typeof window !== "undefined" && window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 4000);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setActiveEngine(null);
        clearResumeInterval();
      };

      utterance.onerror = (event) => {
        // Ignored when explicitly cancelled by stop()
        if (event.error === "canceled" || event.error === "interrupted") {
          return;
        }
        console.warn("Web Speech API playback encountered an error:", event.error);
        setIsSpeaking(false);
        setActiveEngine(null);
        clearResumeInterval();
      };

      window.speechSynthesis.speak(utterance);
    },
    [clearResumeInterval],
  );

  const stop = useCallback(() => {
    // 1. Stop and release HTML5 Audio if playing Neural TTS
    if (audioRef.current) {
      const activeAudio = audioRef.current;
      audioRef.current = null; // Detach ref first to prevent onerror loop
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
        activeAudio.src = "";
      } catch {
        // Ignore abort teardown errors
      }
    }

    // 2. Stop Web Speech synthesis if active
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    clearResumeInterval();
    setIsSpeaking(false);
    setActiveEngine(null);
  }, [clearResumeInterval]);

  const speak = useCallback(
    (text: string) => {
      if (!text) return;
      lastTextRef.current = text;

      // Stop any ongoing speech before starting new speech
      stop();

      const cleaned = normalizeForSpeech(text);
      if (!cleaned) return;

      // Check if Audio API is supported in browser
      if (typeof Audio === "undefined") {
        fallbackWebSpeech(cleaned);
        return;
      }

      try {
        const audioUrl = `/api/tts?text=${encodeURIComponent(cleaned)}`;
        const audio = new Audio(audioUrl);
        audio.playbackRate = SPEECH_RATE;
        audioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
          setActiveEngine("neural");
        };

        audio.onended = () => {
          if (audioRef.current === audio) {
            audioRef.current = null;
            setIsSpeaking(false);
            setActiveEngine(null);
          }
        };

        audio.onerror = () => {
          // If this audio element was already detached by stop(), ignore
          if (audioRef.current !== audio) return;
          audioRef.current = null;
          console.warn("Neural TTS request failed or stream error, falling back to Web Speech API.");
          fallbackWebSpeech(cleaned);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: unknown) => {
            // If stopped or aborted, do not trigger fallback
            if (audioRef.current !== audio) return;
            const errName = (err as { name?: string })?.name;
            if (errName === "AbortError") return;

            audioRef.current = null;
            console.warn(
              "Audio playback was prevented; falling back to Web Speech:",
              err,
            );
            fallbackWebSpeech(cleaned);
          });
        }
      } catch (err: unknown) {
        console.warn("Failed to initialize Neural TTS Audio element:", err);
        fallbackWebSpeech(cleaned);
      }
    },
    [fallbackWebSpeech, stop],
  );

  const replay = useCallback(() => {
    if (lastTextRef.current) {
      speak(lastTextRef.current);
    }
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { isSpeaking, isSupported, speak, stop, replay, activeEngine };
}
