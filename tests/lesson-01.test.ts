import { describe, expect, it } from "vitest";
import app from "../src/index";

// NOTE: fake curriculum (gibberish vocabulary).
describe("GET /api/lessons/01", () => {
  it("serves the 8-phrase manifest with activities in order", async () => {
    const res = await app.request("/api/lessons/01");
    expect(res.status).toBe(200);
    const manifest = await res.json();
    expect(manifest.phrases.map((p: { text: string }) => p.text)).toEqual([
      "The wug is zorping.",
      "The wug is quuxing.",
      "The blarg is zorping.",
      "The blarg is quuxing.",
      "The snarf is zorping.",
      "The snarf is quuxing.",
      "The plugh is zorping.",
      "The plugh is quuxing.",
    ]);
    for (const phrase of manifest.phrases) {
      expect(phrase.id).toBeTruthy();
      expect(phrase.audioUrl).toBeTruthy();
      expect(phrase.imageUrl).toBeTruthy();
    }
    expect(manifest.activities).toEqual([
      "listen-match",
      "image-phrase",
      "speak-score",
      "read-write",
    ]);
  });
});
