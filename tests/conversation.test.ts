import { describe, expect, it } from "vitest";
import app from "../src/index";
import { conversations } from "../src/lessons/curriculum";
import { coursePage } from "../src/routes/course";

describe("conversation lessons (Phase 2)", () => {
  it("fake curriculum has one gibberish conversation per unit", () => {
    for (const unit of [1, 2]) {
      const scene = conversations[unit]?.xx;
      expect(scene).toBeTruthy();
      expect(scene!.lines.length).toBeGreaterThanOrEqual(4);
      expect(new Set(scene!.lines.map((l) => l.speaker)).size).toBe(2);
    }
  });

  it("serves the Unit 1 conversation scene shape", async () => {
    const res = await app.request("/api/conversation/xx/1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scene.unit).toBe(1);
    expect(body.scene.lines[0]).toMatchObject({ speaker: "A" });
  });

  it("404s an unknown conversation", async () => {
    const res = await app.request("/api/conversation/xx/99");
    expect(res.status).toBe(404);
  });

  it("course page shows a conversation banner after the photo lessons", () => {
    const html = coursePage("xx", {
      progress: {},
      registered: true,
      user: { email: "a@b.c", isAnonymous: false },
    });
    expect(html).toContain('href="/xx/conversation/1"');
    expect(html).toContain("conv-card");
  });
});
