/**
 * ============================================================================
 * Local Fallback Answer Bank — Meet Shubham
 * ============================================================================
 *
 * Dedicated fallback knowledge bank used when live Gemini API quota is
 * exhausted (HTTP 429) or unavailable.
 *
 * Features:
 * - Deterministic, verified responses for the 10 assessment questions.
 * - Factual quick-lookup for education, contact, and tech stack questions.
 * - Pattern-matching for query variations.
 * - Friendly, transparent guidance for unrecognized open-ended questions.
 */

import { DRAFT_PERSONAL_RESPONSES, VERIFIED_FACTS } from "./shubhamProfile";

export interface FallbackItem {
  id: string;
  category: "assessment_core" | "quick_fact";
  canonicalQuestion: string;
  patterns: RegExp[];
  answer: string;
}

export const FALLBACK_ANSWER_BANK: FallbackItem[] = [
  // ── 10 CORE ASSESSMENT QUESTIONS ───────────────────────────────────────────
  {
    id: "q1_life_story",
    category: "assessment_core",
    canonicalQuestion: "Tell me your life story.",
    patterns: [
      /\blife\s*story\b/i,
      /\babout\s*(your|him)self\b/i,
      /\bwho\s*(are\s*you|is\s*shubham)\b/i,
      /\bcareer\s*(story|journey|path)\b/i,
      /\bprofessional\s*(background|journey|story)\b/i,
      /\bwalk\s*me\s*through\s*(your|the)\s*resume\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.lifeStory,
  },
  {
    id: "q2_superpower",
    category: "assessment_core",
    canonicalQuestion: "What is your number-one superpower?",
    patterns: [
      /\bsuper\s*power\b/i,
      /\bgreatest\s*strength\b/i,
      /\bnumber\s*(one|1)\s*(super\s*power|strength)\b/i,
      /\bbiggest\s*strength\b/i,
      /\bwhat\s*are\s*you\s*best\s*at\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.superpower,
  },
  {
    id: "q3_growth_areas",
    category: "assessment_core",
    canonicalQuestion: "What are your top three growth areas?",
    patterns: [
      /\bgrowth\s*area/i,
      /\btop\s*(3|three)\s*growth/i,
      /\bweakness(es)?\b/i,
      /\bwhat\s*are\s*you\s*(improving|working\s*on)\b/i,
      /\bareas\s*(to|for)\s*improve/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.growthAreasSpokenAnswer,
  },
  {
    id: "q4_misconception",
    category: "assessment_core",
    canonicalQuestion: "What misconception might coworkers have about you?",
    patterns: [
      /\bmisconception/i,
      /\bmisunderstand/i,
      /\bcoworker(s)?\s*(might\s*)?(have|think)\b/i,
      /\bcolleague(s)?\s*think\b/i,
      /\bwrong\s*impression\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.coworkerMisconceptions,
  },
  {
    id: "q5_comfort_zone",
    category: "assessment_core",
    canonicalQuestion: "How do you push beyond your comfort zone?",
    patterns: [
      /\bcomfort\s*zone\b/i,
      /\bpush\s*(beyond|yourself)\b/i,
      /\bchalleng(e|ing)\s*(yourself|boundaries)\b/i,
      /\bhardest\s*learning\b/i,
      /\bstretch(ed)?\s*yourself\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.comfortZone,
  },
  {
    id: "q6_proud_project",
    category: "assessment_core",
    canonicalQuestion: "Tell me about a technical project you are proud of.",
    patterns: [
      /\bproud\s*of\b/i,
      /\bproject\s*(you\s*are\s*)?proud\b/i,
      /\btokenhire\b/i,
      /\bfavorite\s*project\b/i,
      /\bbest\s*project\b/i,
      /\btechnical\s*project\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.proudProject,
  },
  {
    id: "q7_ai_coding_agents",
    category: "assessment_core",
    canonicalQuestion: "How do you use AI coding agents in your workflow?",
    patterns: [
      /\b(ai\s*)?coding\s*agent(s)?\b/i,
      /\bcoding\s*assistant(s)?\b/i,
      /\b(how\s*do\s*you\s*use\s*)?(cursor|copilot|claude\s*code)\b/i,
      /\bai\s*(in\s*your\s*)?workflow\b/i,
      /\buse\s*ai\s*to\s*code\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.aiCodingAgentsWorkflow,
  },
  {
    id: "q8_ai_code_correctness",
    category: "assessment_core",
    canonicalQuestion: "How do you make sure AI-generated code is correct?",
    patterns: [
      /\b(code\s*)?correct(ness)?\b/i,
      /\bai[- ]generated\s*code\b/i,
      /\bverify\s*(ai\s*)?code\b/i,
      /\bensure\s*(code|ai)\b/i,
      /\bcode\s*quality\b/i,
      /\btest(ing)?\s*ai\s*code\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.aiGeneratedCodeCorrectness,
  },
  {
    id: "q9_difficult_problem",
    category: "assessment_core",
    canonicalQuestion: "Describe a difficult technical problem you solved.",
    patterns: [
      /\bdifficult\s*(technical\s*)?problem\b/i,
      /\bhardest\s*(bug|problem|challenge)\b/i,
      /\bchallenging\s*problem\b/i,
      /\bsub[- ]3[- ]second\b/i,
      /\bchatbot\s*latency\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.difficultTechnicalProblem,
  },
  {
    id: "q10_why_agent_team",
    category: "assessment_core",
    canonicalQuestion: "Why do you want to join an AI Agent Team?",
    patterns: [
      /\bwhy\s*(join|100x|an\s*ai\s*agent\s*team)\b/i,
      /\bagent\s*team\b/i,
      /\bwhy\s*do\s*you\s*want\s*to\s*join\b/i,
      /\bmotivation\s*to\s*join\b/i,
      /\bwhy\s*this\s*role\b/i,
    ],
    answer: DRAFT_PERSONAL_RESPONSES.whyJoinAiAgentTeam,
  },

  // ── QUICK FACT PATTERNS ────────────────────────────────────────────────────
  {
    id: "fact_education",
    category: "quick_fact",
    canonicalQuestion: "Where did you study?",
    patterns: [
      /\b(where\s*did\s*you\s*)?(study|graduate|college|university|degree|cgpa|skit)\b/i,
      /\beducation(al\s*background)?\b/i,
    ],
    answer: `I graduated with a Bachelor of Technology in Computer Science & Engineering (Honours) from ${VERIFIED_FACTS.education.institution} in Jaipur, India, with a CGPA of ${VERIFIED_FACTS.education.cgpa} (${VERIFIED_FACTS.education.period}).`,
  },
  {
    id: "fact_ragentic",
    category: "quick_fact",
    canonicalQuestion: "What is Ragentic?",
    patterns: [
      /\bragentic\b/i,
      /\bhybrid\s*rag\b/i,
      /\b5[- ]node\b/i,
      /\breciprocal\s*rank\b/i,
    ],
    answer: `Ragentic is an agentic RAG knowledge workspace I built using LangGraph, FastAPI, Next.js, and Qdrant. It features a 5-node workflow for query classification, retrieval, confidence evaluation, query rewriting, and generation, combining Qdrant vector search with BM25 keyword search, Reciprocal Rank Fusion, and cross-encoder reranking.`,
  },
  {
    id: "fact_experience",
    category: "quick_fact",
    canonicalQuestion: "Tell me about your experience at 3I Academy Solutions.",
    patterns: [
      /\b3i\s*academy\b/i,
      /\bcurrent\s*(role|company|job)\b/i,
      /\bparrot\b/i,
    ],
    answer: `At 3I Academy Solutions, where I've worked as a Software Engineer since April 2023, I built a context-aware RAG chatbot with sub-3-second responses, deployed a 4-role RBAC system for 10+ schools and 1,000+ students, integrated Razorpay handling 1,000+ transactions, and built Parrot, a React Native classroom AI mobile app with AI voice coaching.`,
  },
  {
    id: "fact_contact",
    category: "quick_fact",
    canonicalQuestion: "How can I contact Shubham?",
    patterns: [
      /\b(contact|email|phone|reach|hire|get\s*in\s*touch)\b/i,
      /\blinkedin\b/i,
      /\bgithub\b/i,
    ],
    answer: `You can reach Shubham Nagar via email at ${VERIFIED_FACTS.contact.email} or by phone at ${VERIFIED_FACTS.contact.phone}. You can also explore his portfolio at ${VERIFIED_FACTS.contact.portfolio}, GitHub at ${VERIFIED_FACTS.contact.github}, and LinkedIn at ${VERIFIED_FACTS.contact.linkedin}.`,
  },
];

export const UNRECOGNIZED_FALLBACK_MESSAGE =
  "Live AI responses are temporarily unavailable due to external Gemini API rate limits on the free tier.\n\n" +
  "However, you can explore Shubham's verified background by asking any of the 10 prepared interview questions below—such as \"Tell me your life story\", \"What is your number-one superpower?\", or \"Tell me about a technical project you are proud of\".";

/**
 * Matches a user's question against the fallback bank.
 * Returns the matching FallbackItem, or null if unrecognized.
 */
export function matchFallbackAnswer(question: string): FallbackItem | null {
  const trimmed = question.trim().toLowerCase();
  if (!trimmed) return null;

  // 1. Direct canonical question equality check
  for (const item of FALLBACK_ANSWER_BANK) {
    if (item.canonicalQuestion.toLowerCase() === trimmed) {
      return item;
    }
  }

  // 2. Regex pattern matching
  for (const item of FALLBACK_ANSWER_BANK) {
    for (const pattern of item.patterns) {
      if (pattern.test(trimmed)) {
        return item;
      }
    }
  }

  return null;
}
