"use client";

import { useCallback, useRef, useState, useEffect, useSyncExternalStore } from "react";
import { normalizeForSpeech } from "@/lib/speech/pronunciation";

const emptySubscribe = () => () => {};
const SPEECH_RATE = 1.08; // ~8% boost for crisp, conversational interview cadence

export interface UseSpeechSynthesisReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string, onStart?: () => void) => void;
  stop: () => void;
  replay: () => void;
  activeEngine: "neural" | "browser" | null;
  unlockAudio: () => void;
}

export function useSpeechSynthesis(): UseSpeechSynthesisReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeEngine, setActiveEngine] = useState<"neural" | "browser" | null>(null);

  const isSupported = useSyncExternalStore(
    emptySubscribe,
    () =>
      typeof window !== "undefined" &&
      (typeof Audio !== "undefined" ||
        "AudioContext" in window ||
        "webkitAudioContext" in window ||
        "speechSynthesis" in window),
    () => true,
  );

  const lastTextRef = useRef<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const webAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const resumeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onStartCallbackRef = useRef<(() => void) | null>(null);

  // Pre-fetch speech voices on mount for Safari / iOS WebKit where getVoices() is initially empty
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const loadVoices = () => {
      try {
        window.speechSynthesis.getVoices();
      } catch {}
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const clearResumeInterval = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
  }, []);

  // Synchronous audio priming to satisfy Safari / iOS WebKit & Chrome strict autoplay policies
  // Calling this during any user interaction (click, touch, keydown) permanently blesses the audio session
  const unlockAudio = useCallback(() => {
    if (typeof window === "undefined") return;

    // 1. Prime HTML5 Audio element
    if (typeof Audio !== "undefined") {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        const audio = audioRef.current;
        if (!audio.src || audio.src.startsWith("data:") || audio.ended) {
          audio.src =
            "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
          const p = audio.play();
          if (p !== undefined) {
            p.then(() => {
              audio.pause();
              audio.currentTime = 0;
            }).catch(() => {});
          }
        }
      } catch {}
    }

    // 2. Prime Web Audio API AudioContext (the most reliable audio unlock mechanism for Safari & iOS)
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        // Play 1-sample silent sound through Web Audio to permanently activate the audio pipeline
        const buffer = audioCtxRef.current.createBuffer(1, 1, 22050);
        const source = audioCtxRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioCtxRef.current.destination);
        source.start(0);
      }
    } catch {}

    // 3. Prime Web Speech API for Safari/iOS
    if ("speechSynthesis" in window) {
      try {
        const silent = new SpeechSynthesisUtterance("");
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
      } catch {}
    }
  }, []);

  const stop = useCallback(() => {
    // 1. Stop HTML5 Audio if playing
    if (audioRef.current) {
      const activeAudio = audioRef.current;
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch {}
    }

    // 2. Stop Web Audio API source node if active
    if (webAudioSourceRef.current) {
      try {
        webAudioSourceRef.current.stop();
        webAudioSourceRef.current.disconnect();
      } catch {}
      webAudioSourceRef.current = null;
    }

    // 3. Stop Web Speech synthesis if active
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    clearResumeInterval();
    setIsSpeaking(false);
    setActiveEngine(null);
  }, [clearResumeInterval]);

  // Browser Web Speech fallback when server-side Neural TTS is unreachable or fails
  const fallbackWebSpeech = useCallback(
    (text: string, onStartTrigger?: () => void) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        setIsSpeaking(false);
        setActiveEngine(null);
        onStartTrigger?.();
        return;
      }

      window.speechSynthesis.cancel();
      clearResumeInterval();

      const utterance = new SpeechSynthesisUtterance(text);
      utteranceRef.current = utterance;

      const voices = window.speechSynthesis.getVoices();

      // Preferred voice ranking:
      // 1. Exact match for Microsoft Prabhat / en-IN male natural voices
      // 2. Any en-IN (Indian English) voice (Rishi on Safari/macOS/iOS)
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
        onStartTrigger?.();

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
        if (event.error === "canceled" || event.error === "interrupted") {
          return;
        }
        console.warn("Web Speech API playback encountered an error:", event.error);
        setIsSpeaking(false);
        setActiveEngine(null);
        clearResumeInterval();
      };

      // Workaround for Safari: if paused, resume
      if (window.speechSynthesis.paused) {
        try {
          window.speechSynthesis.resume();
        } catch {}
      }

      window.speechSynthesis.speak(utterance);
    },
    [clearResumeInterval],
  );

  // Web Audio API playback: reliable on Safari / iOS WebKit if HTML5 Audio encounters playback restrictions
  const playWithWebAudio = useCallback(
    async (text: string, onStartTrigger: () => void) => {
      try {
        const AudioCtx =
          typeof window !== "undefined" &&
          (window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
        if (!AudioCtx) {
          fallbackWebSpeech(text, onStartTrigger);
          return;
        }

        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
        if (!res.ok) {
          throw new Error(`TTS API status ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

        if (webAudioSourceRef.current) {
          try {
            webAudioSourceRef.current.stop();
          } catch {}
        }

        const source = ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = SPEECH_RATE;
        source.connect(ctx.destination);

        source.onended = () => {
          setIsSpeaking(false);
          setActiveEngine(null);
        };

        onStartTrigger();
        setIsSpeaking(true);
        setActiveEngine("neural");
        source.start(0);
        webAudioSourceRef.current = source;
      } catch (e) {
        console.warn("Web Audio API neural playback failed, falling back to Web Speech:", e);
        fallbackWebSpeech(text, onStartTrigger);
      }
    },
    [fallbackWebSpeech],
  );

  const speak = useCallback(
    (text: string, onStart?: () => void) => {
      if (!text) return;
      lastTextRef.current = text;
      onStartCallbackRef.current = onStart || null;

      // Stop any ongoing speech before starting new speech
      stop();

      const cleaned = normalizeForSpeech(text);
      if (!cleaned) return;

      let hasTriggeredStart = false;
      const triggerStart = () => {
        if (!hasTriggeredStart) {
          hasTriggeredStart = true;
          setIsSpeaking(true);
          if (onStartCallbackRef.current) {
            onStartCallbackRef.current();
            onStartCallbackRef.current = null;
          }
        }
      };

      // Safety timeout: if audio takes longer than 350ms to fire, reveal text and waveform so the user is never stalled
      const timeoutId = setTimeout(() => {
        triggerStart();
      }, 350);

      const cancelTimeout = () => {
        clearTimeout(timeoutId);
      };

      // Check if Audio API is supported
      if (typeof Audio === "undefined") {
        cancelTimeout();
        fallbackWebSpeech(cleaned, triggerStart);
        return;
      }

      try {
        const audioUrl = `/api/tts?text=${encodeURIComponent(cleaned)}`;

        // Reuse primed audio element to maintain Safari / iOS WebKit unlock
        let audio = audioRef.current;
        if (!audio) {
          audio = new Audio();
          audioRef.current = audio;
        }

        audio.src = audioUrl;
        audio.playbackRate = SPEECH_RATE;
        audio.currentTime = 0;

        audio.onplay = () => {
          cancelTimeout();
          triggerStart();
          setActiveEngine("neural");
        };

        audio.onended = () => {
          setIsSpeaking(false);
          setActiveEngine(null);
        };

        audio.onerror = () => {
          cancelTimeout();
          console.warn("HTML5 audio playback error; attempting Web Audio API decoding...");
          playWithWebAudio(cleaned, triggerStart);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch((err: unknown) => {
            const errName = (err as { name?: string })?.name;
            if (errName === "AbortError") return;

            cancelTimeout();
            console.warn(
              "Audio.play() prevented by browser policy; trying Web Audio API decoding:",
              err,
            );
            playWithWebAudio(cleaned, triggerStart);
          });
        }
      } catch (err: unknown) {
        cancelTimeout();
        console.warn("Failed to initialize Neural TTS Audio element:", err);
        playWithWebAudio(cleaned, triggerStart);
      }
    },
    [fallbackWebSpeech, playWithWebAudio, stop],
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

  return { isSpeaking, isSupported, speak, stop, replay, activeEngine, unlockAudio };
}
