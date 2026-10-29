/**
 * ============================================================================
 * Centralized Pronunciation Normalization Utility — Meet Shubham
 * ============================================================================
 *
 * Implements token-aware speech normalization for:
 * 1. Microsoft Edge Neural TTS (en-IN-PrabhatNeural)
 * 2. Browser Web Speech API fallback (Indian English / natural voices)
 *
 * Design Principles:
 * - Clear separation: Display text is NEVER modified; only the synthesized audio string is normalized.
 * - Token & boundary awareness: Uses word boundaries (\b) and contextual phrases to avoid harmful substrings.
 * - Idempotent: normalizeForSpeech(normalizeForSpeech(x)) === normalizeForSpeech(x).
 * - Factual number preservation: Spells out numbers naturally without changing decimal values.
 */

export interface PronunciationEntry {
  term: string;
  spoken: string;
  description: string;
  category: "proper_noun" | "acronym" | "technology" | "metric" | "formatting";
}

export const PRONUNCIATION_DICTIONARY: PronunciationEntry[] = [
  // Proper Nouns & Institutions
  {
    term: "SKIT Jaipur",
    spoken: "S-K-I-T Jaipur",
    description:
      "Swami Keshvanand Institute of Technology (avoids comedy sketch pronunciation)",
    category: "proper_noun",
  },
  {
    term: "3I Academy Solutions",
    spoken: "Three-I Academy Solutions",
    description: "Startup company name (avoids 'thirty-one' or 'three one')",
    category: "proper_noun",
  },
  {
    term: "B.Tech",
    spoken: "Bachelors of Technology",
    description: "Engineering undergraduate degree",
    category: "proper_noun",
  },

  // Acronyms
  {
    term: "CGPA",
    spoken: "C-G-P-A",
    description: "Cumulative Grade Point Average",
    category: "acronym",
  },
  {
    term: "RBAC",
    spoken: "R-B-A-C",
    description: "Role-Based Access Control",
    category: "acronym",
  },
  {
    term: "API / APIs",
    spoken: "A-P-I / A-P-Is",
    description: "Application Programming Interface",
    category: "acronym",
  },
  {
    term: "AI",
    spoken: "A-I",
    description: "Artificial Intelligence",
    category: "acronym",
  },
  {
    term: "LLM / LLMs",
    spoken: "L-L-M / L-L-Ms",
    description: "Large Language Model",
    category: "acronym",
  },
  {
    term: "RAG",
    spoken: "RAG",
    description:
      "Retrieval-Augmented Generation (pronounced as single industry term)",
    category: "acronym",
  },
  {
    term: "RAGAS",
    spoken: "Ragas",
    description: "Retrieval Augmented Generation Assessment",
    category: "acronym",
  },
  {
    term: "RRF",
    spoken: "R-R-F",
    description: "Reciprocal Rank Fusion",
    category: "acronym",
  },
  {
    term: "CI/CD",
    spoken: "C-I, C-D",
    description: "Continuous Integration and Continuous Delivery",
    category: "acronym",
  },
  {
    term: "AWS",
    spoken: "A-W-S",
    description: "Amazon Web Services",
    category: "acronym",
  },
  {
    term: "EC2",
    spoken: "E-C-two",
    description: "AWS Elastic Compute Cloud",
    category: "acronym",
  },
  {
    term: "S3",
    spoken: "S-three",
    description: "AWS Simple Storage Service",
    category: "acronym",
  },
  {
    term: "SSE",
    spoken: "S-S-E",
    description: "Server-Sent Events",
    category: "acronym",
  },
  {
    term: "GSAP",
    spoken: "G-S-A-P",
    description: "GreenSock Animation Platform",
    category: "acronym",
  },
  {
    term: "JWT",
    spoken: "J-W-T",
    description: "JSON Web Token",
    category: "acronym",
  },

  // Technologies
  {
    term: "PostgreSQL",
    spoken: "Postgres",
    description: "Relational database system (standard spoken industry form)",
    category: "technology",
  },
  {
    term: "Next.js",
    spoken: "Next dot J-S",
    description: "React framework for web applications",
    category: "technology",
  },
  {
    term: "Node.js",
    spoken: "Node dot J-S",
    description: "JavaScript runtime environment",
    category: "technology",
  },
  {
    term: "FastAPI",
    spoken: "Fast A-P-I",
    description: "Python async web framework",
    category: "technology",
  },
  {
    term: "React.js",
    spoken: "React dot J-S",
    description: "UI library",
    category: "technology",
  },
  {
    term: "Judge0",
    spoken: "Judge Zero",
    description: "Sandboxed code execution engine",
    category: "technology",
  },
  {
    term: "BM25",
    spoken: "B-M twenty-five",
    description: "Best Matching 25 ranking algorithm",
    category: "technology",
  },

  // Metrics & Numerics
  {
    term: "259.62 ms",
    spoken: "two hundred fifty-nine point six two milliseconds",
    description: "TokenHire mocked local benchmark median latency",
    category: "metric",
  },
  {
    term: "0.01 ms",
    spoken: "zero point zero one milliseconds",
    description: "TokenHire p95 isolated scoring engine latency",
    category: "metric",
  },
  {
    term: "p95",
    spoken: "P-ninety-five",
    description: "95th percentile metric",
    category: "metric",
  },
  {
    term: "9.09",
    spoken: "nine point zero nine",
    description: "Shubham's graduation CGPA",
    category: "metric",
  },
  {
    term: "3.5+ years",
    spoken: "more than three and a half years",
    description: "Software engineering experience duration",
    category: "metric",
  },
  {
    term: "10+ schools",
    spoken: "more than ten schools",
    description: "RBAC deployment scale",
    category: "metric",
  },
  {
    term: "1,000+ students",
    spoken: "more than one thousand students",
    description: "RBAC student user scale",
    category: "metric",
  },
  {
    term: "sub-3-second",
    spoken: "under three seconds",
    description: "3I Academy chatbot course retrieval response time",
    category: "metric",
  },
  {
    term: "5-node",
    spoken: "five-node",
    description: "Ragentic LangGraph agent workflow",
    category: "metric",
  },
];

