"use client";

import { useCallback, useRef, useState, useEffect } from "react";

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
  replay: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastTextRef = useRef<string>("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported =
    typeof window !== "undefined" && "speechSynthesis" in window;

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (!isSupported) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      setIsSpeaking(false);

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;
      lastTextRef.current = text;

      // Choose a pleasant voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Google") ||
            v.name.includes("Microsoft") ||
            v.name.includes("Alex") ||
            v.name.includes("Samantha")),
      );
      if (preferred) utterance.voice = preferred;

      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US";

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      // Workaround for Chrome's speechSynthesis bug where it stops mid-sentence
      let resumeInterval: ReturnType<typeof setInterval> | null = null;
      utterance.onstart = () => {
        setIsSpeaking(true);
        resumeInterval = setInterval(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 5000);
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        if (resumeInterval) clearInterval(resumeInterval);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        if (resumeInterval) clearInterval(resumeInterval);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSupported],
  );

  const replay = useCallback(() => {
    if (lastTextRef.current) {
      speak(lastTextRef.current);
    }
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return { isSpeaking, isSupported, speak, stop, replay };
}
