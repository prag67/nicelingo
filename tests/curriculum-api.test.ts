import { describe, expect, it } from "vitest";
import app from "../src/index";

// NOTE: fake curriculum (2 levels, 2 units, 8 lessons).
describe("GET /api/curriculum", () => {
  it("returns levels, units, and lesson titles", async () => {
    const res = await app.request("/api/curriculum");
    expect(res.status).toBe(200);
    const { levels } = await res.json();
    expect(levels).toHaveLength(2);
    expect(levels[0].title).toBe("Wugginner");
    expect(levels[0].units).toHaveLength(1);
    expect(levels[1].title).toBe("Blargary");
    const lessons = levels.flatMap((l) => l.units.flatMap((u) => u.lessons));
    expect(lessons).toHaveLength(8);
    expect(lessons[0]).toEqual({ n: "001", title: "Zorping & Quuxing" });
    expect(lessons[4]).toEqual({ n: "005", title: "Quuxing & Zorping" });
  });
});

describe("GET /api/lessons/:lang/:lesson", () => {
  it("serves the free Unit 1 manifests without auth", async () => {
    const res = await app.request("/api/lessons/en/001");
    expect(res.status).toBe(200);
    const manifest = await res.json();
    expect(manifest.id).toBe("lesson-001");
    expect((await app.request("/api/lessons/en/004")).status).toBe(200);
  });

  it("requires a session for paid lesson manifests", async () => {
    expect((await app.request("/api/lessons/en/005")).status).toBe(401);
  });
});
