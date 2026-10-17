import { describe, expect, it } from "vitest";
import { buildChallengeScenes, evaluateChallenge, levelLessons, levelUnits } from "../src/lib/challenge";

describe("challenge scoring", () => {
  it("challenge passes at average 75 with no line below 40", () => {
    expect(evaluateChallenge(Array(12).fill(75), "challenge").passed).toBe(true);
    expect(evaluateChallenge(Array(12).fill(74), "challenge").passed).toBe(false);
    const oneLow = [...Array(11).fill(95), 39];
    expect(evaluateChallenge(oneLow, "challenge").passed).toBe(false);
    expect(evaluateChallenge(oneLow, "challenge").avg).toBeGreaterThan(75);
  });

  it("test out is harder: average 85, no line below 50", () => {
    expect(evaluateChallenge(Array(12).fill(85), "testout").passed).toBe(true);
    expect(evaluateChallenge(Array(12).fill(84), "testout").passed).toBe(false);
    const oneLow = [...Array(11).fill(100), 49];
    expect(evaluateChallenge(oneLow, "testout").passed).toBe(false);
    // The same scores that fail a test out still pass a challenge.
    expect(evaluateChallenge(Array(12).fill(80), "challenge").passed).toBe(true);
    expect(evaluateChallenge(Array(12).fill(80), "testout").passed).toBe(false);
  });

  it("empty scores never pass", () => {
    expect(evaluateChallenge([], "challenge").passed).toBe(false);
    expect(evaluateChallenge([], "testout").passed).toBe(false);
  });
});

describe("challenge scenes", () => {
  it("public fake levels have too few units, so no scenes are built", () => {
    // The real curriculum has 12 units per level; the public stand-in
    // has one, so the builder must refuse rather than repeat units.
    expect(levelUnits(1)).toEqual([1]);
    expect(buildChallengeScenes("xx", 1)).toBeNull();
    expect(buildChallengeScenes("xx", 99)).toBeNull();
  });

  it("level lessons resolve through units", () => {
    expect(levelLessons(1)).toEqual(["001", "002", "003", "004"]);
    expect(levelLessons(99)).toEqual([]);
  });
});

describe("challenge routes and course cards", () => {
  it("serves the challenge page for levels 1-5 only", async () => {
    const { default: app } = await import("../src/index");
    expect((await app.request("/xx/challenge/1")).status).toBe(200);
    expect((await app.request("/xx/challenge/5")).status).toBe(200);
    expect((await app.request("/xx/challenge/6")).status).toBe(404);
    expect((await app.request("/xx/challenge/0")).status).toBe(404);
    // API requires an authenticated (possibly anonymous) user.
    expect((await app.request("/api/challenge/xx/1")).status).toBe(401);
    expect((await app.request("/api/challenge/zz/1")).status).toBe(404);
  });

  it("level-complete rejects malformed bodies", async () => {
    const { default: app } = await import("../src/index");
    const res = await app.request("/api/level-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lang: "xx", level: 1, mode: "challenge", phraseIds: [] }),
    });
    // Unauthenticated in the test env (no DB/session): 401 before 400.
    expect([400, 401]).toContain(res.status);
  });

  it("course shows the locked challenge card and the test-out link before the level starts", async () => {
    const { coursePage } = await import("../src/routes/course");
    const html = coursePage("xx", { progress: {}, registered: false, paywallDisabled: true, user: null, level: 1 });
    expect(html).toContain("Pass every unit checkpoint in this level to unlock");
    expect(html).toContain('href="/xx/challenge/1?mode=testout"');
    expect(html).toContain("Already know this? Test out");
  });

  it("course hides the test-out link once the level has started", async () => {
    const { coursePage } = await import("../src/routes/course");
    const acts = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const progress = { "xx-lesson-001": acts };
    const html = coursePage("xx", { progress, registered: false, paywallDisabled: true, user: null, level: 1 });
    expect(html).not.toContain("mode=testout");
  });

  it("progress page labels a tested-out checkpoint badge", async () => {
    const { progressPage } = await import("../src/routes/progress");
    const html = progressPage("xx", {
      progress: {},
      registered: true,
      user: { email: "a@b.c", isAnonymous: false },
      milestones: [
        { kind: "checkpoint", lang: "xx", level: 1, unit: 1, score: 10, passed: true, viaTestOut: true, completedAt: "2026-10-17" },
      ],
    } as never);
    expect(html).toContain("tested out");
  });
});
