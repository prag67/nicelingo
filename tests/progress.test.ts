import { describe, expect, it } from "vitest";
import app from "../src/index";
import { lessons } from "../src/lessons/curriculum";
import { localDayString } from "../src/lib/streaks";
import { progressPage } from "../src/routes/progress";

const ACTS = ["listen-match", "image-phrase", "speak-score", "read-write"];

function unitOneDone(): Record<string, string[]> {
  const progress: Record<string, string[]> = {};
  for (const n of ["001", "002", "003", "004"]) progress[`xx-lesson-${n}`] = ACTS;
  return progress;
}

describe("GET /:lang/progress", () => {
  it("serves the page for a picker language and 404s otherwise", async () => {
    const res = await app.request("/xx/progress");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Your progress");
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect((await app.request("/zz/progress")).status).toBe(404);
  });

  it("stays out of the sitemap", async () => {
    const xml = await (await app.request("/sitemap.xml")).text();
    expect(xml).not.toContain("progress");
  });
});

describe("progressPage", () => {
  it("renders streak hero, 7-day strip, next badge, and badge grid", () => {
    const today = localDayString();
    const html = progressPage("xx", {
      progress: unitOneDone(),
      registered: true,
      user: { email: "a@b.c", isAnonymous: false },
      streakDays: [today],
    });
    expect(html).toContain("1-day streak");
    expect(html).toContain("Practiced today");
    expect((html.match(/class="dot on"/g) ?? []).length).toBe(1);
    expect((html.match(/class="dot/g) ?? []).length).toBe(7);
    // The badge line that used to sit on the course page.
    expect(html).toContain("Next badge after 2 more units");
    // One earned tier, the rest locked with how-to-earn text.
    expect((html.match(/badge-card earned/g) ?? []).length).toBe(1);
    expect((html.match(/badge-card locked/g) ?? []).length).toBe(8);
    expect(html).toContain("Finish 3 units to earn this badge");
    // Numbers: 4 lessons done, phrases from those finished lessons.
    const expectedPhrases = ["001", "002", "003", "004"].reduce(
      (sum, n) => sum + (lessons[n]?.xx?.phrases.length ?? 0),
      0,
    );
    expect(html).toContain(`<b>${expectedPhrases}</b>`);
  });

  it("warns when today is not practiced yet, and nudges anonymous streaks to sign in", () => {
    const yesterday = localDayString(new Date(Date.now() - 86400000));
    const html = progressPage("xx", {
      progress: unitOneDone(),
      registered: false,
      user: { email: null, isAnonymous: true },
      streakDays: [yesterday],
    });
    expect(html).toContain("Practice today to keep it going");
    expect(html).toContain("Sign in so you don't lose your 1-day streak");
  });
});
