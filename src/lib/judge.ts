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
): Promise<PronunciationScore | null> {
  try {
    if (!env?.AI) return null;
    const scriptLabel = lang === "th" ? "Thai script" : "Han characters";
    const refLine =
      roman == null
        ? `Reference sentence: ${reference}`
        : `Reference sentence (${scriptLabel}): ${reference}\nSame sentence romanized: ${roman}`;
    const raw = await env.AI.run(CLEF_MODEL, {
      model: "clef-omni",
      state: `${refLine}\nThe attached audio is a language learner attempting to say the reference sentence.`,
      questions: {
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
    const verdict = (
      root as {
        answers?: { verdict?: { choice?: unknown; probabilities?: unknown } };
      }
    )?.answers?.verdict;
    const choice = verdict?.choice;
    const pCorrect = Number(
      (verdict?.probabilities as { correct?: unknown } | undefined)?.correct,
    );
    if (choice === "wrong") return { score: 0, verdict: "red" };
    if (choice === "minor_slip") return { score: 70, verdict: "yellow" };
    // Scores stay inside the 85/60 contract bands the client was built
    // on (it renders the verdict; the number is informational).
    if (choice === "correct") {
      return Number.isFinite(pCorrect) && pCorrect >= 0.4
        ? { score: 100, verdict: "green" }
        : { score: 70, verdict: "yellow" };
    }
    return null;
  } catch {
    return null;
  }
}
