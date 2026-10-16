import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("crawler plumbing", () => {
  it("serves robots.txt pointing at the sitemap", async () => {
    const res = await app.request("/robots.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    const body = await res.text();
    expect(body).toContain("User-agent: *");
    expect(body).toContain("/sitemap.xml");
  });

  it("serves a sitemap of public pages, not private ones", async () => {
    const res = await app.request("/sitemap.xml");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    const xml = await res.text();
    for (const path of ["/", "/en", "/terms", "/privacy", "/refunds", "/contact", "/developers", "/billing"]) {
      expect(xml).toContain(`<loc>http://localhost${path}</loc>`);
    }
    expect(xml).not.toContain("/account");
    expect(xml).not.toContain("/sign-in");
    expect(xml).not.toContain("/lesson/");
  });
});

describe("head tags", () => {
  it("marks the picker canonical with hreflang, cards, and JSON-LD", async () => {
    const html = await (await app.request("/")).text();
    expect(html).toContain('<link rel="canonical" href="http://localhost/">');
    expect(html).toContain('hreflang="x-default"');
    for (const code of ["en", "es", "de", "fr", "th", "zh"]) {
      expect(html).toContain(`hreflang="${code}"`);
      expect(html).toContain(`/?ui=${code}`);
    }
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain('"@type":"Organization"');
  });

  it("marks course pages canonical per language", async () => {
    const html = await (await app.request("/xx")).text();
    expect(html).toContain('<link rel="canonical" href="http://localhost/xx">');
    expect(html).toContain('hreflang="th"');
  });

  it("keeps private pages out of indexes", async () => {
    for (const path of ["/sign-in", "/register"]) {
      const html = await (await app.request(path)).text();
      expect(html).toContain('<meta name="robots" content="noindex">');
    }
    // Signed-out /students and /account bounce to noindexed /sign-in.
    for (const path of ["/students", "/account"]) {
      const res = await app.request(path);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toContain("/sign-in");
    }
    const home = await (await app.request("/")).text();
    expect(home).not.toContain("noindex");
  });
});
