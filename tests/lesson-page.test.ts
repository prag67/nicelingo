import { describe, expect, it } from "vitest";
import app from "../src/index";

describe("GET /lesson/01", () => {
  it("serves the lesson player page", async () => {
    const res = await app.request("/lesson/01");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("/app/player.js");
    expect(html).toContain("/app/lesson.css");
    expect(html).toContain('id="app"');
    expect(html).toContain("<noscript>");
    expect(html).toContain('rel="icon"');
    expect(html).toContain('tabindex="-1"');
  });

  it("serves the player for Xxian and 404s unknown langs", async () => {
    const xx = await app.request("/lesson/xx/001");
    expect(xx.status).toBe(200);
    expect(await xx.text()).toContain("/app/player.js");
    const bad = await app.request("/lesson/zz/001");
    expect(bad.status).toBe(404);
  });

  it("serves the player for Yyan with matching html lang", async () => {
    const yy = await app.request("/lesson/yy/001");
    expect(yy.status).toBe(200);
    expect(await yy.text()).toContain('<html lang="yy">');
  });
});
