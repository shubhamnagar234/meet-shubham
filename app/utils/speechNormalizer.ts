/**
 * ============================================================================
 * Speech Normalizer for Text-to-Speech (TTS) — Backwards Compatibility Re-export
 * ============================================================================
 *
 * All pronunciation normalization logic is centralized in:
 *   lib/speech/pronunciation.ts
 *
 * This file maintains backwards compatibility with any existing imports.
 */

export {
  normalizeForSpeech,
  isIdempotent,
  PRONUNCIATION_DICTIONARY,
  type PronunciationEntry,
} from "@/lib/speech/pronunciation";
