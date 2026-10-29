# Meet Shubham — AI Voice Assistant

An interactive, production-grade AI voice assistant representing **Shubham Nagar** for the **100x AI Agent Team** hiring evaluation. Evaluators can speak or type to learn about Shubham's engineering background, hands-on production experience, architecture decisions, and projects.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-meet--shubham.vercel.app-2563eb?style=for-the-badge&logo=vercel)](https://meet-shubham.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?style=for-the-badge&logo=tailwindcss)](https://tailwindcss.com/)

🔗 **Live Deployment**: [https://meet-shubham.vercel.app](https://meet-shubham.vercel.app)

---

## ✨ Key Capabilities & Highlights

- 🎙️ **Natural Voice Interaction**: Real-time microphone speech recognition via browser Web Speech API with live interim transcript display.
- 🔊 **Indian English Neural Voice**: Server-side high-fidelity voice output powered by Microsoft Edge Neural TTS (`en-IN-PrabhatNeural`) matching Shubham's authentic voice persona.
- ⚡ **Zero-Delay Synchronized Playback**: Real-time chunked streaming via Web `ReadableStream` flushes the first audio frame in `<200ms`. Text response bubbles, live waveform visualizers, and speech playback trigger in lockstep.
- 🍎 **Safari & iOS WebKit Optimization**: Synchronous one-touch audio priming and Byte Range requests (`HTTP 206 Partial Content`) ensure 100% reliable audio playback on macOS Safari and iOS devices.
- 🛡️ **Multi-Tier Fault Tolerance & Circuit Breaking**:
  1. **Primary**: Google Gemini 2.5 Flash (`gemini-2.5-flash`).
  2. **Secondary**: Groq LLM fallback (`openai/gpt-oss-20b`) triggered automatically if Gemini quota is exhausted (HTTP 429) via a 10-minute circuit breaker.
  3. **Tertiary**: Deterministic grounded offline answer bank covering all 10 evaluation topics and core profile facts.
- 🧠 **Anti-Hallucination & Grounding**: Hardened against prompt injection, premise assumption traps (e.g. 9.9 CGPA, 50-person team), and metric inflation.
- 🧪 **Automated Audit Suites**: Built-in test endpoints verifying 81/81 deterministic grounding scenarios and 55/55 pronunciation normalization rules.
- ⌨️ **Universal Fallback**: Keyboard input and Web Speech API synthesis fallback are always available across all platforms.

---

## 🎯 10 Evaluation Topics Covered

The assistant is strictly grounded in Shubham Nagar's verified profile and answers the 10 core evaluator prompts:

1. **Background & Current Role** — 3.5+ years of software engineering experience, B.Tech CSE with Honours from SKIT Jaipur (9.09 CGPA), Full Stack & AI engineering at Three-I Academy Solutions.
2. **Ragentic Knowledge Workspace** — Agentic RAG architecture built with LangGraph, hybrid search (dense + sparse BM25), semantic routing, cross-encoder reranking, and self-corrective query expansion.
3. **Core Technical Stack** — Next.js, React, Node.js, Python, TypeScript, PostgreSQL, LangChain, Pinecone, Docker, and AWS.
4. **100x Engineers Key Achievements** — Building real-world AI agent workflows, LangGraph multi-agent systems, and production-ready full-stack applications.
5. **AI Coding Agent Workflow** — Pragmatic pair-programming with tools like Google Antigravity, Cursor, Claude Code, and OpenAI Codex while maintaining strict engineering verification and ownership.
6. **Hard Technical Problem Solved** — Multi-tenant role-based access control (RBAC) and payment integration across 10+ schools and 1,000+ active students.
7. **Production AI Incident & Debugging** — Vector store context degradation resolved through metadata partitioning, threshold pruning, and semantic caching.
8. **TokenHire Platform Architecture** — AI-powered coding assessment platform featuring sandboxed code execution and sub-millisecond scoring.
9. **Approach to Fast-Moving AI Stacks** — Deconstructing fundamentals (embeddings, context windows, state graphs) rather than chasing fleeting wrapper libraries.
10. **Motivation for 100x AI Agent Team** — Passion for designing end-to-end agentic systems that deliver practical, production-grade business value.

---

## 🏗️ Architecture & Request Flow

```mermaid
flowchart TD
    User([User Voice or Text]) --> InputDock[VoiceAssistant Client]
    InputDock -->|Prime Audio| AudioSession[AudioSessionManager / Web Audio API]
    InputDock -->|POST /api/ask| AskRoute[/api/ask]

    subgraph MultiTierLLM [Resilient Multi-Tier Generation]
        AskRoute --> CheckQuota{Gemini Quota Available?}
        CheckQuota -->|Yes| Gemini[Google Gemini 2.5 Flash]
        CheckQuota -->|429 / Error| CircuitBreaker[Circuit Breaker Trips]
        CircuitBreaker --> Groq[Groq: openai/gpt-oss-20b]
        Groq -->|Error| FallbackBank[Local Grounded Answer Bank]
    end

    MultiTierLLM --> NormalizedText[Normalized Answer Text]
    NormalizedText -->|GET /api/tts?text=...| TTSRoute[/api/tts]

    subgraph NeuralTTS [Neural Audio Pipeline]
        TTSRoute --> CacheCheck{Audio in Memory Cache?}
        CacheCheck -->|Hit <1ms| CachedBuffer[HTTP 206 Partial Content]
        CacheCheck -->|Miss| EdgeTTS[Microsoft Edge Neural TTS: en-IN-PrabhatNeural]
        EdgeTTS --> StreamResponse[Web ReadableStream Chunk Flush <150ms]
    end

    StreamResponse --> AudioPlayer[HTML5 Audio / Web Audio Decoding]
    CachedBuffer --> AudioPlayer
    AudioPlayer -->|audio.onplay sync| SynchronizedUI[Simultaneous Message Render + Waveform + Voice Playback]
```

---

## 🧪 Built-In Test Endpoints

The repository includes dedicated regression and grounding audit endpoints that can be inspected directly in the browser:

| Endpoint                  | Test Suite        | What It Verifies                                                                                                                                                   |
| ------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/api/test-grounding`     | **81 Scenarios**  | 100% pass rate across assessment answers, metric isolation, false premise rejections, negative boundaries, prompt injection resistance, and memory contamination.  |
| `/api/test-pronunciation` | **55 Scenarios**  | 100% pass rate verifying acronyms and names (`A-I`, `S-K-I-T`, `C-G-P-A`, `LangChain`, `Pinecone`, `Three-I`, etc.) sound natural on Indian English neural voices. |
| `/api/tts?text=...`       | **Streaming TTS** | Audio delivery via `audio/mpeg` with Byte Range support (`HTTP 206`) and in-memory LRU caching.                                                                    |

---

## 🚀 Quick Start (Local Development)

### Prerequisites

- Node.js 18+ or Node.js 20+
- A [Google Gemini API Key](https://aistudio.google.com/)
- _(Optional)_ A [Groq API Key](https://console.groq.com/) for multi-LLM failover

### 1. Clone & Install

```bash
git clone https://github.com/shubhamnagar234/meet-shubham.git
cd meet-shubham
npm install
```

### 2. Configure Environment Variables

Create `.env.local` based on `.env.example`:

```bash
cp .env.example .env.local
```

Populate the keys in `.env.local`:

```env
# Google Gemini API (Primary LLM)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Groq API (Secondary Failover LLM)
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=openai/gpt-oss-20b

# Neural TTS Voice (defaults to en-IN-PrabhatNeural)
TTS_VOICE=en-IN-PrabhatNeural
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Lint & Build Verification

```bash
npm run lint
npm run build
```

---

## ☁️ Deployment (Vercel)

The repository is pre-configured for continuous deployment with **Vercel**:

1. Fork or push your changes to GitHub.
2. In [Vercel](https://vercel.com/), click **Add New Project** and import `meet-shubham`.
3. Add the environment variables:
   - `GEMINI_API_KEY`
   - `GEMINI_MODEL` (e.g. `gemini-2.5-flash`)
   - `GROQ_API_KEY` _(optional but recommended for failover)_
   - `GROQ_MODEL` (e.g. `openai/gpt-oss-20b`)
   - `TTS_VOICE` (`en-IN-PrabhatNeural`)
4. Click **Deploy**. Vercel will build and host the application at `https://meet-shubham.vercel.app`.

---

## 📁 Project Structure

```
meet-shubham/
├── app/
│   ├── api/
│   │   ├── ask/route.ts                # Orchestrates Gemini -> Groq -> Local Grounded Bank
│   │   ├── tts/route.ts                # Real-time chunked neural MP3 streaming with Range support
│   │   ├── test-grounding/route.ts     # 81-test deterministic grounding audit endpoint
│   │   └── test-pronunciation/route.ts # 55-test pronunciation normalization suite
│   ├── components/
│   │   ├── VoiceAssistant.tsx          # Main voice + chat interface
│   │   ├── ChatMessage.tsx             # Bubbles with playback controls & source badges
│   │   ├── TextInput.tsx               # Unified input dock with live waveform & status pill
│   │   ├── MicButton.tsx               # Interactive mic toggle button
│   │   ├── SuggestedQuestions.tsx      # Quick-select evaluation chips
│   │   └── Waveform.tsx                # Audio visualizer bars
│   ├── data/
│   │   ├── shubhamProfile.ts           # Ground truth profile facts & 10 approved answers
│   │   ├── fallbackAnswers.ts          # Comprehensive grounded knowledge bank
│   │   └── groundingAudit.ts           # 81 deterministic test scenarios
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts     # Browser speech recognition wrapper
│   │   └── useSpeechSynthesis.ts       # AudioSessionManager, Safari unlock & sync
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   └── types.ts
├── lib/
│   └── speech/
│       ├── pronunciation.ts            # Phonetic normalization dictionary
│       └── pronunciationTests.ts       # 55 pronunciation test cases
├── public/
├── .env.example
└── README.md
```

---

## 🎙️ Browser Compatibility

| Browser     | Platform                  | Microphone Input | Neural Voice Output (`PrabhatNeural`) | Fallback Voice |
| ----------- | ------------------------- | :--------------: | :-----------------------------------: | :------------: |
| **Chrome**  | Windows / macOS / Android |   ✅ Supported   |             ✅ Supported              |  ✅ Supported  |
| **Edge**    | Windows / macOS           |   ✅ Supported   |             ✅ Supported              |  ✅ Supported  |
| **Safari**  | macOS / iOS               |   ✅ Supported   |      ✅ Supported (Primed Audio)      |  ✅ Supported  |
| **Firefox** | Windows / macOS / Linux   |   ⌨️ Text Only   |             ✅ Supported              |  ✅ Supported  |

---

## 👤 About Shubham Nagar

- **Portfolio**: [shubhamnagar234.vercel.app](https://shubhamnagar234.vercel.app/)
- **GitHub**: [@shubhamnagar234](https://github.com/shubhamnagar234)
- **LinkedIn**: [linkedin.com/in/shubhamnagar234](https://www.linkedin.com/in/shubhamnagar234/)
- **Medium**: [@shubhamnagar234](https://medium.com/@shubhamnagar234)
