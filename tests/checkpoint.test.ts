import { describe, expect, it } from "vitest";
import {
  applyAttempt,
  emptyStats,
  sortWeak,
} from "../src/lib/attempts";
import { buildCheckpointSet, checkpointAccess } from "../src/lib/checkpoint";

describe("phraseStats weak rules", () => {
  const at = "2026-10-17T00:00:00Z";
  it("marks weak on wrong or low speak, clears after two correct in a row", () => {
    let s = applyAttempt(undefined, { phraseId: "es-001-a", lang: "es", activity: "listen-match", correct: false, at });
    expect(s.weak).toBe(true);
    s = applyAttempt(s, { phraseId: "es-001-a", lang: "es", activity: "listen-match", correct: true, at });
    expect(s.weak).toBe(true); // one correct is not enough
    s = applyAttempt(s, { phraseId: "es-001-a", lang: "es", activity: "listen-match", correct: true, at });
    expect(s.weak).toBe(false);
    s = applyAttempt(s, { phraseId: "es-001-a", lang: "es", activity: "speak-score", correct: true, score: 65, at });
    expect(s.weak).toBe(true); // speak below 70 re-weaks
    expect(s.bestSpeakScore).toBe(65);
    s = applyAttempt(s, { phraseId: "es-001-a", lang: "es", activity: "speak-score", correct: true, score: 92, at });
    expect(s.bestSpeakScore).toBe(92);
  });

  it("sorts weakest first", () => {
    const a = { ...emptyStats("a", "es"), attempts: 4, correct: 2, bestSpeakScore: 50, lastSeenAt: "2026-10-10" };
    const b = { ...emptyStats("b", "es"), attempts: 2, correct: 0, bestSpeakScore: null, lastSeenAt: "2026-10-12" };
    expect(sortWeak([a, b]).map((x) => x.phraseId)).toEqual(["b", "a"]);
  });
});

describe("checkpoint set", () => {
  it("builds 10 questions, at least 2 per lesson, spec rotation", () => {
    let seed = 42;
    const rng = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    const built = buildCheckpointSet("xx", 1, 1, rng);
    expect(built).not.toBeNull();
    expect(built!.questions).toHaveLength(10);
    const ids = built!.questions.map((q) => q.phrase.id);
    expect(new Set(ids).size).toBe(10);
    for (const n of ["001", "002", "003", "004"]) {
      expect(ids.filter((id) => id.includes(`-${n}-`) || id.includes(`lesson-${n}`)).length).toBeGreaterThanOrEqual(2);
    }
    const counts: Record<string, number> = {};
    for (const q of built!.questions) counts[q.activity] = (counts[q.activity] ?? 0) + 1;
    expect(counts).toEqual({ "listen-match": 3, "image-phrase": 3, "speak-score": 1, "recall": 1, "read-write": 2 });
  });

  it("rejects a unit outside the level", () => {
    expect(buildCheckpointSet("xx", 2, 1)).toBeNull();
  });

  it("free access is Unit 1 only; subscribers get all", () => {
    expect(checkpointAccess({ level: 1, unit: 1, subscribed: false })).toBe(true);
    expect(checkpointAccess({ level: 1, unit: 2, subscribed: false })).toBe(false);
    expect(checkpointAccess({ level: 3, unit: 30, subscribed: true })).toBe(true);
    expect(checkpointAccess({ level: 3, unit: 30, subscribed: false, paywallDisabled: true })).toBe(true);
  });
});

describe("checkpoint routes and cards", () => {
  it("serves the checkpoint page only for a real level/unit pair", async () => {
    const { default: app } = await import("../src/index");
    expect((await app.request("/xx/checkpoint/1/1")).status).toBe(200);
    expect((await app.request("/xx/checkpoint/2/1")).status).toBe(404);
    expect((await app.request("/api/checkpoint/xx/1/1")).status).toBe(401);
  });

  it("course card locks until the unit is finished, then links; passed turns the badge to a check", async () => {
    const { coursePage } = await import("../src/routes/course");
    const acts = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const done: Record<string, string[]> = {};
    for (const n of ["001", "002", "003", "004"]) done[`xx-lesson-${n}`] = acts;
    const lockedHtml = coursePage("xx", { progress: {}, registered: false, paywallDisabled: true, user: null });
    expect(lockedHtml).toContain("Finish all 4 lessons to unlock");
    // The locked card is tagged so the course client can unlock it
    // once local progress is healed to the server (see below).
    expect(lockedHtml).toContain('data-cp-locked="1/1"');
    // Client heals device-only completions to /api/progress so the
    // server-side checkpoint gate agrees with the painted cards.
    expect(lockedHtml).toContain("Heal the server copy");
    const openHtml = coursePage("xx", { progress: done, registered: false, paywallDisabled: true, user: null, level: 1 });
    expect(openHtml).toContain('href="/xx/checkpoint/1/1"');
    const passedHtml = coursePage("xx", {
      progress: done,
      level: 1,
      registered: true,
      paywallDisabled: true,
      user: { email: "a@b.c", isAnonymous: false },
      milestones: [{ kind: "checkpoint", lang: "xx", level: 1, unit: 1, score: 9, passed: true, viaTestOut: false, completedAt: "2026-10-17" }],
    });
    expect(passedHtml).toContain("Checkpoint passed");
  });
});
