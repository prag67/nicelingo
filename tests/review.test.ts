import { describe, expect, it } from "vitest";
import app from "../src/index";
import { emptyStats, type PhraseStats } from "../src/lib/attempts";
import { buildReviewSet } from "../src/lib/review";
import { coursePage } from "../src/routes/course";

import { lessons } from "../src/lessons/curriculum";

const P = (n: string, i: number) => lessons[n].xx!.phrases[i].id;

function weak(id: string, extra: Partial<PhraseStats> = {}): PhraseStats {
  return {
    ...emptyStats(id, "xx"),
    attempts: 3,
    correct: 1,
    weak: true,
    lastActivity: "speak-score",
    lastSeenAt: "2026-10-10",
    ...extra,
  };
}

describe("buildReviewSet", () => {
  const stats = [
    weak(P("001", 0), { bestSpeakScore: 40 }),
    weak(P("001", 1), { bestSpeakScore: 90 }),
    weak(P("002", 0), { bestSpeakScore: null }),
    weak(P("006", 0), { bestSpeakScore: 10 }), // paid lesson
  ];

  it("serves due phrases, openable only, weak always due (daily review)", () => {
    const built = buildReviewSet({ lang: "xx", stats, subscribed: false, today: "2026-10-18" });
    const ids = built.questions.map((q) => q.phrase.id);
    expect(ids).not.toContain(P("006", 0));
    expect(built.weakCount).toBe(4);
    expect(built.dueCount).toBeGreaterThan(0);
    expect(built.questions.length).toBeLessThanOrEqual(12);
    // Daily rotation includes a recall round.
    expect(built.questions.some((q) => q.activity === "recall")).toBe(true);
  });

  it("serves nothing before phrases are due", () => {
    const fresh = stats.map((x) => ({ ...x, weak: false, dueAt: "2027-01-01", lastSeenAt: "2026-10-18T00:00:00.000Z" }));
    const built = buildReviewSet({ lang: "xx", stats: fresh, subscribed: false, today: "2026-10-18" });
    expect(built.questions).toHaveLength(0);
    expect(built.dueCount).toBe(0);
    expect(built.nextDueAt).toBe("2027-01-01");
  });

  it("subscribers may review paid lessons too", () => {
    const built = buildReviewSet({ lang: "xx", stats, subscribed: true });
    expect(built.questions.map((q) => q.phrase.id)).toContain(P("006", 0));
  });

  it("serves a given phrase set with fallback activities", () => {
    const built = buildReviewSet({
      lang: "xx",
      stats: [],
      subscribed: false,
      phraseIds: [P("001", 0), P("002", 0)],
    });
    expect(built.questions).toHaveLength(2);
    expect(built.questions[0].activity).toBe("listen-match");
  });
});

describe("review routes and course button", () => {
  it("serves the review page and guards the API", async () => {
    expect((await app.request("/xx/review")).status).toBe(200);
    expect((await app.request("/api/review/xx")).status).toBe(401);
    expect((await app.request("/api/review/zz")).status).toBe(404);
  });

  it("daily review strip appears only when phrases are due", () => {
    const withDue = coursePage("xx", {
      progress: {},
      registered: true,
      paywallDisabled: true,
      user: { email: "a@b.c", isAnonymous: false },
      reviewDue: 5,
    });
    expect(withDue).toContain("phrases to review");
    expect(withDue).toContain('href="/xx/review"');
    expect(withDue).not.toContain("Practise my mistakes");
    const none = coursePage("xx", {
      progress: {},
      registered: true,
      paywallDisabled: true,
      user: { email: "a@b.c", isAnonymous: false },
      reviewDue: 0,
    });
    expect(none).not.toContain("phrases to review");
  });
});
