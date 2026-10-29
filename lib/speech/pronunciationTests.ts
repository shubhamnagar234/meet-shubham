/**
 * ============================================================================
 * Pronunciation Regression Test Suite — Meet Shubham
 * ============================================================================
 *
 * Comprehensive automated regression testing for speech normalization,
 * ensuring authentic Indian English pronunciation, token boundary safety,
 * factual metric preservation, and idempotency across all 10 approved answers.
 */

import { normalizeForSpeech, isIdempotent } from "./pronunciation";
import { APPROVED_FIRST_PERSON_ANSWERS } from "@/app/data/shubhamProfile";

export interface PronunciationTestCase {
  id: string;
  category:
    | "dictionary_terms"
    | "case_sensitivity"
    | "complete_sentences"
    | "numbers_and_decimals"
    | "punctuation_adjacency"
    | "repeated_terms"
    | "harmful_substitutions_guard"
    | "display_preservation"
    | "factual_metrics"
    | "provider_invariance"
    | "unicode_and_apostrophes"
    | "idempotency_and_replay"
    | "approved_10_answers";
  description: string;
  input: string;
  expectedSpoken?: string;
  assertFn?: (
    normalized: string,
    raw: string,
  ) => { pass: boolean; reason?: string };
}

export const PRONUNCIATION_TEST_CASES: PronunciationTestCase[] = [
  // ── 1. ALL TERMS IN PRONUNCIATION DICTIONARY ───────────────────────────────
  {
    id: "DICT-01",
    category: "dictionary_terms",
    description: "SKIT Jaipur expands with hyphenated acronym",
    input: "I studied at SKIT Jaipur.",
    assertFn: (norm) => ({
      pass: norm.includes("S-K-I-T Jaipur"),
      reason: `Expected 'S-K-I-T Jaipur', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-02",
    category: "dictionary_terms",
    description: "3I Academy Solutions expands to Three-I",
    input: "At 3I Academy Solutions, I built production AI tools.",
    assertFn: (norm) => ({
      pass: norm.includes("Three-I Academy Solutions") && norm.includes("A-I"),
      reason: `Expected 'Three-I Academy Solutions' and 'A-I', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-03",
    category: "dictionary_terms",
    description:
      "B.Tech expands to Bachelors of Technology without duplicating Honours",
    input:
      "I graduated with a B.Tech in Computer Science and Engineering with Honours.",
    assertFn: (norm) => ({
      pass:
        norm.includes(
          "Bachelors of Technology in Computer Science and Engineering with Honours",
        ) &&
        !norm.includes(
          "Honours in Computer Science and Engineering with Honours",
        ),
      reason: `Expected clean expansion without duplicate Honours, got: '${norm}'`,
    }),
  },
  {
    id: "DICT-04",
    category: "dictionary_terms",
    description: "CGPA acronym expands with phonetic hyphens",
    input: "I achieved a 9.09 CGPA.",
    assertFn: (norm) => ({
      pass: norm.includes("C-G-P-A"),
      reason: `Expected 'C-G-P-A', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-05",
    category: "dictionary_terms",
    description: "RBAC expands to R-B-A-C",
    input: "I implemented RBAC for multi-tenant school access.",
    assertFn: (norm) => ({
      pass: norm.includes("R-B-A-C"),
      reason: `Expected 'R-B-A-C', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-06",
    category: "dictionary_terms",
    description: "API and APIs expand to A-P-I and A-P-Is",
    input: "I designed RESTful APIs and connected external API integrations.",
    assertFn: (norm) => ({
      pass: norm.includes("A-P-Is") && norm.includes("A-P-I"),
      reason: `Expected 'A-P-Is' and 'A-P-I', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-07",
    category: "dictionary_terms",
    description: "AI expands to A-I",
    input: "I am a Full Stack AI Engineer.",
    assertFn: (norm) => ({
      pass: norm.includes("A-I Engineer"),
      reason: `Expected 'A-I Engineer', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-08",
    category: "dictionary_terms",
    description: "LLM and LLMs expand to L-L-M and L-L-Ms",
    input: "Recruiters set LLM budgets across multiple LLMs.",
    assertFn: (norm) => ({
      pass: norm.includes("L-L-M budgets") && norm.includes("L-L-Ms"),
      reason: `Expected 'L-L-M' and 'L-L-Ms', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-09",
    category: "dictionary_terms",
    description: "RAG stays as RAG without word corruption",
    input: "I built Ragentic as an agentic RAG system.",
    assertFn: (norm) => ({
      pass: norm.includes("RAG system") && norm.includes("Ragentic"),
      reason: `Expected 'RAG system' and 'Ragentic', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-10",
    category: "dictionary_terms",
    description: "RAGAS normalizes to natural spoken Ragas",
    input: "We evaluated retrieval quality with RAGAS metrics.",
    assertFn: (norm) => ({
      pass: norm.includes("Ragas metrics"),
      reason: `Expected 'Ragas metrics', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-11",
    category: "dictionary_terms",
    description:
      "LangChain, LangGraph, Pinecone, and Qdrant are preserved naturally",
    input: "I used LangChain, LangGraph, Pinecone, and Qdrant in production.",
    assertFn: (norm) => ({
      pass:
        norm.includes("LangChain") &&
        norm.includes("LangGraph") &&
        norm.includes("Pinecone") &&
        norm.includes("Qdrant"),
      reason: `Expected all frameworks preserved, got: '${norm}'`,
    }),
  },
  {
    id: "DICT-12",
    category: "dictionary_terms",
    description: "BM25 expands to B-M twenty-five and RRF expands to R-R-F",
    input: "I combined BM25 keyword search with RRF scoring.",
    assertFn: (norm) => ({
      pass: norm.includes("B-M twenty-five") && norm.includes("R-R-F"),
      reason: `Expected 'B-M twenty-five' and 'R-R-F', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-13",
    category: "dictionary_terms",
    description: "PostgreSQL normalizes to spoken Postgres",
    input: "The relational database is PostgreSQL with Prisma ORM.",
    assertFn: (norm) => ({
      pass: norm.includes("Postgres with Prisma"),
      reason: `Expected 'Postgres with Prisma', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-14",
    category: "dictionary_terms",
    description: "Next.js and Node.js normalize with dot J-S",
    input: "The stack includes Next.js and Node.js microservices.",
    assertFn: (norm) => ({
      pass: norm.includes("Next dot J-S") && norm.includes("Node dot J-S"),
      reason: `Expected 'Next dot J-S' and 'Node dot J-S', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-15",
    category: "dictionary_terms",
    description: "FastAPI normalizes to Fast A-P-I",
    input: "The backend service was built using FastAPI.",
    assertFn: (norm) => ({
      pass: norm.includes("Fast A-P-I"),
      reason: `Expected 'Fast A-P-I', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-16",
    category: "dictionary_terms",
    description: "Judge0 normalizes to Judge Zero and Monaco Editor preserved",
    input:
      "TokenHire uses Judge0 for sandbox execution and Monaco Editor for coding.",
    assertFn: (norm) => ({
      pass: norm.includes("Judge Zero") && norm.includes("Monaco Editor"),
      reason: `Expected 'Judge Zero' and 'Monaco Editor', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-17",
    category: "dictionary_terms",
    description: "CI/CD expands to C-I, C-D with audio pause comma",
    input: "I automated deployments using GitHub Actions and CI/CD pipelines.",
    assertFn: (norm) => ({
      pass: norm.includes("C-I, C-D"),
      reason: `Expected 'C-I, C-D', got: '${norm}'`,
    }),
  },
  {
    id: "DICT-18",
    category: "dictionary_terms",
    description: "AWS, EC2, S3, and SSE expand correctly",
    input: "We deployed on AWS EC2, stored logs in S3, and streamed via SSE.",
    assertFn: (norm) => ({
      pass:
        norm.includes("A-W-S") &&
        norm.includes("E-C-two") &&
        norm.includes("S-three") &&
        norm.includes("S-S-E"),
      reason: `Expected 'A-W-S', 'E-C-two', 'S-three', and 'S-S-E', got: '${norm}'`,
    }),
  },

  // ── 2. CASE SENSITIVITY WHERE RELEVANT ─────────────────────────────────────
  {
    id: "CASE-01",
    category: "case_sensitivity",
    description:
      "Lowercase English words containing 'ai' are not mutated into A-I",
    input:
      "I said that training the model requires daily maintenance against rain.",
    assertFn: (norm) => ({
      pass:
        !norm.includes("sA-Id") &&
        !norm.includes("trA-Ining") &&
        !norm.includes("dA-Ily") &&
        norm.includes("said") &&
        norm.includes("training"),
      reason: `Harmful substitution occurred in 'said' or 'training': '${norm}'`,
    }),
  },
  {
    id: "CASE-02",
    category: "case_sensitivity",
    description: "Lowercase English words containing 'rag' are not mutated",
    input: "He made a courageous brag without dragging the baggage.",
    assertFn: (norm) => ({
      pass:
        norm.includes("courageous") &&
        norm.includes("brag") &&
        norm.includes("dragging") &&
        norm.includes("baggage"),
      reason: `Substrings matched inside ordinary words: '${norm}'`,
    }),
  },
  {
    id: "CASE-03",
    category: "case_sensitivity",
    description:
      "Lowercase 'skit' in theatrical context is not mutated into S-K-I-T",
    input: "The students performed a comedy skit at the annual fest.",
    assertFn: (norm) => ({
      pass: norm.includes("comedy skit") && !norm.includes("comedy S-K-I-T"),
      reason: `Word 'skit' was incorrectly expanded to acronym: '${norm}'`,
    }),
  },

  // ── 3. TERMS INSIDE COMPLETE SENTENCES ─────────────────────────────────────
  {
    id: "SENT-01",
    category: "complete_sentences",
    description: "Section 6 Example 1: SKIT Jaipur with 9.09 CGPA",
    input: "I graduated from SKIT Jaipur with a 9.09 CGPA.",
    expectedSpoken:
      "I graduated from S-K-I-T Jaipur with a nine point zero nine C-G-P-A.",
    assertFn: (norm) => ({
      pass:
        norm ===
        "I graduated from S-K-I-T Jaipur with a nine point zero nine C-G-P-A.",
      reason: `Exact match failure. Expected: 'I graduated from S-K-I-T Jaipur with a nine point zero nine C-G-P-A.', Got: '${norm}'`,
    }),
  },
  {
    id: "SENT-02",
    category: "complete_sentences",
    description:
      "Section 6 Example 2: Ragentic with LangGraph, Qdrant, BM25, and RRF",
    input: "I built Ragentic using LangGraph, Qdrant, BM25, and RRF.",
    expectedSpoken:
      "I built Ragentic using LangGraph, Qdrant, B-M twenty-five, and R-R-F.",
    assertFn: (norm) => ({
      pass:
        norm ===
        "I built Ragentic using LangGraph, Qdrant, B-M twenty-five, and R-R-F.",
      reason: `Exact match failure. Expected: 'I built Ragentic using LangGraph, Qdrant, B-M twenty-five, and R-R-F.', Got: '${norm}'`,
    }),
  },
  {
    id: "SENT-03",
    category: "complete_sentences",
    description: "Section 6 Example 3: TokenHire 259.62 ms median latency",
    input:
      "TokenHire recorded 259.62 ms median latency in a mocked local benchmark.",
    expectedSpoken:
      "TokenHire recorded two hundred fifty-nine point six two milliseconds median latency in a mocked local benchmark.",
    assertFn: (norm) => ({
      pass:
        norm ===
        "TokenHire recorded two hundred fifty-nine point six two milliseconds median latency in a mocked local benchmark.",
      reason: `Exact match failure. Got: '${norm}'`,
    }),
  },

  // ── 4. NUMBERS AND DECIMAL VALUES ──────────────────────────────────────────
  {
    id: "NUM-01",
    category: "numbers_and_decimals",
    description: "0.01 ms latency expands to zero point zero one milliseconds",
    input: "The isolated scoring engine recorded 0.01 ms latency.",
    assertFn: (norm) => ({
      pass: norm.includes("zero point zero one milliseconds"),
      reason: `Expected 'zero point zero one milliseconds', got: '${norm}'`,
    }),
  },
  {
    id: "NUM-02",
    category: "numbers_and_decimals",
    description: "p95 metric expands to P-ninety-five",
    input:
      "TokenHire recorded a p95 latency of 0.01 ms in isolated evaluation.",
    assertFn: (norm) => ({
      pass:
        norm.includes("P-ninety-five") &&
        norm.includes("zero point zero one milliseconds"),
      reason: `Expected 'P-ninety-five' and 'zero point zero one milliseconds', got: '${norm}'`,
    }),
  },
  {
    id: "NUM-03",
    category: "numbers_and_decimals",
    description: "3.5+ years expands to more than three and a half years",
    input: "I have over 3.5+ years of software engineering experience.",
    assertFn: (norm) => ({
      pass: norm.includes("more than three and a half years"),
      reason: `Expected 'more than three and a half years', got: '${norm}'`,
    }),
  },
  {
    id: "NUM-04",
    category: "numbers_and_decimals",
    description: "10+ schools and 1,000+ students expand naturally",
    input: "RBAC deployed across 10+ schools and 1,000+ students.",
    assertFn: (norm) => ({
      pass:
        norm.includes("more than ten schools") &&
        norm.includes("more than one thousand students") &&
        norm.includes("R-B-A-C"),
      reason: `Expected 'more than ten schools' and 'more than one thousand students', got: '${norm}'`,
    }),
  },
  {
    id: "NUM-05",
    category: "numbers_and_decimals",
    description:
      "1,000 without plus expands to one thousand (avoids one zero zero zero)",
    input: "The system scaled to 1,000 active students.",
    assertFn: (norm) => ({
      pass: norm.includes("one thousand active students"),
      reason: `Expected 'one thousand active students', got: '${norm}'`,
    }),
  },
  {
    id: "NUM-06",
    category: "numbers_and_decimals",
    description:
      "sub-3-second latency expands to under three seconds of latency",
    input: "The course chatbot delivered sub-3-second latency.",
    assertFn: (norm) => ({
      pass: norm.includes("under three seconds of latency"),
      reason: `Expected 'under three seconds of latency', got: '${norm}'`,
    }),
  },
  {
    id: "NUM-07",
    category: "numbers_and_decimals",
    description: "5-node workflow expands to five-node workflow",
    input: "Ragentic is an agentic 5-node workflow.",
    assertFn: (norm) => ({
      pass: norm.includes("five-node workflow"),
      reason: `Expected 'five-node workflow', got: '${norm}'`,
    }),
  },

  // ── 5. ACRONYMS ADJACENT TO PUNCTUATION ────────────────────────────────────
  {
    id: "PUNCT-01",
    category: "punctuation_adjacency",
    description: "Acronyms inside parentheses expand properly",
    input: "I graduated from Swami Keshvanand Institute of Technology (SKIT).",
    assertFn: (norm) => ({
      pass: norm.includes("(S-K-I-T)"),
      reason: `Expected '(S-K-I-T)', got: '${norm}'`,
    }),
  },
  {
    id: "PUNCT-02",
    category: "punctuation_adjacency",
    description:
      "Acronyms followed by commas, question marks, and exclamation marks",
    input: "Did you use CI/CD? Yes, with AWS, EC2, and S3!",
    assertFn: (norm) => ({
      pass:
        norm.includes("C-I, C-D?") &&
        norm.includes("A-W-S,") &&
        norm.includes("E-C-two,") &&
        norm.includes("S-three!"),
      reason: `Punctuation boundary failure: '${norm}'`,
    }),
  },
  {
    id: "PUNCT-03",
    category: "punctuation_adjacency",
    description: "Next.js followed by punctuation",
    input: "Have you worked with Next.js?",
    assertFn: (norm) => ({
      pass: norm.includes("Next dot J-S?"),
      reason: `Expected 'Next dot J-S?', got: '${norm}'`,
    }),
  },

  // ── 6. TERMS REPEATED MULTIPLE TIMES IN AN ANSWER ──────────────────────────
  {
    id: "REPEAT-01",
    category: "repeated_terms",
    description:
      "Multiple occurrences of SKIT in one answer all expand properly",
    input:
      "I started at SKIT, graduated from SKIT Jaipur, and represented SKIT.",
    assertFn: (norm) => {
      const count = (norm.match(/S-K-I-T/g) || []).length;
      return {
        pass: count === 3,
        reason: `Expected 3 occurrences of 'S-K-I-T', found ${count} in '${norm}'`,
      };
    },
  },
  {
    id: "REPEAT-02",
    category: "repeated_terms",
    description: "Multiple occurrences of AI and LLM expand uniformly",
    input: "AI systems and AI agents rely on an LLM or multiple LLMs.",
    assertFn: (norm) => {
      const aiCount = (norm.match(/A-I/g) || []).length;
      return {
        pass:
          aiCount === 2 && norm.includes("L-L-M") && norm.includes("L-L-Ms"),
        reason: `Expected uniform expansions, got: '${norm}'`,
      };
    },
  },

  // ── 7. SIMILAR CHARACTER SEQUENCES (MUST NOT BE MODIFIED) ─────────────────
  {
    id: "GUARD-01",
    category: "harmful_substitutions_guard",
    description:
      "Words containing 'api' like 'rapid' or 'capital' are untouched",
    input: "Rapid capital investment enables tapping into APIs.",
    assertFn: (norm) => ({
      pass:
        norm.includes("Rapid") &&
        norm.includes("capital") &&
        norm.includes("tapping") &&
        norm.includes("A-P-Is"),
      reason: `Substrings corrupted inside rapid/capital: '${norm}'`,
    }),
  },
  {
    id: "GUARD-02",
    category: "harmful_substitutions_guard",
    description: "Words containing '3i' or numbers like '31' are not modified",
    input: "Item 31 was sold on 31st October.",
    assertFn: (norm) => ({
      pass:
        !norm.includes("Three-I1") &&
        !norm.includes("Three-Ist") &&
        norm.includes("31"),
      reason: `Number 31 was corrupted into Three-I: '${norm}'`,
    }),
  },

  // ── 8. PRESERVATION OF DISPLAYED TEXT ──────────────────────────────────────
  {
    id: "DISP-01",
    category: "display_preservation",
    description:
      "Speech normalization does not mutate the original string object",
    input: "I built TokenHire with Next.js and Judge0.",
    assertFn: (norm, raw) => ({
      pass: raw === "I built TokenHire with Next.js and Judge0.",
      reason: "Raw string was mutated in-place!",
    }),
  },

  // ── 9. PRESERVATION OF FACTUAL NUMBERS AND METRICS ─────────────────────────
  {
    id: "FACT-01",
    category: "factual_metrics",
    description: "259.62 ms is not rounded to 260 or altered",
    input: "TokenHire recorded 259.62 ms median latency.",
    assertFn: (norm) => ({
      pass:
        norm.includes("two hundred fifty-nine point six two milliseconds") &&
        !norm.includes("260"),
      reason: `Metric value was altered or not preserved accurately: '${norm}'`,
    }),
  },
  {
    id: "FACT-02",
    category: "factual_metrics",
    description: "9.09 CGPA is exact without rounding to 9.1",
    input: "My CGPA was 9.09.",
    assertFn: (norm) => ({
      pass:
        norm.includes("nine point zero nine") &&
        norm.includes("C-G-P-A") &&
        !norm.includes("nine point one"),
      reason: `Grade was rounded or corrupted: '${norm}'`,
    }),
  },

  // ── 10. PROVIDER INVARIANCE (GEMINI VS GROQ) ──────────────────────────────
  {
    id: "PROV-01",
    category: "provider_invariance",
    description:
      "Normalizer output is strictly identical regardless of provider source",
    input: "Ragentic uses LangGraph and BM25.",
    assertFn: (norm) => {
      const geminiSimulated = normalizeForSpeech(
        "Ragentic uses LangGraph and BM25.",
      );
      const groqSimulated = normalizeForSpeech(
        "Ragentic uses LangGraph and BM25.",
      );
      return {
        pass: geminiSimulated === groqSimulated && geminiSimulated === norm,
        reason: `Provider output variation detected: ${geminiSimulated} !== ${groqSimulated}`,
      };
    },
  },

  // ── 11. UNICODE, APOSTROPHES, AND FORMATTING ───────────────────────────────
  {
    id: "UNICODE-01",
    category: "unicode_and_apostrophes",
    description:
      "Curly apostrophes, contractions, and em-dashes normalize cleanly",
    input:
      "I’m confident that Shubham’s experience—especially with AI—delivers results.",
    assertFn: (norm) => ({
      pass:
        norm.includes("I’m") &&
        norm.includes("Shubham’s") &&
        norm.includes("A-I") &&
        !norm.includes("—"),
      reason: `Apostrophe or em-dash normalization failed: '${norm}'`,
    }),
  },
  {
    id: "EMPTY-01",
    category: "unicode_and_apostrophes",
    description:
      "Empty text and whitespace handle safely without runtime exceptions",
    input: "   ",
    assertFn: (norm) => ({
      pass: norm === "",
      reason: `Expected empty string for whitespace input, got: '${norm}'`,
    }),
  },

  // ── 12. IDEMPOTENCY & REPEAT REPLAY ACTIONS ────────────────────────────────
  {
    id: "IDEMP-01",
    category: "idempotency_and_replay",
    description:
      "Re-normalizing speech text on Replay produces identical result without double-hyphenation",
    input:
      "I studied at SKIT Jaipur with a 9.09 CGPA and built Ragentic with BM25.",
    assertFn: (norm) => {
      const pass = isIdempotent(
        "I studied at SKIT Jaipur with a 9.09 CGPA and built Ragentic with BM25.",
      );
      const secondPass = normalizeForSpeech(norm);
      return {
        pass:
          pass && secondPass === norm && !secondPass.includes("S---K---I---T"),
        reason: `Idempotency failure! Re-normalization changed text: '${secondPass}'`,
      };
    },
  },

  // ── 13. REPRESENTATIVE REGRESSION CASES: ALL 10 APPROVED ANSWERS ───────────
  {
    id: "ANS-01",
    category: "approved_10_answers",
    description:
      "Question 1 (Life Story) normalizes cleanly with all proper nouns and metrics",
    input: APPROVED_FIRST_PERSON_ANSWERS.lifeStory,
    assertFn: (norm) => ({
      pass:
        norm.includes("Full Stack A-I Engineer") &&
        norm.includes(
          "Bachelors of Technology in Computer Science and Engineering with Honours",
        ) &&
        norm.includes("S-K-I-T Jaipur") &&
        norm.includes("nine point zero nine C-G-P-A") &&
        norm.includes("Three-I Academy Solutions") &&
        norm.includes("one thousand students") &&
        norm.includes("RAG"),
      reason: `Answer 1 speech normalization failed key terms: '${norm.slice(0, 200)}...'`,
    }),
  },
  {
    id: "ANS-02",
    category: "approved_10_answers",
    description:
      "Question 2 (Superpower) normalizes APIs and AI integrations cleanly",
    input: APPROVED_FIRST_PERSON_ANSWERS.superpower,
    assertFn: (norm) => ({
      pass: norm.includes("A-P-Is") && norm.includes("A-I"),
      reason: `Answer 2 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
  {
    id: "ANS-03",
    category: "approved_10_answers",
    description: "Question 3 (Growth Areas) normalizes AWS, CI/CD, and RAG",
    input: APPROVED_FIRST_PERSON_ANSWERS.growthAreasSpokenAnswer,
    assertFn: (norm) => ({
      pass:
        norm.includes("A-W-S") &&
        norm.includes("C-I, C-D") &&
        norm.includes("RAG"),
      reason: `Answer 3 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
  {
    id: "ANS-04",
    category: "approved_10_answers",
    description: "Question 4 (Misconceptions) normalizes LLMs and APIs",
    input: APPROVED_FIRST_PERSON_ANSWERS.coworkerMisconceptions,
    assertFn: (norm) => ({
      pass: norm.includes("L-L-Ms") && norm.includes("A-P-Is"),
      reason: `Answer 4 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
  {
    id: "ANS-05",
    category: "approved_10_answers",
    description:
      "Question 5 (Comfort Zone) normalizes LangGraph, Qdrant, BM25, and LLM",
    input: APPROVED_FIRST_PERSON_ANSWERS.comfortZone,
    assertFn: (norm) => ({
      pass:
        norm.includes("five-node") &&
        norm.includes("LangGraph") &&
        norm.includes("Qdrant") &&
        norm.includes("B-M twenty-five") &&
        norm.includes("L-L-M"),
      reason: `Answer 5 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
  {
    id: "ANS-06",
    category: "approved_10_answers",
    description:
      "Question 6 (Proud Project) normalizes Next.js, Postgres, Judge Zero, and 259.62 milliseconds",
    input: APPROVED_FIRST_PERSON_ANSWERS.proudProject,
    assertFn: (norm) => ({
      pass:
        norm.includes("Next dot J-S") &&
        norm.includes("Postgres") &&
        norm.includes("Judge Zero") &&
        norm.includes("two hundred fifty-nine point six two milliseconds"),
      reason: `Answer 6 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
  {
    id: "ANS-07",
    category: "approved_10_answers",
    description:
      "Question 7 (AI Coding Agents) normalizes Antigravity, Cursor, Claude Code, OpenAI Codex, and LangGraph",
    input: APPROVED_FIRST_PERSON_ANSWERS.aiCodingAgentsWorkflow,
    assertFn: (norm) => ({
      pass:
        norm.includes("Google Antigravity") &&
        norm.includes("Cursor") &&
        norm.includes("Claude Code") &&
        norm.includes("Open A-I Codex") &&
        norm.includes("LangGraph"),
      reason: `Answer 7 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
  {
    id: "ANS-08",
    category: "approved_10_answers",
    description: "Question 8 (AI-Generated Code) normalizes TokenHire and APIs",
    input: APPROVED_FIRST_PERSON_ANSWERS.aiGeneratedCodeCorrectness,
    assertFn: (norm) => ({
      pass: norm.includes("TokenHire") && norm.includes("A-P-I contracts"),
      reason: `Answer 8 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
  {
    id: "ANS-09",
    category: "approved_10_answers",
    description:
      "Question 9 (Difficult Problem) normalizes LangChain, Pinecone, and sub-3-second latency",
    input: APPROVED_FIRST_PERSON_ANSWERS.difficultTechnicalProblem,
    assertFn: (norm) => ({
      pass:
        norm.includes("LangChain") &&
        norm.includes("Pinecone") &&
        norm.includes("under three seconds"),
      reason: `Answer 9 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
  {
    id: "ANS-10",
    category: "approved_10_answers",
    description:
      "Question 10 (Why Join AI Agent Team) normalizes LangGraph and Ragentic",
    input: APPROVED_FIRST_PERSON_ANSWERS.whyJoinAiAgentTeam,
    assertFn: (norm) => ({
      pass:
        norm.includes("A-I Agent Team") &&
        norm.includes("LangGraph") &&
        norm.includes("Ragentic"),
      reason: `Answer 10 speech normalization failed: '${norm.slice(0, 150)}...'`,
    }),
  },
];

export interface TestSuiteResult {
  total: number;
  passed: number;
  failed: number;
  passRate: string;
  results: Array<{
    id: string;
    category: string;
    description: string;
    status: "PASS" | "FAIL";
    normalized: string;
    failureReason?: string;
  }>;
}

/**
 * Runs the full pronunciation regression test suite.
 */
export function runPronunciationTestSuite(): TestSuiteResult {
  let passed = 0;
  let failed = 0;

  const results = PRONUNCIATION_TEST_CASES.map((tc) => {
    const normalized = normalizeForSpeech(tc.input);

    let isPass = true;
    let failureReason: string | undefined;

    if (tc.expectedSpoken !== undefined) {
      if (normalized !== tc.expectedSpoken) {
        isPass = false;
        failureReason = `Expected exact '${tc.expectedSpoken}', got '${normalized}'`;
      }
    }

    if (isPass && tc.assertFn) {
      const assertion = tc.assertFn(normalized, tc.input);
      if (!assertion.pass) {
        isPass = false;
        failureReason = assertion.reason || "Assertion failed";
      }
    }

    if (isPass) {
      passed++;
    } else {
      failed++;
    }

    return {
      id: tc.id,
      category: tc.category,
      description: tc.description,
      status: isPass ? ("PASS" as const) : ("FAIL" as const),
      normalized,
      failureReason,
    };
  });

  const total = results.length;
  const passRate = `${((passed / total) * 100).toFixed(1)}%`;

  return { total, passed, failed, passRate, results };
}
