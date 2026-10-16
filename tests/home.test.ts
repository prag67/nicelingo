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
    expect(html).toContain("Every lesson $3/month or $29/year");
    expect(html).toContain('href="/billing"');
    expect(html).toContain("$3/month");
    expect(html).toContain('href="/developers"');
    // API list moved to /developers.
    expect(html).not.toContain("lesson manifest");
  });

  it("shows the English name only when it differs", async () => {
    const html = await (await app.request("/")).text();
    // One "English" per remaining language menu (account menu + footer); no duplicate sub-line.
    expect(html.split(">English<").length - 1).toBe(2);
    expect(html).toContain(">Xxian · 8 lessons<");
  });

  it("always shows the picker, even with a remembered language", async () => {
    for (const cookie of ["nl_lang=xx", "nl_lang=yy", "nl_lang=zz"]) {
      const res = await app.request("/", {
        headers: { Cookie: cookie },
      });
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("What do you want to learn?");
    }
  });

  it("?change=1 still shows the picker", async () => {
    const res = await app.request("/?change=1", {
      headers: { Cookie: "nl_lang=xx" },
    });
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("What do you want to learn?");
  });

  it("shows progress on the started card for returning learners", () => {
    const done = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const html = homePage({
      progress: {
        "xx-lesson-001": done,
        "xx-lesson-002": done,
        "xx-lesson-003": done,
        "xx-lesson-004": done,
      },
    });
    // One picker for everyone: the hero stays, the card carries progress.
    expect(html).toContain("Choose a language");
    expect(html).not.toContain("Keep going!");
    expect(html).toContain("4 of 8 lessons done");
    expect(html).toContain("Continue");
    expect(html).toContain('href="/xx"');
    // No duplicate English name on the cards either.
    expect(html).not.toContain("English · 8 lessons");
  });

  it("marks partially started cards as continuing", () => {
    const html = homePage({
      progress: { "xx-lesson-001": ["listen-match"] },
    });
    expect(html).toContain("Choose a language");
    expect(html).toContain("Continue");
    expect(html).toContain('href="/xx"');
  });

  it("hides the pricing band for subscribed users", () => {
    const html = homePage({ subscribed: true });
    expect(html).not.toContain("Every lesson $3/month or $29/year");
    expect(html).toContain("Choose a language");
  });
});

describe("fixed single-segment routes still resolve", () => {
  it("keeps /register, /billing, and /health away from /:lang", async () => {
    const register = await app.request("/register");
    expect(register.status).toBe(200);
    expect(await register.text()).toContain("Create your free account");
    const billing = await app.request("/billing");
    expect(billing.status).toBe(200);
    expect(await billing.text()).toContain("$3/month");
    const health = await app.request("/health");
    expect(health.status).toBe(200);
  });
});
