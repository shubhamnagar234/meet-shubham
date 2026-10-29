"use client";

import { useCallback, useRef, useState, useEffect, useSyncExternalStore } from "react";
import { normalizeForSpeech } from "../utils/speechNormalizer";

const emptySubscribe = () => () => {};

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  stop: () => void;
  replay: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  // Web Speech fallback in case server-side Neural TTS is unreachable
  const fallbackWebSpeech = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsSpeaking(false);
        return;
      }

      window.speechSynthesis.cancel();
      clearResumeInterval();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const voices = window.speechSynthesis.getVoices();
      // Try to match Prabhat / en-IN first, then premium English voices
      const preferred =
        voices.find(
          (v) =>
            v.name.toLowerCase().includes("prabhat") ||
            (v.lang.toLowerCase().startsWith("en-in") &&
              !v.name.toLowerCase().includes("heera")),
        ) ||
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

      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
        // Workaround for Chrome's speechSynthesis bug where audio pauses mid-sentence
        clearResumeInterval();
        resumeIntervalRef.current = setInterval(() => {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }, 4000);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        clearResumeInterval();
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        clearResumeInterval();
      };

      window.speechSynthesis.speak(utterance);
    },
    [clearResumeInterval],
  );

  const stop = useCallback(() => {
    // 1. Stop HTML5 Audio if playing Neural TTS
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current = null;
    }

    // 2. Stop Web Speech synthesis if active
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    clearResumeInterval();
    setIsSpeaking(false);
  }, [clearResumeInterval]);

  const speak = useCallback(
    (text: string) => {
      const cleaned = normalizeForSpeech(text);
      if (!cleaned) return;

      lastTextRef.current = cleaned;
      stop();

      // Check if Audio API is available in browser
      if (typeof Audio === "undefined") {
        fallbackWebSpeech(cleaned);
        return;
      }

      try {
        const audioUrl = `/api/tts?text=${encodeURIComponent(cleaned)}`;
        const audio = new Audio(audioUrl);
        audioRef.current = audio;

        audio.onplay = () => {
          setIsSpeaking(true);
        };

        audio.onended = () => {
          setIsSpeaking(false);
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
        };

        audio.onerror = () => {
          console.warn("Neural TTS request failed, falling back to Web Speech API.");
          if (audioRef.current === audio) {
            audioRef.current = null;
          }
          fallbackWebSpeech(cleaned);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: unknown) => {
            console.warn(
              "Audio playback was prevented or encountered an error; falling back to Web Speech:",
              err,
            );
            if (audioRef.current === audio) {
              audioRef.current = null;
            }
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

  return { isSpeaking, isSupported, speak, stop, replay };
}
