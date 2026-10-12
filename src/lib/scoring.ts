import {
  TRANSCRIPT_ALIASES,
  TRANSCRIPT_EXPANSIONS,
} from "../lessons/aliases";

export type Verdict = "green" | "yellow" | "red";

export type PronunciationScore = { score: number; verdict: Verdict };

function normalize(text: string): string[] {
  let lowered = text.toLowerCase().replace(/ß/g, "ss");
  for (const [from, to] of Object.entries(TRANSCRIPT_EXPANSIONS)) {
    lowered = lowered.replace(new RegExp(`\\b${from}\\b`, "g"), to);
  }
  return lowered
    .replace(/[''‐-‒–—―-]/g, " ")
    .replace(/[^a-z0-9äöü\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => TRANSCRIPT_ALIASES[word] ?? word);
}

// v1 comparison: share of reference words matched in position. Deterministic;
// the thresholds below are the product contract from the lesson spec.
export function scoreTranscript(
  reference: string,
  transcript: string,
): PronunciationScore {
  const refWords = normalize(reference);
  const saidWords = normalize(transcript);
  const matches = refWords.filter((word, i) => saidWords[i] === word).length;
  const score =
    refWords.length === 0
      ? 0
      : Math.round((100 * matches) / refWords.length);
  const verdict: Verdict = score >= 85 ? "green" : score >= 60 ? "yellow" : "red";
  return { score, verdict };
}
