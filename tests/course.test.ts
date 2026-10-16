import { describe, expect, it } from "vitest";
import app from "../src/index";
import { coursePage } from "../src/routes/course";
import {
  countDoneLessons,
  hasStarted,
  levelStats,
  nextLesson,
  progressKey,
  unitStats,
} from "../src/lib/lesson-progress";

// NOTE: fake curriculum (en/xx complete 8 lessons, yy partial 001-004).
const GUEST = {
  progress: {},
  registered: false,
  subscribed: false,
  paywallDisabled: true,
  user: null,
} as const;

function cardCount(html: string): number {
  return html.split('class="lcard"').length - 1;
}

describe("GET /{lang} (course home)", () => {
  it("serves Xxian with continue card, tabs, and 4 lessons", async () => {
    const res = await app.request("/xx");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    // Top bar: parrot (links to the picker), premium, account menu.
    expect(html).toContain('data-logo="parrot"');
    expect(html).toContain('class="brand" href="/"');
    expect(html).not.toContain("course-chip");
    expect(html).not.toContain("course-switch");
    expect(html).toContain("Go Premium");
    expect(html).toContain("Sign in");
    expect(html).toContain("account-menu");
    expect(html).toContain("foot-lang");
    // Continue card: the one-tap path from / for a new learner.
    expect(html).toContain("Start here · Free");
    expect(html).toContain("Lesson 1 · Zorping &amp; Quuxing");
    expect(html).toContain("Start lesson 1 →");
    expect(html).toContain('href="/lesson/xx/001"');
    expect(html).toContain("Unit 1 · Wug Words");
    // Level tabs with counts, level 1 selected.
    expect(html).toContain("1 Wugginner");
    expect(html).toContain("0/4");
    expect(html).toContain("2 Blargary");
    expect(html).toContain('aria-current="page"');
    // Only the selected level renders: at most 4 lessons.
    expect(html).toContain("Unit 1 · Wug Words");
    expect(html).not.toContain("Unit 2 · Zorp Zone");
    expect(html).not.toContain('id="u2"');
    expect(cardCount(html)).toBe(4);
    // Unit header counts and segment bars carry text labels.
    expect(html).toContain("0 of 4 lessons done");
    expect(html).toContain("0 of 4 steps complete");
    // Step pills, unit badges cycling registry tile colors, thumbnails.
    expect(html).toContain("1 Listen");
    expect(html).toContain('class="ubadge" style="--tile:#8CC8FF">1<');
    expect(html).toContain("/static/lesson-001/images/thumb.jpg");
    expect(html).toContain("Free account");
    expect(html).toContain('href="/developers"');
    expect(html).toContain('href="/terms"');
    expect(html).toContain('href="/contact"');
    // Anonymous nudge near the continue card.
    expect(html).toContain("Your progress is saved on this device only.");
  });

  it("remembers the language in a cookie", async () => {
    const res = await app.request("/xx");
    expect(res.headers.get("set-cookie")).toContain("nl_lang=xx");
  });

  it("deep-links levels with ?level=", async () => {
    const res = await app.request("/xx?level=2");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Unit 2 · Zorp Zone");
    // (The continue card still names Unit 1 — it follows nextLesson,
    // not the selected tab — so assert on the unit sections instead.)
    expect(html).toContain('id="u2"');
    expect(html).not.toContain('id="u1"');
    expect(html).toContain('href="/xx?level=2" aria-current="page"');
    expect(cardCount(html)).toBe(4);
  });

  it("ignores out-of-range ?level=", async () => {
    const res = await app.request("/xx?level=9");
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Unit 1 · Wug Words");
  });

  it("shows partial Yyan Level 1 with rest coming soon", async () => {
    const res = await app.request("/yy");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Yyish");
    expect(html).toContain("1 Wugginner");
    expect(html).toContain("2 Blargary · Coming soon");
    expect(html).toContain('data-total="4"');
    expect(html).toContain("0 of 4 steps complete");
    expect(html).toContain('href="/lesson/yy/001"');
    expect(cardCount(html)).toBe(4);
  });

  it("falls back to Level 1 for ?level= on a partial course", async () => {
    const res = await app.request("/yy?level=2");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Unit 1 · Wug Words");
    expect(html).toContain('href="/yy?level=1" aria-current="page"');
  });

  it("404s unknown languages", async () => {
    expect((await app.request("/zz")).status).toBe(404);
  });

  it("shows no language codes in the top bar", async () => {
    const html = await (await app.request("/xx")).text();
    for (const code of ["en", "xx", "yy"]) {
      expect(html).not.toContain(`>${code}<`);
    }
  });

  it("keeps the mobile header to one sticky row with premium + UI langs in the account menu", async () => {
    const html = await (await app.request("/xx")).text();
    // No language chip: the parrot links to the picker instead.
    expect(html).toContain('class="brand" href="/"');
    expect(html).not.toContain("course-chip");
    // No premium button in the header; the menu carries Go Premium first.
    expect(html).not.toContain("head-prem");
    const menu = html.slice(html.indexOf("account-menu"));
    expect(menu.indexOf("Go Premium")).toBeLessThan(menu.indexOf("Sign in"));
    expect(menu).toContain("Interface language");
    // Interface picker also lives in the footer.
    expect(html).toContain("foot-lang");
  });
});

