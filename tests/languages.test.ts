import { describe, expect, it } from "vitest";
import {
  coverageLine,
  LANGUAGES,
  pickerLanguages,
} from "../src/lessons/languages";

// NOTE: the public code repo runs against a FAKE curriculum (gibberish
// vocabulary, 8 lessons, 3 languages). Same shapes as production.
describe("language registry", () => {
  it("derives lesson counts from the lessons record", () => {
    const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));
    expect(byCode.en.lessons).toBe(8);
    expect(byCode.xx.lessons).toBe(8);
    expect(byCode.yy.lessons).toBe(4);
  });

  it("marks complete and partial statuses", () => {
    const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));
    expect(byCode.en.status).toBe("complete");
    expect(byCode.xx.status).toBe("complete");
    expect(byCode.yy.status).toBe("partial");
  });

  it("covers every visible language by subscription", () => {
    for (const lang of LANGUAGES) {
      expect(lang.coveredBySubscription).toBe(lang.status !== "hidden");
    }
  });

  it("shows only non-hidden languages in the picker", () => {
    expect(pickerLanguages().map((l) => l.code)).toEqual([
      "en",
      "xx",
      "yy",
    ]);
  });

  it("builds the billing coverage line from the registry", () => {
    expect(coverageLine()).toBe(
      "English, Xxian, and Yyan (Level 1 only)",
    );
  });

  it("carries a greeting per language for picker cards", () => {
    const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));
    expect(byCode.en.greeting).toBe("Hello");
    expect(byCode.xx.greeting).toBe("Xxalo!");
    expect(byCode.yy.greeting).toBe("Yyalo!");
  });

  it("carries a Poolside tile color per language", () => {
    const byCode = Object.fromEntries(LANGUAGES.map((l) => [l.code, l]));
    expect(byCode.en.tileColor).toBe("#8CC8FF");
    expect(byCode.xx.tileColor).toBe("#FFB061");
    expect(byCode.yy.tileColor).toBe("#7FE3C4");
  });
});
