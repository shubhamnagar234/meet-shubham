"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Code2,
  Users,
  Globe,
  BookOpen,
  AlertCircle,
  X,
} from "lucide-react";
import { Message, AppState, ConversationTurn } from "../types";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { MicButton } from "../components/MicButton";
import { ChatMessage } from "../components/ChatMessage";
import { SuggestedQuestions } from "../components/SuggestedQuestions";
import { TextInput } from "../components/TextInput";

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm an AI assistant representing Shubham Nagar. Ask me anything about his engineering background, projects, or experience — via your microphone or the text box below.",
  timestamp: new Date(),
};

export function VoiceAssistant() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [appState, setAppState] = useState<AppState>("idle");
  const [inputText, setInputText] = useState("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [interimText, setInterimText] = useState("");
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null
  );

  // Conversation history for Gemini context
  const historyRef = useRef<ConversationTurn[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastAssistantMessageRef = useRef<string | null>(null);

  const { isSpeaking, speak, stop, replay } = useSpeechSynthesis();

  const handleSpeechResult = useCallback((transcript: string) => {
    setInterimText("");
    submitQuestion(transcript);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSpeechError = useCallback((error: string) => {
    setAppState("error");
    setErrorBanner(error);
    setTimeout(() => setAppState("idle"), 2000);
  }, []);

  const handleSpeechEnd = useCallback(() => {
    setInterimText("");
  }, []);

  const { isSupported, isListening, interimTranscript, startListening, stopListening } =
    useSpeechRecognition({
      onResult: handleSpeechResult,
      onError: handleSpeechError,
      onEnd: handleSpeechEnd,
    });

  // Keep interim transcript synced
  useEffect(() => {
    setInterimText(interimTranscript);
  }, [interimTranscript]);

  // Sync appState with listening
  useEffect(() => {
    if (isListening) {
      setAppState("listening");
    } else if (appState === "listening") {
      setAppState("processing");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isListening]);

  // Sync appState with speaking
  useEffect(() => {
    if (isSpeaking) {
      setAppState("speaking");
    } else if (appState === "speaking") {
      setAppState("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpeaking]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const submitQuestion = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || appState === "processing") return;

      // Clear input & error
      setInputText("");
      setErrorBanner(null);

      // Add user message
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content: trimmed,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setAppState("processing");

      // Stop any ongoing speech
      stop();

      try {
        const response = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: trimmed,
            history: historyRef.current,
          }),
        });

        const data = (await response.json()) as { answer?: string; error?: string };

        if (!response.ok || !data.answer) {
          throw new Error(data.error ?? "Unexpected error from server.");
        }

        const assistantMsg: Message = {
          id: generateId(),
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
        lastAssistantMessageRef.current = assistantMsg.id;
        setSpeakingMessageId(assistantMsg.id);

        // Update history for context
        historyRef.current = [
          ...historyRef.current,
          { role: "user" as const, parts: [{ text: trimmed }] },
          { role: "model" as const, parts: [{ text: data.answer }] },
        ].slice(-12); // keep last 6 turns (12 entries)

        // Speak the answer
        speak(data.answer);
        setAppState("speaking");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
        setErrorBanner(msg);
        setAppState("error");
        setTimeout(() => setAppState("idle"), 3000);
      }
    },
    [appState, speak, stop]
  );

  const handleMicClick = useCallback(() => {
    if (appState === "listening") {
      stopListening();
      setAppState("idle");
    } else if (appState === "speaking") {
      stop();
      setAppState("idle");
    } else if (appState === "idle" || appState === "error") {
      startListening();
    }
  }, [appState, startListening, stopListening, stop]);

  const handleTextSubmit = useCallback(
    (q: string) => {
      submitQuestion(q);
    },
    [submitQuestion]
  );

  const handleSuggestion = useCallback(
    (q: string) => {
      submitQuestion(q);
    },
    [submitQuestion]
  );

  const handleSpeak = useCallback(
    (msgId: string, content: string) => {
      setSpeakingMessageId(msgId);
      speak(content);
    },
    [speak]
  );

  const handleStop = useCallback(() => {
    stop();
    setSpeakingMessageId(null);
  }, [stop]);

  const handleReplay = useCallback(() => {
    replay();
  }, [replay]);

  const isDisabled = appState === "processing";
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, rgba(30,58,120,0.25) 0%, transparent 60%), radial-gradient(ellipse at 80% 100%, rgba(88,28,135,0.15) 0%, transparent 60%), #080c14",
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-slate-800/60 backdrop-blur-md bg-slate-900/50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold gradient-text leading-tight">
              Meet Shubham
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5">
              AI Voice Assistant · Engineering Interview Demo
            </p>
          </div>
          <nav className="flex items-center gap-2" aria-label="Shubham's profiles">
            {[
              {
                href: "https://shubhamnagar234.vercel.app/",
                icon: Globe,
                label: "Portfolio",
              },
              {
                href: "https://github.com/shubhamnagar234",
                icon: Code2,
                label: "GitHub",
              },
              {
                href: "https://www.linkedin.com/in/shubhamnagar234/",
                icon: Users,
                label: "LinkedIn",
              },
              {
                href: "https://medium.com/@shubhamnagar234",
                icon: BookOpen,
                label: "Medium",
              },
            ].map(({ href, icon: Icon, label }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-blue-900/20 transition-colors"
              >
                <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ── Main content ───────────────────────────────────────────── */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 flex flex-col gap-6">
        {/* AI disclaimer */}
        <div
          className="glass-card rounded-xl px-4 py-3 flex items-start gap-3 border-blue-900/40"
          role="note"
          aria-label="AI disclaimer"
        >
          <span className="text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true">
            ℹ️
          </span>
          <p className="text-xs text-slate-400 leading-relaxed">
            <strong className="text-slate-300">This is an AI assistant</strong>{" "}
            representing Shubham Nagar — not a live conversation with Shubham.
            It answers questions based on verified background information and
            uses Google Gemini to generate responses.
          </p>
        </div>

        {/* Error banner */}
        {errorBanner && (
          <div
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-800/60 bg-red-900/20 text-red-300 text-sm animate-fade-in"
          >
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span className="flex-1">{errorBanner}</span>
            <button
              onClick={() => setErrorBanner(null)}
              aria-label="Dismiss error"
              className="flex-shrink-0 text-red-400 hover:text-red-200"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ── Mic section ─────────────────────────────────────────── */}
        <section
          className="glass-card rounded-2xl p-6 flex flex-col items-center gap-2"
          aria-label="Voice input"
        >
          <MicButton
            state={appState}
            isSupported={isSupported}
            onClick={handleMicClick}
          />

          {/* Interim transcript */}
          {(interimText || isListening) && (
            <p
              aria-live="polite"
              className="text-sm text-slate-400 italic text-center mt-2 max-w-md animate-fade-in min-h-[1.25rem]"
            >
              {interimText || "Listening…"}
            </p>
          )}
        </section>

        {/* ── Chat area ───────────────────────────────────────────── */}
        <section
          className="glass-card rounded-2xl p-4 flex flex-col gap-3 min-h-[200px]"
          aria-label="Conversation"
          aria-live="polite"
          aria-relevant="additions"
        >
          {messages.map((msg) => {
            const isLastAssistant =
              msg.role === "assistant" && lastAssistantMsg?.id === msg.id;
            return (
              <ChatMessage
                key={msg.id}
                message={msg}
                isSpeaking={isSpeaking && speakingMessageId === msg.id}
                isLastAssistant={isLastAssistant}
                onSpeak={() => handleSpeak(msg.id, msg.content)}
                onStop={handleStop}
                onReplay={handleReplay}
              />
            );
          })}

          {/* Processing indicator */}
          {appState === "processing" && (
            <div
              className="flex gap-3 animate-fade-in"
              aria-label="Processing your question"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-violet-600">
                <span className="text-xs font-bold text-white">AI</span>
              </div>
              <div className="glass-card rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="loading-dot w-2 h-2 rounded-full bg-blue-400" />
                <span className="loading-dot w-2 h-2 rounded-full bg-violet-400" />
                <span className="loading-dot w-2 h-2 rounded-full bg-blue-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </section>

        {/* ── Text input ──────────────────────────────────────────── */}
        <section aria-label="Text input">
          <TextInput
            value={inputText}
            onChange={setInputText}
            onSubmit={handleTextSubmit}
            disabled={isDisabled}
            placeholder={
              isListening
                ? "Listening via microphone…"
                : "Or type your question here (Enter to send)"
            }
          />
        </section>

        {/* ── Suggested questions ─────────────────────────────────── */}
        <SuggestedQuestions onSelect={handleSuggestion} disabled={isDisabled} />
      </main>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/40 text-center py-4 text-[11px] text-slate-600">
        <p>
          Built with Next.js · Google Gemini · Web Speech API ·{" "}
          <a
            href="https://github.com/shubhamnagar234/meet-shubham"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-blue-400 transition-colors"
          >
            View source
          </a>
        </p>
      </footer>
    </div>
  );
}
