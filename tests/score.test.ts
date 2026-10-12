import { describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/transcribe", () => ({ transcribeAudio: vi.fn() }));

import app from "../src/index";
import { lessons } from "../src/lessons/curriculum";
import { judgePronunciation, sniffAudioMime } from "../src/lib/judge";
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

// Clef judges pronunciation from the audio directly; Whisper transcript
// scoring is the fallback when Clef is unavailable or fails.
describe("POST /api/score (Clef judging)", () => {
  function clefEnv(choice: string, pCorrect: number) {
    const run = vi.fn(async (_model: string, _body: unknown) => ({
      answers: { verdict: { choice, probabilities: { correct: pCorrect } } },
    }));
    return { AI: { run }, run };
  }

  function clefRequest(env: { AI: { run: unknown } }) {
    return app.request(
      "/api/score",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phraseId: "001-snarf-zorping", audio: "QUJD" }),
      },
      env,
    );
  }

  it("judges correct audio green without calling Whisper", async () => {
    mockedTranscribe.mockClear();
    const { AI } = clefEnv("correct", 0.7);
    const res = await clefRequest({ AI });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ score: 100, verdict: "green" });
    expect(mockedTranscribe).not.toHaveBeenCalled();
  });

  it("maps minor_slip to yellow", async () => {
    const { AI } = clefEnv("minor_slip", 0.3);
    const res = await clefRequest({ AI });
    expect(await res.json()).toEqual({ score: 70, verdict: "yellow" });
  });

  it("maps low-confidence correct to yellow", async () => {
    const { AI } = clefEnv("correct", 0.35);
    const res = await clefRequest({ AI });
    expect(await res.json()).toEqual({ score: 70, verdict: "yellow" });
  });

  it("maps wrong to red", async () => {
    const { AI } = clefEnv("wrong", 0.05);
    const res = await clefRequest({ AI });
    expect(await res.json()).toEqual({ score: 0, verdict: "red" });
  });

  it("falls back to Whisper scoring when Clef errors", async () => {
    const run = vi.fn(async () => {
      throw new Error("clef down");
    });
    mockedTranscribe.mockResolvedValueOnce("The snarf is zorping.");
    const res = await clefRequest({ AI: { run } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ score: 100, verdict: "green" });
    expect(mockedTranscribe).toHaveBeenCalledWith(
      expect.anything(),
      "QUJD",
      "en",
    );
  });

  it("falls back to Whisper scoring on a malformed Clef response", async () => {
    const run = vi.fn(async () => ({}));
    mockedTranscribe.mockResolvedValueOnce("hello world");
    const res = await clefRequest({ AI: { run } });
    expect(await res.json()).toEqual({ score: 0, verdict: "red" });
  });

  it("accepts the REST-wrapped Clef response shape", async () => {
    const run = vi.fn(async () => ({
      result: {
        answers: { verdict: { choice: "correct", probabilities: { correct: 0.8 } } },
      },
    }));
    const res = await clefRequest({ AI: { run } });
    expect(await res.json()).toEqual({ score: 100, verdict: "green" });
  });
});

describe("judgePronunciation", () => {
  it("gives Thai judges both the script and the romanization", async () => {
    const capture: { body?: any } = {};
    const run = vi.fn(async (_model: string, body: unknown) => {
      capture.body = body;
      return { answers: { verdict: { choice: "wrong", probabilities: {} } } };
    });
    // Synthetic script token as escapes: the public tree must stay
    // ASCII-only (CI leak test), so no literal Thai/Han here. Real
    // lesson phrases exercise this path in the content repo's suite.
    await judgePronunciation(
      { AI: { run } },
      "QUJD",
      "\u0E01\u0E02\u0E04\u0E07",
      "synthetic-roman",
      "th",
    );
    const state = capture.body.state as string;
    expect(state).toContain("\u0E01\u0E02\u0E04\u0E07");
    expect(state).toContain("synthetic-roman");
  });

  it("returns null without an AI binding", async () => {
    await expect(
      judgePronunciation(undefined, "QUJD", "the snarf is zorping", null, "en"),
    ).resolves.toBeNull();
  });
});

describe("sniffAudioMime", () => {
  it("labels webm, mp4, ogg, and mp3 bytes; defaults to webm", () => {
    // EBML header, ftyp box, OggS magic, ID3 tag.
    expect(sniffAudioMime("GkXfo59ChoEBQ8AAAAA")).toBe("audio/webm");
    expect(sniffAudioMime("AAAAGGZ0eXBtcDQy")).toBe("audio/mp4");
    expect(sniffAudioMime("T2dnUwACAAAAAAC")).toBe("audio/ogg");
    expect(sniffAudioMime("SUQzAwAAAAAA")).toBe("audio/mpeg");
    expect(sniffAudioMime("QUJD")).toBe("audio/webm");
  });
});
