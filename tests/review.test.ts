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

  it("serves weakest first, openable only, with the missed activity", () => {
    const built = buildReviewSet({ lang: "xx", stats, subscribed: false });
    const ids = built.questions.map((q) => q.phrase.id);
    expect(ids).not.toContain(P("006", 0));
    expect(built.questions[0].activity).toBe("speak-score");
    expect(built.weakCount).toBe(4);
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

  it("course button appears only with at least 3 weak phrases", () => {
    const withWeak = coursePage("xx", {
      progress: {},
      registered: true,
      paywallDisabled: true,
      user: { email: "a@b.c", isAnonymous: false },
      weakCount: 5,
    });
    expect(withWeak).toContain("Practise my mistakes (5)");
    expect(withWeak).toContain('href="/xx/review"');
    const few = coursePage("xx", {
      progress: {},
      registered: true,
      paywallDisabled: true,
      user: { email: "a@b.c", isAnonymous: false },
      weakCount: 2,
    });
    expect(few).not.toContain("Practise my mistakes");
  });
});
