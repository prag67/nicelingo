// Clef pronunciation judging for /api/score. Clef hears the learner audio
// directly and picks correct/minor_slip/wrong against the reference
// sentence; Whisper transcript scoring is the fallback when Clef is
// unavailable, errors, or answers outside the rubric.
//
// Calibration comes from a 133-clip TTS eval (Thai + Spanish, exact
// prompt below): Clef chose right on 131/133 where Whisper + the
// 85/60 thresholds managed 116/133. True negatives never scored
// p(correct) above 0.38, so correct-under-0.4 demotes to yellow —
// that mapping goes 133/133 on the eval data with zero false greens.
import type { PronunciationScore } from "./scoring";

export type JudgedScore = PronunciationScore & {
  source: "clef";
  /** Clef's p(wrong) for this attempt (null when not reported). */
  wrongProb: number | null;
  /** Per-word marks when Clef returned them (Phase 3a). Hints only:
   * never part of pass rules. Absent for romanized (th/zh) judging. */
  words?: { text: string; mark: "ok" | "slip" | "wrong" }[];
};

const CLEF_MODEL = "@cf/cloudflare/clef-omni";

// Learner audio arrives as bare base64 (MediaRecorder output, usually
// webm/opus, mp4 on Safari) but Clef wants a data URL, so sniff the
// container magic and label it. Unknown bytes default to webm, the
// client default.
export function sniffAudioMime(base64: string): string {
  let head = "";
  try {
    head = atob(base64.slice(0, 24));
  } catch {
    return "audio/webm";
  }
  const bytes = [...head].map((ch) => ch.charCodeAt(0));
  if (
    bytes[0] === 0x1a &&
    bytes[1] === 0x45 &&
    bytes[2] === 0xdf &&
    bytes[3] === 0xa3
  ) {
    return "audio/webm";
  }
  if (head.startsWith("OggS")) return "audio/ogg";
  if (head.slice(4, 8) === "ftyp") return "audio/mp4";
  if (head.startsWith("ID3")) return "audio/mpeg";
  if (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) return "audio/mpeg";
  return "audio/webm";
}

// Vocal-only languages (Thai, Mandarin) show romanization while scoring
// against the native script: pass `roman` so the judge sees both lines,
// exactly as evaluated. Returns null whenever Clef cannot judge.
export async function judgePronunciation(
  env: { AI: Ai } | undefined,
  audioBase64: string,
  reference: string,
  roman: string | null,
  lang: string,
): Promise<JudgedScore | null> {
  try {
    if (!env?.AI) return null;
    const scriptLabel = lang === "th" ? "Thai script" : "Han characters";
    const refLine =
      roman == null
        ? `Reference sentence: ${reference}`
        : `Reference sentence (${scriptLabel}): ${reference}\nSame sentence romanized: ${roman}`;
    const refWords = roman == null ? reference.split(/\s+/).map((w) => w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "")).filter(Boolean).slice(0, 12) : [];
    const wordQuestions: Record<string, unknown> = {};
    refWords.forEach((w, i) => {
      wordQuestions[`w${i + 1}`] = {
        type: "choice",
        instructions: `How did the learner say the word "${w}"? OK: said correctly. SLIP: slightly off but recognizable. WRONG: wrong word, badly off, or not said.`,
        criteria: { ok: "Word said correctly", slip: "Slightly off but recognizable", wrong: "Wrong word or not said" },
      };
    });
    const raw = await env.AI.run(CLEF_MODEL, {
      model: "clef-omni",
      state: `${refLine}\nThe attached audio is a language learner attempting to say the reference sentence.`,
      questions: {
        ...wordQuestions,
        verdict: {
          type: "choice",
          instructions:
            "Grade this pronunciation attempt. CORRECT: every word right, or accent variation only. " +
            "MINOR-SLIP: one sound, tone, or word slightly off but the sentence is recognizable and the meaning is intact. " +
            "WRONG: two or more errors, a different word, missing words, or a different sentence.",
          criteria: {
            correct: "Every word correct (accent variation allowed)",
            minor_slip:
              "One sound, tone, or word slightly off; sentence recognizable",
            wrong:
              "Two or more errors, a different word, or a different sentence",
          },
        },
      },
      audio: [`data:${sniffAudioMime(audioBase64)};base64,${audioBase64}`],
    });
    // Workers AI bindings return the result payload directly; the REST
    // API wraps it in { result }. Accept either shape.
    const root = (raw as { answers?: unknown }).answers
      ? raw
      : (raw as { result?: unknown }).result;
    const answers = (
      root as { answers?: Record<string, { choice?: unknown } | undefined> }
    )?.answers;
    const verdict = answers?.verdict as { choice?: unknown; probabilities?: unknown } | undefined;
    const words = refWords.length && answers && answers.w1
      ? refWords.map((text, i) => {
          const choice = answers[`w${i + 1}`]?.choice;
          return { text, mark: (choice === "wrong" || choice === "slip" ? choice : "ok") as "ok" | "slip" | "wrong" };
        })
      : undefined;
    const choice = verdict?.choice;
    const pCorrect = Number(
      (verdict?.probabilities as { correct?: unknown } | undefined)?.correct,
    );
    const pWrongRaw = Number(
      (verdict?.probabilities as { wrong?: unknown } | undefined)?.wrong,
    );
    const wrongProb = Number.isFinite(pWrongRaw) ? pWrongRaw : null;
    if (choice === "wrong") return { score: 0, verdict: "red", source: "clef", wrongProb, words };
    if (choice === "minor_slip") return { score: 70, verdict: "yellow", source: "clef", wrongProb, words };
    // Scores stay inside the 85/60 contract bands the client was built
    // on (it renders the verdict; the number is informational).
    // A missing confidence signal trusts the choice: the under-0.4
    // demotion was calibrated on eval responses that all carried
    // p(correct), and learners with good audio were stuck yellow
    // whenever Clef answered with a bare choice.
    if (choice === "correct") {
      if (!Number.isFinite(pCorrect)) {
        return { score: 100, verdict: "green", source: "clef", wrongProb, words };
      }
      return pCorrect >= 0.4
        ? { score: 100, verdict: "green", source: "clef", wrongProb, words }
        : { score: 70, verdict: "yellow", source: "clef", wrongProb, words };
    }
    return null;
  } catch {
    return null;
  }
}
