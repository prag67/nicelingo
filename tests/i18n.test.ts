import { describe, expect, it } from "vitest";
import app from "../src/index";
import { localizeLessonTitle, localizeLevelTitle, localizeUnitTitle, t, uiLangFor } from "../src/lib/i18n";
import { homePage } from "../src/routes/home";
import { coursePage } from "../src/routes/course";

describe("UI language resolution", () => {
  it("prefers the cookie, then country, then English", () => {
    expect(uiLangFor({ cookie: "th", country: "GB" })).toBe("th");
    expect(uiLangFor({ cookie: null, country: "TH" })).toBe("th");
    expect(uiLangFor({ cookie: null, country: "CN" })).toBe("zh");
    expect(uiLangFor({ cookie: null, country: "GB" })).toBe("en");
    expect(uiLangFor({ cookie: null, country: "FI" })).toBe("en");
    expect(uiLangFor({ cookie: "xx", country: "TH" })).toBe("th");
  });

  it("has complete dictionaries for all six UI languages", () => {
    for (const lang of ["en", "es", "de", "fr", "th", "zh"] as const) {
      expect(t(lang).signIn.length).toBeGreaterThan(0);
      expect(t(lang).heroTitle.length).toBeGreaterThan(0);
    }
    expect(t("th").signIn).toBe("\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a");
    expect(t("zh").signIn).toBe("\u767b\u5f55");
    expect(t("th").heroTitle).toContain("\u0e2d\u0e22\u0e32\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19");
  });
});

describe("?ui= switcher", () => {
  it("stores the UI choice in a cookie and redirects back", async () => {
    const res = await app.request("/xx?ui=th");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("/xx");
    expect(res.headers.get("set-cookie")).toContain("nl_ui=th");
  });

  it("ignores invalid UI languages", async () => {
    const res = await app.request("/?change=1&ui=xx");
    expect(res.status).toBe(200);
  });
});

describe("localized rendering", () => {
  it("renders the picker in Thai when uiLang is th", () => {
    const html = homePage({ uiLang: "th" });
    expect(html).toContain('<html lang="th"');
    expect(html).toContain("\u0e04\u0e38\u0e13\u0e2d\u0e22\u0e32\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e2d\u0e30\u0e44\u0e23?");
    expect(html).toContain("\u0e40\u0e02\u0e49\u0e32\u0e2a\u0e39\u0e48\u0e23\u0e30\u0e1a\u0e1a".length > 0 ? "\u0e40\u0e25\u0e37\u0e2d\u0e01\u0e20\u0e32\u0e29\u0e32" : "");
    expect(html).toContain("account-menu");
    expect(html).toContain("foot-lang");
  });

  it("renders the picker in Chinese when uiLang is zh", () => {
    const html = homePage({ uiLang: "zh" });
    expect(html).toContain('<html lang="zh"');
    expect(html).toContain("\u4f60\u60f3\u5b66\u4ec0\u4e48？");
  });

  it("renders the course page in Thai", () => {
    const html = coursePage("xx", {
      progress: {},
      registered: false,
      subscribed: false,
      paywallDisabled: false,
      user: null,
      uiLang: "th",
    });
    expect(html).toContain("\u0e40\u0e23\u0e34\u0e48\u0e21\u0e17\u0e35\u0e48\u0e19\u0e35\u0e48");
    expect(html).toContain("account-menu");
    expect(html).toContain("foot-lang");
  });

  it("serves Thai UI from the nl_ui cookie end to end", async () => {
    const res = await app.request("/?change=1", {
      headers: { Cookie: "nl_ui=th" },
    });
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("\u0e04\u0e38\u0e13\u0e2d\u0e22\u0e32\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e2d\u0e30\u0e44\u0e23?");
  });

  it("localizes client-repainted progress labels via the page blob", () => {
    const th = coursePage("xx", {
      progress: {},
      registered: false,
      subscribed: false,
      paywallDisabled: false,
      user: null,
      uiLang: "th",
    });
    // The inline client script repaints these labels from blob.ui.
    expect(th).toContain('"stepsComplete"');
    expect(th).toContain(t("th").stepsComplete);
    const zh = homePage({ uiLang: "zh" });
    expect(zh).toContain('"lessonsDone"');
    expect(zh).toContain(t("zh").lessonsDone);
  });

  it("renders the Developers page in Thai and Chinese", async () => {
    const th = await (await app.request("/developers", { headers: { Cookie: "nl_ui=th" } })).text();
    expect(th).toContain('<html lang="th"');
    expect(th).toContain("\u0e19\u0e31\u0e01\u0e1e\u0e31\u0e12\u0e19\u0e32".length > 0 ? "\u0e2a\u0e16\u0e32\u0e19\u0e30\u0e1a\u0e23\u0e34\u0e01\u0e32\u0e23" : "");
    const zh = await (await app.request("/developers", { headers: { Cookie: "nl_ui=zh" } })).text();
    expect(zh).toContain('<html lang="zh"');
    expect(zh).toContain("\u670d\u52a1\u72b6\u6001");
  });

  it("localizes unit, level, and lesson titles by atoms", () => {
    expect(localizeUnitTitle("th", "First Words")).not.toBe("First Words");
    expect(localizeUnitTitle("th", "First Words").length).toBeGreaterThan(0);
    expect(localizeLessonTitle("th", "Eating & Drinking")).toContain("\u0e01\u0e34\u0e19");
    expect(localizeLessonTitle("zh", "Eating & Drinking")).toContain("\u5403");
    expect(localizeLessonTitle("th", "Animals Will Eat & Drink")).toContain("\u0e2a\u0e31\u0e15\u0e27\u0e4c");
    expect(localizeLevelTitle("th", "First Words (A1)")).toContain("\u0e04\u0e33\u0e41\u0e23\u0e01");
    expect(localizeLevelTitle("zh", "Getting Things Done (A2)")).not.toBe("Getting Things Done (A2)");
    expect(localizeUnitTitle("en", "First Words")).toBe("First Words");
    expect(localizeLessonTitle("xx" as never, "Eating & Drinking")).toBe("Eating & Drinking");
  });

  it("renders Go Premium, counts, and coming-soon in Thai on the course page", () => {
    const html = coursePage("xx", {
      progress: {}, registered: false, subscribed: false, paywallDisabled: false, user: null, uiLang: "th",
    });
    expect(html).toContain(t("th").goPremium);
    expect(html).not.toContain("Go Premium</a>");
    expect(html).not.toContain("Coming soon</span>");
  });

  it("defaults Thai visitors to a Thai interface on the picker", async () => {
    // ?change=1 keeps the picker; country TH should localize the UI.
    const res = await app.request("/?change=1", {
      headers: { "cf-ipcountry": "TH" },
    });
    const html = await res.text();
    expect(html).toContain("\u0e04\u0e38\u0e13\u0e2d\u0e22\u0e32\u0e01\u0e40\u0e23\u0e35\u0e22\u0e19\u0e2d\u0e30\u0e44\u0e23?");
  });
});
