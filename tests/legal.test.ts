import { describe, expect, it } from "vitest";
import app from "../src/index";
import { coursePage } from "../src/routes/course";
import { homePage } from "../src/routes/home";

function footerOf(html: string): string {
  const start = html.indexOf("<footer");
  const end = html.indexOf("</footer>");
  expect(start).toBeGreaterThan(-1);
  return html.slice(start, end);
}

describe("GET /terms, /privacy, /refunds, /contact", () => {
  it("serves all four pages with content and no dead links", async () => {
    for (const [path, heading] of [
      ["/terms", "Terms"],
      ["/privacy", "Privacy"],
      ["/refunds", "Refunds"],
      ["/contact", "Help and contact"],
    ]) {
      const res = await app.request(path);
      expect(res.status).toBe(200);
      const html = await res.text();
      expect(html).toContain(`<h1>${heading}</h1>`);
    }
    const contact = await (await app.request("/contact")).text();
    expect(contact).toContain("support@nicelingo.com");
    const refunds = await (await app.request("/refunds")).text();
    expect(refunds).toContain("non-refundable");
    expect(refunds).toContain("support@nicelingo.com");
  });
});

describe("shared footer", () => {
  it("stacks brand, link grid, language control, and legal line", async () => {
    const html = await (await app.request("/")).text();
    const foot = footerOf(html);
    expect(foot).toContain("foot-brand");
    expect(foot).toContain("See it. Hear it. Say it.");
    // Two-column link grid: Premium/Free/Help left, legal right.
    expect(foot).toContain('href="/billing"');
    expect(foot).toContain("Free account");
    expect(foot).toContain('href="/contact"');
    for (const href of ['href="/terms"', 'href="/privacy"', 'href="/refunds"', 'href="/developers"']) {
      expect(foot).toContain(href);
    }
    expect(foot).toContain("Payments by Stripe");
  });

  it("offers one app-language control with six scripted options", async () => {
    const html = await (await app.request("/")).text();
    const foot = footerOf(html);
    expect(foot).toContain("App language");
    expect(foot).toContain("English ▾");
    // Six ?ui= options, each in its own script with a lang attribute,
    // current marked — and no flags or country codes anywhere.
    for (const [code, name] of [
      ["en", "English"],
      ["es", "Español"],
      ["de", "Deutsch"],
      ["fr", "Français"],
    ]) {
      expect(foot).toContain(`lang="${code}"`);
      expect(foot).toContain(`/?ui=${code}`);
      expect(foot).toContain(`>${name}</a>`);
    }
    expect(foot).toContain('aria-current="true"');
    expect(foot).not.toContain("lang-flag");
    expect(foot).not.toContain("🌐");
    expect(foot).not.toContain("🇬🇧");
  });

  it("carries no buttons — the upgrade band above owns Premium", async () => {
    for (const path of ["/", "/xx"]) {
      const foot = footerOf(await (await app.request(path)).text());
      expect(foot).not.toContain("btn-prem");
      expect(foot).not.toContain("See plans");
      expect(foot).not.toContain("Go Premium</a>");
    }
  });

  it("hides Free account once registered", () => {
    const guest = footerOf(homePage({}));
    expect(guest).toContain("Free account");
    const user = { email: "a@b.c", isAnonymous: false };
    const signedIn = footerOf(
      coursePage("xx", {
        progress: {},
        registered: true,
        subscribed: true,
        paywallDisabled: true,
        user,
      }),
    );
    expect(signedIn).not.toContain("Free account");
    expect(signedIn).toContain("Developers");
  });
});