/**
 * Normalizes text for speech synthesis engines.
 * Ensures natural Indian English cadence and exact pronunciation of technical terms.
 */
export function normalizeForSpeech(text: string): string {
  if (!text || typeof text !== "string") return "";

  let spoken = text;

  // ── 1. STRIP MARKDOWN & FORMATTING ─────────────────────────────────────────
  spoken = spoken
    // Strip code blocks: ```lang code ``` -> code
    .replace(/```[\s\S]*?```/g, (match) => {
      return match.replace(/```[a-zA-Z]*\n?/g, "").replace(/```/g, "");
    })
    // Strip inline code backticks: `code` -> code
    .replace(/`([^`]+)`/g, "$1")
    // Strip markdown links: [link text](url) -> link text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Strip bold & italic markdown: **text** or *text* -> text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // Strip markdown headers: # Header -> Header
    .replace(/^#{1,6}\s+/gm, "")
    // Replace em dashes and en dashes with a comma and pause for natural breath
    .replace(/[—–]/g, ", ");

  // ── 2. METRICS & NUMBER PHRASINGS (BEFORE INDIVIDUAL TOKENS) ───────────────
  // "sub-3-second latency" or "sub-3-second" -> "under three seconds of latency" / "under three seconds"
  spoken = spoken
    .replace(/sub-3-second\s+latency/gi, "under three seconds of latency")
    .replace(/sub-3-second/gi, "under three seconds")
    .replace(/sub-3s\s+latency/gi, "under three seconds of latency")
    .replace(/sub-3s/gi, "under three seconds");

  // Specific Latency Benchmarks
  // "259.62 ms" / "259.62 milliseconds" -> "two hundred fifty-nine point six two milliseconds"
  spoken = spoken.replace(
    /\b259\.62\s*(?:ms|milliseconds)\b/gi,
    "two hundred fifty-nine point six two milliseconds",
  );

  // "0.01 ms" / "0.01 milliseconds" -> "zero point zero one milliseconds"
  spoken = spoken.replace(
    /\b0\.01\s*(?:ms|milliseconds)\b/gi,
    "zero point zero one milliseconds",
  );

  // "p95" -> "P-ninety-five" (idempotent: does not match P-ninety-five)
  spoken = spoken.replace(/\bp95\b/gi, "P-ninety-five");

  // "9.09" CGPA -> "nine point zero nine"
  spoken = spoken.replace(/\b9\.09\b/g, "nine point zero nine");

  // "3.5+ years" -> "more than three and a half years"
  spoken = spoken.replace(
    /\b3\.5\+\s*years\b/gi,
    "more than three and a half years",
  );
  spoken = spoken.replace(/\b3\.5\s*years\b/gi, "three and a half years");

  // "10+ schools" -> "more than ten schools"
  spoken = spoken.replace(/\b10\+\s*schools\b/gi, "more than ten schools");

  // "1,000+ students" -> "more than one thousand students"
  spoken = spoken.replace(
    /\b1[,.]?000\+\s*students\b/gi,
    "more than one thousand students",
  );

  // "1,000+ transactions" -> "more than one thousand transactions"
  spoken = spoken.replace(
    /\b1[,.]?000\+\s*transactions\b/gi,
    "more than one thousand transactions",
  );

  // "10+ paid" -> "more than ten paid"
  spoken = spoken.replace(/\b10\+\s*paid\b/gi, "more than ten paid");

  // "1,500+ animations" -> "more than fifteen hundred animations"
  spoken = spoken.replace(
    /\b1[,.]?500\+\s*animations\b/gi,
    "more than fifteen hundred animations",
  );

  // "5+ subjects" -> "more than five subjects"
  spoken = spoken.replace(/\b5\+\s*subjects\b/gi, "more than five subjects");

  // "5-node workflow" -> "five-node workflow"
  spoken = spoken.replace(/\b5-node\s+workflow\b/gi, "five-node workflow");
  spoken = spoken.replace(/\b5-node\b/gi, "five-node");

  // "100x" -> "one hundred x"
  spoken = spoken.replace(/\b100x\b/gi, "one hundred x");

  // Generic any number with trailing '+' (e.g. "1,000+" -> "more than one thousand", "10+" -> "more than ten")
  spoken = spoken
    .replace(/\b1[,.]?000\+/g, "more than one thousand")
    .replace(/\b1[,.]?000\b/g, "one thousand")
    .replace(/\b1[,.]?500\+/g, "more than fifteen hundred")
    .replace(/\b1[,.]?500\b/g, "fifteen hundred")
    .replace(/\b10\+/g, "more than ten")
    .replace(/\b5\+/g, "more than five");

  // Remaining general milliseconds: "250ms" -> "250 milliseconds"
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*ms\b/gi, "$1 milliseconds");

  // ── 3. INSTITUTIONS & PROPER NOUNS ─────────────────────────────────────────
  // SKIT Jaipur -> S-K-I-T Jaipur (idempotent: avoids S---K---I---T)
  spoken = spoken.replace(/\bskit\s+jaipur\b/gi, "S-K-I-T Jaipur");
  spoken = spoken.replace(
    /\bS(?:\.|\s|-)?K(?:\.|\s|-)?I(?:\.|\s|-)?T\b/g,
    "S-K-I-T",
  );

  // 3I Academy Solutions -> Three-I Academy Solutions
  spoken = spoken.replace(
    /\b3I\s+Academy\s+Solutions\b/gi,
    "Three-I Academy Solutions",
  );
  spoken = spoken.replace(/\b3I\s+Academy\b/gi, "Three-I Academy");
  spoken = spoken.replace(/\b3I\b/g, "Three-I");

  // B.Tech in Computer Science -> Bachelors of Technology
  spoken = spoken.replace(
    /\bB\.Tech\s*\((?:Honours|Hons)\)\b/gi,
    "Bachelors of Technology with Honours",
  );
  spoken = spoken.replace(/\bB\.Tech\b/gi, "Bachelors of Technology");

  // CGPA -> C-G-P-A (idempotent)
  spoken = spoken.replace(
    /\bC(?:\.|\s|-)?G(?:\.|\s|-)?P(?:\.|\s|-)?A\b/gi,
    "C-G-P-A",
  );

  // ── 4. TECHNICAL FRAMEWORKS & TOOLS ────────────────────────────────────────
  // PostgreSQL -> Postgres
  spoken = spoken.replace(/\bPostgreSQL\b/gi, "Postgres");

  // Next.js -> Next dot J-S
  spoken = spoken.replace(/\bNext\.js\b/gi, "Next dot J-S");

  // Node.js -> Node dot J-S
  spoken = spoken.replace(/\bNode\.js\b/gi, "Node dot J-S");

  // React.js -> React dot J-S
  spoken = spoken.replace(/\bReact\.js\b/gi, "React dot J-S");

  // FastAPI -> Fast A-P-I
  spoken = spoken.replace(/\bFastAPI\b/gi, "Fast A-P-I");

  // BM25 -> B-M twenty-five (idempotent)
  spoken = spoken.replace(/\bB(?:\.|\s|-)?M(?:-|\s)?25\b/gi, "B-M twenty-five");

  // Judge0 -> Judge Zero
  spoken = spoken.replace(/\bJudge0\b/gi, "Judge Zero");

  // RAGAS -> Ragas (consistent natural pronunciation)
  spoken = spoken.replace(/\bRAGAS\b/gi, "Ragas");

  // OpenAI -> Open A-I (idempotent)
  spoken = spoken.replace(/\bOpenAI\b/gi, "Open A-I");

  // CI/CD -> C-I, C-D (idempotent)
  spoken = spoken.replace(/\bCI\/CD\b/gi, "C-I, C-D");

  // ── 5. ACRONYMS WITH ACCURATE PHONETIC SPELLING ────────────────────────────
  // RBAC -> R-B-A-C (idempotent)
  spoken = spoken.replace(
    /\bR(?:\.|\s|-)?B(?:\.|\s|-)?A(?:\.|\s|-)?C\b/gi,
    "R-B-A-C",
  );

  // RRF -> R-R-F (idempotent)
  spoken = spoken.replace(/\bR(?:\.|\s|-)?R(?:\.|\s|-)?F\b/g, "R-R-F");

  // AWS -> A-W-S (idempotent)
  spoken = spoken.replace(/\bA(?:\.|\s|-)?W(?:\.|\s|-)?S\b/g, "A-W-S");

  // EC2 -> E-C-two (idempotent)
  spoken = spoken.replace(/\bEC2\b/gi, "E-C-two");

  // S3 -> S-three (idempotent)
  spoken = spoken.replace(/\bS3\b/gi, "S-three");

  // SSE -> S-S-E (idempotent)
  spoken = spoken.replace(/\bS(?:\.|\s|-)?S(?:\.|\s|-)?E\b/g, "S-S-E");

  // GSAP -> G-S-A-P (idempotent)
  spoken = spoken.replace(
    /\bG(?:\.|\s|-)?S(?:\.|\s|-)?A(?:\.|\s|-)?P\b/gi,
    "G-S-A-P",
  );

  // JWT -> J-W-T (idempotent)
  spoken = spoken.replace(/\bJ(?:\.|\s|-)?W(?:\.|\s|-)?T\b/gi, "J-W-T");

  // LLM / LLMs -> L-L-M / L-L-Ms (idempotent)
  spoken = spoken.replace(/\bL(?:\.|\s|-)?L(?:\.|\s|-)?Ms\b/gi, "L-L-Ms");
  spoken = spoken.replace(/\bL(?:\.|\s|-)?L(?:\.|\s|-)?M\b/gi, "L-L-M");

  // API / APIs -> A-P-I / A-P-Is (idempotent)
  spoken = spoken.replace(/\bA(?:\.|\s|-)?P(?:\.|\s|-)?Is\b/g, "A-P-Is");
  spoken = spoken.replace(/\bA(?:\.|\s|-)?P(?:\.|\s|-)?I\b/g, "A-P-I");
  spoken = spoken.replace(/\bapis\b/g, "A-P-Is");
  spoken = spoken.replace(/\bapi\b/g, "A-P-I");

  // AI -> A-I (strict word boundary, does not match in 'said', 'praise', 'chain')
  spoken = spoken.replace(/\bAI\b/g, "A-I");

  // ── 6. CLEANUP & COLLAPSE EXCESS SPACES ────────────────────────────────────
  return spoken.replace(/\s+/g, " ").trim();
}

/**
 * Checks if a given text string normalizes idempotently.
 */
export function isIdempotent(text: string): boolean {
  const once = normalizeForSpeech(text);
  const twice = normalizeForSpeech(once);
  return once === twice;
}
