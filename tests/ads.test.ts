import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import app from "../src/index";

// Ad-free launch (2026-10-13): no ad network may load anywhere — not on
// the picker, course, or lesson pages, and not in the player. The zone
// snippets survive unused in src/lib/ads.ts for a possible future trial.
// Note: the inert Monetag verification <meta> tag may remain in heads;
// what must never appear is anything that loads an ad.
const AD_HOSTS = ["nap5k.com", "n6wxm.com", "bicea.org", "vignette.min.js", "tag.min.js"];

describe("ad-free launch", () => {
  it("serves no ad scripts or slots on picker, course, or lesson pages", async () => {
    for (const path of ["/", "/xx", "/lesson/en/001", "/register"]) {
      const html = await (await app.request(path)).text();
      for (const host of AD_HOSTS) {
        expect(html, `${path} must not reference ${host}`).not.toContain(host);
      }
      expect(html).not.toContain("cc566a16ba326b9eae73df4cd7bd6cce");
      expect(html).not.toContain("12021049");
      expect(html).not.toContain("12021056");
      expect(html).not.toContain("Advertisement");
    }
  });

  it("keeps the player free of ad loading", () => {
    const player = readFileSync("public/app/player.js", "utf8");
    for (const host of AD_HOSTS) {
      expect(player).not.toContain(host);
    }
    expect(player).not.toContain("cc566a16ba326b9eae73df4cd7bd6cce");
    expect(player).not.toContain("12021056");
  });
});