describe("coursePage locking and subscription states", () => {
  const locked = { ...GUEST, paywallDisabled: false };

  it("locks lessons beyond Unit 1 for guests", () => {
    // Level 1 is the open unit; Level 2 holds the account-gated lessons.
    const free = coursePage("xx", locked);
    expect(free).toContain("lbadge free");
    // Unit 1 (lessons 1-4) stays open: four free badges, four open links.
    expect(free.split("lbadge free").length - 1).toBe(4);
    for (const n of ["001", "002", "003", "004"]) {
      expect(free).toContain(`href="/lesson/xx/${n}"`);
    }
    const gated = coursePage("xx", { ...locked, level: 2 });
    expect(gated).toContain('class="lcard" href="/billing?return=');
    expect(gated).toContain("lbadge premium");
    expect(gated).toContain("<strong>Premium</strong>");
    // Upgrade strip appears exactly once.
    expect(gated.split("Premium opens every lesson").length - 1).toBe(1);
    // Continue points at the paywall once Unit 1 is done.
    const done = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const continued = coursePage("xx", {
      ...locked,
      progress: {
        "xx-lesson-001": done,
        "xx-lesson-002": done,
        "xx-lesson-003": done,
        "xx-lesson-004": done,
      },
    });
    expect(continued).toContain("Nice work! Next up");
    expect(continued).toContain("Unlock every lesson");
    expect(continued).toContain("You finished the free unit.");
    expect(continued).toContain("Premium opens every Xxian lesson");
    expect(continued).toContain("$3/month");
    expect(continued).toContain("$29/year");
    // ...and the strip hides (the Continue card is the upgrade prompt).
    expect(continued.split("Premium opens every Xxian lesson for").length - 1).toBe(1);
  });

  it("unlocks everything for subscribed users", () => {
    const html = coursePage("xx", {
      ...locked,
      registered: true,
      subscribed: true,
      user: { email: "a@b.c", isAnonymous: false },
    });
    expect(html).not.toContain("lbadge premium");
    expect(html).not.toContain("Premium opens every lesson");
    expect(html).toContain('aria-label="Account"');
    expect(html).not.toContain("saved on this device");
  });

  it("keeps paid lessons locked for registered users without a subscription", () => {
    const html = coursePage("xx", {
      ...locked,
      level: 2,
      registered: true,
      subscribed: false,
      user: { email: "a@b.c", isAnonymous: false },
    });
    expect(html).toContain("lbadge premium");
    expect(html).toContain('class="lcard" href="/billing?return=');
  });

  it("marks done lessons and resumes partial ones", () => {
    const html = coursePage("xx", {
      ...GUEST,
      progress: {
        "xx-lesson-001": ["listen-match", "image-phrase", "speak-score", "read-write"],
        "xx-lesson-002": ["listen-match", "image-phrase"],
      },
    });
    expect(html).toContain("4 of 4 steps complete");
    expect(html).toContain("lbadge done");
    expect(html).toContain("Done</strong>");
    expect(html).toContain("2 of 4 steps complete");
    expect(html).toContain("Resume");
    expect(html).toContain("1 of 4 lessons done");
    expect(html).toContain("Resume lesson 2");
    // The in-progress card gets the ink border.
    expect(html).toContain('class="lcard now"');
  });

  it("cheers subscribed users on with done/next step pills", () => {
    const html = coursePage("xx", {
      ...locked,
      registered: true,
      subscribed: true,
      user: { email: "a@b.c", isAnonymous: false },
      progress: {
        "xx-lesson-001": ["listen-match", "image-phrase", "speak-score", "read-write"],
        "xx-lesson-002": ["listen-match", "image-phrase", "speak-score", "read-write"],
        "xx-lesson-003": ["listen-match", "image-phrase"],
      },
    });
    expect(html).toContain("Keep going!");
    expect(html).toContain("Lesson 3 · Snarfling &amp; Plughing");
    expect(html).toContain("Resume lesson 3");
    expect(html).toContain("1 Listen · done");
    expect(html).toContain("3 Speak · next");
  });

  it("suggests review when the course is finished", () => {
    const acts = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const progress: Record<string, string[]> = {};
    for (let i = 1; i <= 8; i++) {
      progress[`xx-lesson-${String(i).padStart(3, "0")}`] = acts;
    }
    const html = coursePage("xx", { ...GUEST, progress });
    expect(html).toContain("Course complete");
    expect(html).toContain("Review lesson 8");
  });

  it("throws for unknown languages", () => {
    expect(() => coursePage("zz", GUEST)).toThrow("unknown course language");
  });
});

describe("lesson-progress helpers", () => {
  it("builds progress keys per language", () => {
    expect(progressKey("en", "001")).toBe("lesson-001");
    expect(progressKey("xx", "001")).toBe("xx-lesson-001");
    expect(progressKey("yy", "004")).toBe("yy-lesson-004");
  });

  it("finds the next unfinished lesson", () => {
    expect(nextLesson("xx", {}).n).toBe("001");
    expect(
      nextLesson("xx", {
        "xx-lesson-001": ["listen-match", "image-phrase", "speak-score", "read-write"],
      }).n,
    ).toBe("002");
    // Partial progress keeps the lesson current.
    const partial = nextLesson("xx", { "xx-lesson-001": ["listen-match"] });
    expect(partial.n).toBe("001");
    expect(partial.done).toBe(1);
    expect(partial.total).toBe(4);
  });

  it("counts stats per level, unit, and language", () => {
    const progress = {
      "xx-lesson-001": ["listen-match", "image-phrase", "speak-score", "read-write"],
    };
    expect(levelStats("xx", 1, progress)).toEqual({ done: 1, total: 4 });
    expect(levelStats("xx", 2, progress)).toEqual({ done: 0, total: 4 });
    expect(levelStats("yy", 2, progress)).toEqual({ done: 0, total: 0 });
    expect(unitStats("xx", 1, progress)).toEqual({ done: 1, total: 4 });
    expect(countDoneLessons("xx", progress)).toBe(1);
    expect(countDoneLessons("yy", progress)).toBe(0);
    expect(hasStarted("xx", progress)).toBe(true);
    expect(hasStarted("yy", progress)).toBe(false);
  });
});
