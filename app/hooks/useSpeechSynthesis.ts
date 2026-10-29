"use client";

import {
  useCallback,
  useRef,
  useState,
  useEffect,
  useSyncExternalStore,
} from "react";
import { normalizeForSpeech } from "@/lib/speech/pronunciation";

const emptySubscribe = () => () => {};
const SPEECH_RATE = 1.08; // ~8% boost for crisp, conversational interview cadence

/**
 * AudioSessionManager is an imperative manager outside the React lifecycle.
 * Managing HTMLAudioElement and AudioContext here satisfies React Compiler's
 * immutability rules while permanently preserving Safari and Chrome autoplay unlocks.
 */
class AudioSessionManager {
  private audio: HTMLAudioElement | null = null;
  private audioCtx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;

  getAudio(): HTMLAudioElement | null {
    if (typeof window === "undefined" || typeof Audio === "undefined")
      return null;
    if (!this.audio) {
      this.audio = new Audio();
    }
    return this.audio;
  }

  getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.audioCtx) {
      this.audioCtx = new AudioCtx();
    }
    return this.audioCtx;
  }

  unlock(): void {
    if (typeof window === "undefined") return;

    // 1. Prime HTML5 Audio element
    const audio = this.getAudio();
    if (audio) {
      try {
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

    // 2. Prime Web Audio API AudioContext for Safari / iOS WebKit
    const ctx = this.getAudioContext();
    if (ctx) {
      try {
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
      } catch {}
    }

    // 3. Prime Web Speech API for Safari
    if ("speechSynthesis" in window) {
      try {
        const silent = new SpeechSynthesisUtterance("");
        silent.volume = 0;
        window.speechSynthesis.speak(silent);
      } catch {}
    }
  }

  stop(): void {
    if (this.audio) {
      try {
        this.audio.pause();
        this.audio.currentTime = 0;
      } catch {}
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  setWebAudioSource(node: AudioBufferSourceNode | null): void {
    if (this.sourceNode && this.sourceNode !== node) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {}
    }
    this.sourceNode = node;
  }
}

const audioSession = new AudioSessionManager();

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
  const [activeEngine, setActiveEngine] = useState<"neural" | "browser" | null>(
    null,
  );

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

  const stop = useCallback(() => {
    audioSession.stop();
    clearResumeInterval();
    setIsSpeaking(false);
    setActiveEngine(null);
  }, [clearResumeInterval]);

  const unlockAudio = useCallback(() => {
    audioSession.unlock();
  }, []);

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
        console.warn(
          "Web Speech API playback encountered an error:",
          event.error,
        );
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
        const ctx = audioSession.getAudioContext();
        if (!ctx) {
          fallbackWebSpeech(text, onStartTrigger);
          return;
        }

        if (ctx.state === "suspended") {
          await ctx.resume();
        }

        const res = await fetch(`/api/tts?text=${encodeURIComponent(text)}`);
        if (!res.ok) {
          throw new Error(`TTS API status ${res.status}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

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
        audioSession.setWebAudioSource(source);
      } catch (e) {
        console.warn(
          "Web Audio API neural playback failed, falling back to Web Speech:",
          e,
        );
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
      audioSession.stop();
      clearResumeInterval();
      setIsSpeaking(false);
      setActiveEngine(null);

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

      // Safety timeout: if audio takes longer than 1500ms to fire, reveal text and waveform so the user is never stalled
      const timeoutId = setTimeout(() => {
        triggerStart();
      }, 1500);

      const cancelTimeout = () => {
        clearTimeout(timeoutId);
      };

      const audio = audioSession.getAudio();
      if (!audio) {
        cancelTimeout();
        fallbackWebSpeech(cleaned, triggerStart);
        return;
      }

      try {
        const audioUrl = `/api/tts?text=${encodeURIComponent(cleaned)}`;

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
          console.warn(
            "HTML5 audio playback error; attempting Web Audio API decoding...",
          );
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
    [clearResumeInterval, fallbackWebSpeech, playWithWebAudio],
  );

  const replay = useCallback(() => {
    if (lastTextRef.current) {
      speak(lastTextRef.current);
    }
  }, [speak]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioSession.stop();
    };
  }, []);

  return {
    isSpeaking,
    isSupported,
    speak,
    stop,
    replay,
    activeEngine,
    unlockAudio,
  };
}
