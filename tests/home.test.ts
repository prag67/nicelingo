import { describe, expect, it } from "vitest";
import app from "../src/index";
import { homePage } from "../src/routes/home";

// NOTE: fake curriculum (en/xx complete, yy partial, 8 lessons).
describe("GET / (language picker)", () => {
  it("serves one card per registry language, no lesson rows", async () => {
    const res = await app.request("/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("What do you want to learn?");
    expect(html).toContain("See it. Hear it. Say it.");
    // Parrot mark in the header + wired icon set.
    expect(html).toContain('data-logo="parrot"');
    expect(html).toContain('href="/logo/favicon.svg"');
    expect(html).toContain('href="/logo/favicon-32.png"');
    expect(html).toContain('href="/logo/apple-touch-icon.png"');
    // Greeting, own name, English name, counts from lesson data.
    for (const [code, greet, own, count] of [
      ["en", "Hello", "English", "8 lessons"],
      ["xx", "Xxalo!", "Xxish", "8 lessons"],
      ["yy", "Yyalo!", "Yyish", "4 lessons"],
    ]) {
      expect(html).toContain(`href="/${code}"`);
      expect(html).toContain(greet);
      expect(html).toContain(own);
      expect(html).toContain(count);
    }
    expect(html).toContain("Xxian · 8 lessons");
    // Tile colors come from the registry, one per language.
    expect(html).toContain('style="--tile:#8CC8FF"');
    expect(html).toContain('style="--tile:#FFB061"');
    expect(html).toContain('style="--tile:#7FE3C4"');
    // Partial course tagged.
    expect(html).toContain("Level 1 only");
    expect(html).toContain("Yyan");
    // No per-lesson rows on the picker.
    expect(html).not.toContain("/lesson/en/001");
    expect(html).not.toContain('class="lcard"');
    // Hero, steps, pricing band, footer links.
    expect(html).toContain("Choose a language");
    expect(html).toContain("Four steps in every lesson");
    expect(html).toContain("Unit 1 is free");
    expect(html).toContain("$3/month");
    expect(html).toContain("$29/year");
    expect(html).toContain("See plans");
    expect(html).toContain('href="/billing"');
    expect(html).toContain('href="/developers"');
    // API list moved to /developers.
    expect(html).not.toContain("lesson manifest");
  });

  it("shows the English name only when it differs", async () => {
    const html = await (await app.request("/")).text();
    // Exactly one "English": the own-name line. No duplicate beneath.
    expect(html.split(">English<").length - 1).toBe(1);
    expect(html).toContain(">Xxian · 8 lessons<");
  });

  it("forwards returning visitors to their last language", async () => {
    const res = await app.request("/", {
      headers: { Cookie: "nl_lang=xx" },
    });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/xx");
  });

  it("ignores unknown cookie langs, forwards partial languages too", async () => {
    const unknown = await app.request("/", {
      headers: { Cookie: "nl_lang=zz" },
    });
    expect(unknown.status).toBe(200);
    expect(await unknown.text()).toContain("What do you want to learn?");
    const partial = await app.request("/", {
      headers: { Cookie: "nl_lang=yy" },
    });
    expect(partial.status).toBe(302);
    expect(partial.headers.get("location")).toBe("/yy");
  });

  it("?change=1 always shows the picker", async () => {
    const res = await app.request("/?change=1", {
      headers: { Cookie: "nl_lang=xx" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("What do you want to learn?");
  });

  it("shows Keep going for returning learners", () => {
    const done = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const html = homePage({
      progress: {
        "xx-lesson-001": done,
        "xx-lesson-002": done,
        "xx-lesson-003": done,
        "xx-lesson-004": done,
      },
    });
    expect(html).toContain("Keep going!");
    expect(html).toContain("4 of 8 lessons done");
    expect(html).toContain("Or start another");
    // Next lesson is locked: the button falls back to the course home.
    expect(html).toContain("Continue lesson 5");
    expect(html).toContain('href="/xx"');
    expect(html).not.toContain("Choose a language");
    // No duplicate English name on the list rows either.
    expect(html).not.toContain("English · 8 lessons");
  });

  it("deep-links the open lesson from Keep going", () => {
    const html = homePage({
      progress: { "xx-lesson-001": ["listen-match"] },
    });
    expect(html).toContain("Continue lesson 1");
    expect(html).toContain('href="/lesson/xx/001"');
  });

  it("deep-links Unit 1 lessons past Lesson 1", () => {
    const html = homePage({
      progress: {
        "xx-lesson-001": ["listen-match", "image-phrase", "speak-score", "read-write"],
      },
    });
    expect(html).toContain("Continue lesson 2");
    expect(html).toContain('href="/lesson/xx/002"');
  });

  it("hides the pricing band for subscribers", () => {
    const html = homePage({ subscribed: true });
    expect(html).not.toContain("See plans");
    expect(html).toContain("Choose a language");
  });
});

describe("fixed single-segment routes still resolve", () => {
  it("keeps /billing and /health away from /:lang", async () => {
    const billing = await app.request("/billing");
    expect(billing.status).toBe(200);
    expect(await billing.text()).toContain("Nicelingo Premium");
    const health = await app.request("/health");
    expect(health.status).toBe(200);
  });
});
