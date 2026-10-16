import { describe, expect, it } from "vitest";
import { badgeFor, completedUnits } from "../src/lib/badges";
import { computeStreak } from "../src/lib/streaks";
import { coursePage } from "../src/routes/course";

describe("computeStreak", () => {
  it("counts consecutive days ending today or yesterday", () => {
    expect(computeStreak(["2026-10-12", "2026-10-13", "2026-10-14"], "2026-10-14")).toEqual({ current: 3, longest: 3, activeToday: true });
    expect(computeStreak(["2026-10-12", "2026-10-13"], "2026-10-14")).toEqual({ current: 2, longest: 2, activeToday: false });
    expect(computeStreak(["2026-10-10"], "2026-10-14").current).toBe(0);
    expect(computeStreak([], "2026-10-14")).toEqual({ current: 0, longest: 0, activeToday: false });
  });
  it("tracks the longest run across gaps", () => {
    const days = ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05", "2026-10-06"];
    expect(computeStreak(days, "2026-10-06").longest).toBe(3);
  });
});

describe("unit badges", () => {
  it("awards tiers by completed units", () => {
    expect(badgeFor(0).earned).toBeNull();
    expect(badgeFor(1).earned?.units).toBe(1);
    expect(badgeFor(4).earned?.units).toBe(3);
    expect(badgeFor(4).next?.units).toBe(5);
    expect(badgeFor(60).earned?.units).toBe(60);
  });
  it("counts only fully completed units", () => {
    const acts = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const progress: Record<string, string[]> = {};
    for (const n of ["001", "002", "003", "004"]) progress[`xx-lesson-${n}`] = acts;
    progress["xx-lesson-005"] = ["listen-match"];
    expect(completedUnits("xx", progress)).toBe(1);
  });
  it("links the streak chip to the progress page; badges live there now", () => {
    const acts = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const progress: Record<string, string[]> = {};
    for (const n of ["001", "002", "003", "004"]) progress[`xx-lesson-${n}`] = acts;
    const today = new Date();
    const day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const html = coursePage("xx", { progress, registered: false, subscribed: false, paywallDisabled: false, user: null, streakDays: [day] });
    expect(html).toContain('data-streak href="/xx/progress"');
    expect(html).not.toContain("Next badge after");
  });
});
