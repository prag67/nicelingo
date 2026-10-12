// Scoring for unspaced scripts (Thai, Han): word-position matching
// cannot work without word spaces, so compare by character similarity.
// Same 85/60 green/yellow contract as scoreTranscript.
//
// Lives in its own module (rather than extending scoring.ts) so the
// German audio grind touching scoring.ts stays conflict-free; a future
// merge may fold the branch into scoreTranscript.
import type { PronunciationScore } from "./scoring";

// Systematic unspaced-script mishearings, populated by closed-loop QA
// (empty until Thai/Mandarin QA finds them). Applied as substring
// replacements to the normalized transcript — word boundaries do not
// exist in these scripts, so \b-anchored aliases cannot work here.
const UNSPACED_ALIASES: Record<string, string> = {};

function normalizeUnspaced(text: string): string {
  let out = text
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F\u4E00-\u9FFF]/g, "");
  for (const [from, to] of Object.entries(UNSPACED_ALIASES)) {
    out = out.split(from).join(to);
  }
  return out;
}

function levenshtein(a: string, b: string): number {
  const s = [...a];
  const t = [...b];
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;
  let prev = Array.from({ length: t.length + 1 }, (_, i) => i);
  for (let i = 1; i <= s.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[t.length];
}

// Character similarity: 100 at identical, scaled by edit distance over
// the LONGER side so extra transcript junk is penalized too (a long
// ramble must not score green by containing the reference).
export function scoreUnspacedTranscript(
  reference: string,
  transcript: string,
): PronunciationScore {
  const ref = [...normalizeUnspaced(reference)];
  const hyp = [...normalizeUnspaced(transcript)];
  if (ref.length === 0) return { score: 0, verdict: "red" };
  const distance = levenshtein(ref.join(""), hyp.join(""));
  const score = Math.round(
    100 * (1 - distance / Math.max(ref.length, hyp.length)),
  );
  const verdict = score >= 85 ? "green" : score >= 60 ? "yellow" : "red";
  return { score, verdict };
}
