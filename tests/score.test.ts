import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/transcribe", () => ({ transcribeAudio: vi.fn() }));

import app from "../src/index";
import { lessons } from "../src/lessons/curriculum";
import { scoreTranscript } from "../src/lib/scoring";
import { transcribeAudio } from "../src/lib/transcribe";

// NOTE: fake curriculum + gibberish aliases. Scoring mechanism only;
// real-word alias/scoring fixtures live in the content repo's suite.
const mockedTranscribe = vi.mocked(transcribeAudio);

/** Reference text for a phrase id, mirroring the route's lookup. */
function ref(phraseId: string): string {
  const phrase = Object.values(lessons)
    .flatMap((langs) => Object.values(langs))
    .flatMap((m) => m?.phrases ?? [])
    .find((p) => p.id === phraseId);
  if (!phrase) throw new Error(`unknown phrase ${phraseId}`);
  return phrase.scoreText ?? phrase.text;
}

function scoreRequest(transcript: string) {
  mockedTranscribe.mockResolvedValueOnce(transcript);
  return app.request("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phraseId: "001-snarf-zorping", audio: "QUJD" }),
  });
}

describe("POST /api/score", () => {
  it("maps transcripts to green/yellow/red verdicts", async () => {
    let res = await scoreRequest("The snarf is zorping.");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ score: 100, verdict: "green" });

    res = await scoreRequest("The snarf is quuxing.");
    expect(await res.json()).toEqual({ score: 75, verdict: "yellow" });

    res = await scoreRequest("hello world");
    expect(await res.json()).toEqual({ score: 0, verdict: "red" });
  });

  it("forgives systematic Whisper mishearings via aliases", async () => {
    const green = { score: 100, verdict: "green" };
    expect(
      scoreTranscript(ref("001-wug-zorping"), "The zug is zorping."),
    ).toEqual(green);
    expect(
      scoreTranscript(ref("001-blarg-quuxing"), "The blorg is quuxing."),
    ).toEqual(green);
    // Multi-word expansions apply pre-tokenize.
    expect(scoreTranscript("wug wug zorping", "wugwug zorping")).toEqual(
      green,
    );
  });

  it("scores xx phrases against the xx manifest", async () => {
    mockedTranscribe.mockResolvedValueOnce("Xx xx-wug xx-zorping.");
    const res = await app.request("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: "xx-001-wug-zorping", audio: "QUJD" }),
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ score: 100, verdict: "green" });
  });

  it("preserves umlauts and folds ß in normalization", async () => {
    // Umlauts are preserved (not stripped): mismatched umlauts fail.
    expect(scoreTranscript("wug zörping", "wug zörping")).toEqual({
      score: 100,
      verdict: "green",
    });
    expect(scoreTranscript("wug zörping", "wug zorping")).toEqual({
      score: 50,
      verdict: "red",
    });
    // ß matches ss-spelling symmetrically.
    expect(scoreTranscript("wug strasse", "wug straße")).toEqual({
      score: 100,
      verdict: "green",
    });
  });

  it("gates paid-lesson phrases behind session + subscription", async () => {
    const res = await app.request("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: "005-wug-zorping", audio: "QUJD" }),
    });
    expect(res.status).toBe(401);
  });

  it("passes the phrase language to transcription", async () => {
    mockedTranscribe.mockResolvedValueOnce("Xx xx-wug xx-zorping.");
    await app.request("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: "xx-001-wug-zorping", audio: "QUJD" }),
    });
    expect(mockedTranscribe).toHaveBeenLastCalledWith(undefined, "QUJD", "en");

    mockedTranscribe.mockResolvedValueOnce("The snarf is zorping.");
    await app.request("/api/score", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: "001-snarf-zorping", audio: "QUJD" }),
    });
    expect(mockedTranscribe).toHaveBeenLastCalledWith(undefined, "QUJD", "en");
  });
});
