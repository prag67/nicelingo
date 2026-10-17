import { describe, expect, it } from "vitest";
import {
  REVIEW_INTERVALS,
  applyAttempt,
  effectiveDueAt,
  emptyStats,
  strengthOf,
} from "../src/lib/attempts";

const at = "2026-10-18T10:00:00.000Z";
const attempt = (correct: boolean, extra = {}) => ({
  phraseId: "xx-001-a",
  lang: "xx",
  activity: "listen-match",
  correct,
  score: null,
  at,
  ...extra,
});

describe("daily review schedule (Phase 1a)", () => {
  it("climbs 1, 3, 7, 14, 30, 60 days on correct answers, then stays", () => {
    let s = emptyStats("xx-001-a", "xx");
    const dues: string[] = [];
    for (let i = 0; i < 7; i++) {
      s = applyAttempt(s, attempt(true));
      dues.push(s.dueAt);
    }
    expect(dues).toEqual([
      "2026-10-19", "2026-10-21", "2026-10-25",
      "2026-11-01", "2026-11-17", "2026-12-17", "2026-12-17",
    ]);
    expect(s.reviewStep).toBe(REVIEW_INTERVALS.length);
  });

  it("a wrong answer or speak score under 70 resets to tomorrow and flags weak", () => {
    let s = applyAttempt(emptyStats("xx-001-a", "xx"), attempt(true));
    s = applyAttempt(s, attempt(true));
    s = applyAttempt(s, attempt(false));
    expect(s.reviewStep).toBe(0);
    expect(s.dueAt).toBe("2026-10-19");
    expect(s.weak).toBe(true);
    const spoken = applyAttempt(emptyStats("xx-001-a", "xx"), {
      ...attempt(true),
      activity: "speak-score",
      score: 65,
    });
    expect(spoken.reviewStep).toBe(0);
    expect(spoken.weak).toBe(true);
  });

  it("backfills legacy rows from lastSeenAt so existing learners are due", () => {
    const legacy = { ...emptyStats("xx-001-a", "xx"), lastSeenAt: "2026-10-01T00:00:00.000Z", dueAt: "" };
    expect(effectiveDueAt(legacy, "2026-10-18")).toBe("2026-10-02");
    const weak = { ...legacy, weak: true };
    expect(effectiveDueAt(weak, "2026-10-18")).toBe("2026-10-18");
  });

  it("counts recall with and without help separately", () => {
    let s = applyAttempt(emptyStats("xx-001-a", "xx"), {
      ...attempt(true), activity: "recall", score: 90,
    });
    expect(s.recallCorrect).toBe(1);
    s = applyAttempt(s, { ...attempt(true), activity: "recall", score: 90, helped: true });
    expect(s.recallWithHelp).toBe(1);
    expect(s.recallCorrect).toBe(1);
  });

  it("maps steps to gallery strength", () => {
    expect(strengthOf(0)).toBe("weak");
    expect(strengthOf(3)).toBe("learning");
    expect(strengthOf(6)).toBe("strong");
  });
});
