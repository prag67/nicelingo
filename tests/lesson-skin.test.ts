import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("lesson player poolside skin", () => {
  const css = readFileSync(join(__dirname, "../public/app/lesson.css"), "utf8");
  const js = readFileSync(join(__dirname, "../public/app/player.js"), "utf8");

  it("uses Poolside tokens with no teal residue", () => {
    expect(css).toContain("#1a5feb");
    expect(css).toContain("Bricolage");
    expect(css.toLowerCase()).not.toContain("0e7c6b");
    expect(css.toLowerCase()).not.toContain("e2f2ee");
  });

  it("keeps score semantics and Mandarin display rules", () => {
    // Red/green/amber stay recognizable; vocal-only display untouched.
    expect(css).toContain("--coral");
    expect(css).toContain("--leaf");
    expect(css).toContain(".phrase-card .native");
    expect(css).toContain("prefers-reduced-motion");
  });

  it("has no hardcoded teal in player.js", () => {
    expect(js.toLowerCase()).not.toContain("0e7c6b");
    expect(js.toLowerCase()).not.toContain("e2f2ee");
  });
});
