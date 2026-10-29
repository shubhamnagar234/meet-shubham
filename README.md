# Meet Shubham — AI Voice Assistant

An interactive AI voice assistant that answers a hiring evaluator's questions about Shubham Nagar's engineering background, projects, and experience.

Built for the **100x AI Agent Team** hiring assessment.

🔗 **Live URL**: _(add after Vercel deployment)_

---

## ✨ Features

- 🎤 **Voice input** via browser Web Speech API (Chrome/Edge/Safari)
- ⌨️ **Text fallback** always available — works in every browser
- 🤖 **AI-powered answers** grounded in verified background facts (Google Gemini)
- 🔊 **Text-to-speech** answer playback with Stop and Replay controls
- 🌊 **Animated waveform** visualizer during listening/speaking
- 💬 **Conversation history** — supports natural follow-up questions
- 🎯 **10 suggested questions** for the assessment topics
- 🔒 **Secure** — API key never exposed to the client

---

## 🚀 Quick Start (Local)

### Prerequisites

- Node.js 18+
- A [Google Gemini API key](https://aistudio.google.com/)

### 1. Clone & install

```bash
git clone https://github.com/shubhamnagar234/meet-shubham.git
cd meet-shubham
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🔐 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | ✅ Yes | Your Google Gemini API key from [aistudio.google.com](https://aistudio.google.com/) |
| `GEMINI_MODEL` | Optional | Model ID (default: `gemini-2.0-flash`) |

> **Security**: `.env.local` is excluded from Git. Never commit real API keys.

---

## ☁️ Deploying to Vercel

### Step 1: Push to GitHub

```bash
git remote add origin https://github.com/shubhamnagar234/meet-shubham.git
git branch -M main
git push -u origin main
```

### Step 2: Import to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import the `meet-shubham` GitHub repository
3. Vercel auto-detects Next.js — no changes needed

### Step 3: Set environment variables

In Vercel project settings → **Environment Variables**, add:

| Name | Value |
|------|-------|
| `GEMINI_API_KEY` | `AIzaSy...` (your real key) |
| `GEMINI_MODEL` | `gemini-2.0-flash` |

### Step 4: Deploy

Click **Deploy**. Vercel will build and deploy. Your public URL will be:
```
https://meet-shubham.vercel.app
```
(or a custom subdomain)

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| AI | Google Gemini via `@google/genai` |
| Voice Input | Web Speech API (browser-native) |
| Voice Output | Web Speech Synthesis API (browser-native) |
| Icons | Lucide React |
| Deployment | Vercel |

---

## 📁 Project Structure

```
meet-shubham/
├── app/
│   ├── api/ask/route.ts          # Secure Gemini API endpoint
│   ├── components/
│   │   ├── VoiceAssistant.tsx    # Main client component
│   │   ├── MicButton.tsx         # Mic button with states
│   │   ├── ChatMessage.tsx       # Message bubbles
│   │   ├── TextInput.tsx         # Text fallback input
│   │   ├── SuggestedQuestions.tsx # Question chips
│   │   └── Waveform.tsx          # Animated visualizer
│   ├── hooks/
│   │   ├── useSpeechRecognition.ts
│   │   └── useSpeechSynthesis.ts
│   ├── types.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── .env.example                  # Safe template (no secrets)
├── .env.local                    # Real config (git-ignored)
└── .gitignore
```

---

## 🎙️ Voice Support

| Browser | Speech Input | Speech Output |
|---------|-------------|---------------|
| Chrome | ✅ Full | ✅ Full |
| Edge | ✅ Full | ✅ Full |
| Safari | ⚠️ Partial | ✅ Full |
| Firefox | ❌ None | ✅ Full |

The app degrades gracefully — text input and speech output work in all browsers.

---

## 🔒 Security

- Gemini API key stored only in server environment variables
- API route validates input length (max 1,000 chars) and rejects empty input
- Rate limiting: 20 requests per minute per IP
- Conversation history bounded to last 6 turns
- No audio data stored or logged
- `.env*` files excluded from Git via `.gitignore`

---

## 👤 About Shubham

- **Portfolio**: [shubhamnagar234.vercel.app](https://shubhamnagar234.vercel.app/)
- **GitHub**: [github.com/shubhamnagar234](https://github.com/shubhamnagar234)
- **LinkedIn**: [linkedin.com/in/shubhamnagar234](https://www.linkedin.com/in/shubhamnagar234/)
- **Medium**: [medium.com/@shubhamnagar234](https://medium.com/@shubhamnagar234)
