/**
 * ============================================================================
 * Speech Normalizer for Text-to-Speech (TTS)
 * ============================================================================
 *
 * Normalizes technical acronyms, degree terms, and number formats so that
 * neural voices (e.g. en-IN-PrabhatNeural) and browser Web Speech engines
 * pronounce words authentically as natural spoken English instead of reading
 * abbreviations as literal words (e.g. "skit" instead of "S-K-I-T") or
 * numbers as digit sequences (e.g. "one zero zero zero" instead of "one thousand").
 */

export function normalizeForSpeech(text: string): string {
  if (!text) return "";

  let spoken = text;

  // 1. Strip markdown symbols and format links
  spoken = spoken
    .replace(/[*#`_~>]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [link text](url) -> link text
    .replace(/[—–]/g, ", "); // replace em/en dashes with comma pause

  // 2. Acronyms & Institutions
  // SKIT Jaipur -> "S-K-I-T" (avoids pronouncing dictionary word "skit")
  spoken = spoken.replace(/\bS\.?K\.?I\.?T\.?\b/g, "S-K-I-T");

  // CGPA -> "C-G-P-A"
  spoken = spoken.replace(/\bC\.?G\.?P\.?A\.?\b/g, "C-G-P-A");

  // 3I Academy -> "Three-I Academy" (avoids "thirty one" or "three one")
  spoken = spoken.replace(/\b3I\b/g, "Three-I");

  // RAGAS -> "Ragas"
  spoken = spoken.replace(/\bRAGAS\b/g, "Ragas");

  // Judge0 -> "Judge Zero"
  spoken = spoken.replace(/\bJudge0\b/gi, "Judge Zero");

  // BM25 -> "B-M twenty-five"
  spoken = spoken.replace(/\bBM25\b/gi, "B-M twenty-five");

  // CI/CD -> "C-I C-D"
  spoken = spoken.replace(/\bCI\/CD\b/gi, "C-I C-D");

  // LLM / LLMs -> "L-L-M" / "L-L-Ms"
  spoken = spoken.replace(/\bLLMs\b/g, "L-L-Ms");
  spoken = spoken.replace(/\bLLM\b/g, "L-L-M");

  // API / APIs -> "A-P-I" / "A-P-Is"
  spoken = spoken.replace(/\bAPIs\b/g, "A-P-Is");
  spoken = spoken.replace(/\bAPI\b/g, "A-P-I");

  // GSAP -> "G-S-A-P"
  spoken = spoken.replace(/\bGSAP\b/g, "G-S-A-P");

  // p95 -> "P-95"
  spoken = spoken.replace(/\bp95\b/gi, "P-95");

  // "1,000+" or "1000+" -> "one thousand plus"
  spoken = spoken.replace(/\b1[,.]?000\+/g, "one thousand plus");
  // "1,000" or "1000" followed by a space/word -> "one thousand"
  spoken = spoken.replace(/\b1[,.]?000\b/g, "one thousand");

  // "1,500+" or "1500+" -> "fifteen hundred plus"
  spoken = spoken.replace(/\b1[,.]?500\+/g, "fifteen hundred plus");
  spoken = spoken.replace(/\b1[,.]?500\b/g, "fifteen hundred");

  // "10+" -> "ten plus"
  spoken = spoken.replace(/\b10\+/g, "ten plus");

  // "5+" -> "five plus"
  spoken = spoken.replace(/\b5\+/g, "five plus");

  // "3.5+" -> "three point five plus"
  spoken = spoken.replace(/\b3\.5\+/g, "three point five plus");

  // Milliseconds unit abbreviation: e.g. "250ms" -> "250 milliseconds"
  spoken = spoken.replace(/\b(\d+(?:\.\d+)?)\s*ms\b/gi, "$1 milliseconds");

  // Generic any number with trailing '+' (e.g. "20+") -> "N plus"
  spoken = spoken.replace(/\b(\d+)\+/g, "$1 plus");

  // "sub-3-second" or "sub-3s" -> "sub three-second"
  spoken = spoken.replace(/sub-3-second/gi, "sub three-second");
  spoken = spoken.replace(/sub-3s/gi, "sub three-second");

  // Collapse multiple spaces
  return spoken.replace(/\s+/g, " ").trim();
}
