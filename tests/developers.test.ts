import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("GET /developers", () => {
  it("holds the API endpoint list", async () => {
    const res = await app.request("/developers");
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("lesson manifest");
    expect(html).toContain("/api/lessons/:lang/:lesson");
    expect(html).toContain("POST /api/score");
    expect(html).toContain('href="/"');
  });

  it("serves the Poolside skin with wired icons", async () => {
    const html = await (await app.request("/developers")).text();
    expect(html).toContain("#1247b8");
    expect(html).toContain('href="/logo/favicon.svg"');
    expect(html).toContain('content="#1a5feb"');
    expect(html.toLowerCase()).not.toContain("0e7c6b");
  });
});
