import { describe, expect, it } from "vitest";
import {
  blanked,
  buildQuestions,
  buildSpeakPlan,
  checkAnswer,
  langFromPath,
  lessonFromPath,
  nextIncomplete,
  readWritePicks,
} from "../public/app/lesson-flow.js";
import { lessons } from "../src/lessons/curriculum";

const phrases = lessons["001"].en.phrases;
const half = () => 0.5;

describe("buildQuestions", () => {
  it("covers all 8 phrases as targets across 4 rounds of 2", () => {
    const rounds = buildQuestions(phrases, { random: half });
    expect(rounds).toHaveLength(4);
    const targets = rounds.flat().map((q) => q.target.id);
    expect([...targets].sort()).toEqual([...phrases.map((p) => p.id)].sort());
    for (const q of rounds.flat()) {
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o) => o.id)).toContain(q.target.id);
      expect(new Set(q.options.map((o) => o.id)).size).toBe(4);
    }
  });
});

describe("checkAnswer", () => {
  it("accepts only the target", () => {
    const [[q]] = buildQuestions(phrases, { rounds: 1, perRound: 1, random: half });
    expect(checkAnswer(q, q.target.id)).toBe(true);
    const wrong = q.options.find((o) => o.id !== q.target.id)!;
    expect(checkAnswer(q, wrong.id)).toBe(false);
  });
});

describe("buildSpeakPlan", () => {
  it("picks one phrase per noun with alternating verbs", () => {
    expect(buildSpeakPlan(phrases)).toEqual([
      "001-wug-zorping",
      "001-blarg-quuxing",
      "001-snarf-zorping",
      "001-plugh-quuxing",
    ]);
  });

  it("returns manifest ids for Xxian", () => {
    expect(buildSpeakPlan(lessons["001"].xx.phrases)).toEqual([
      "xx-001-wug-zorping",
      "xx-001-blarg-quuxing",
      "xx-001-snarf-zorping",
      "xx-001-plugh-quuxing",
    ]);
  });

  it("groups by phrase id across lessons and languages", () => {
    expect(buildSpeakPlan(lessons["001"].yy.phrases)).toEqual([
      "yy-001-wug-zorping",
      "yy-001-blarg-quuxing",
      "yy-001-snarf-zorping",
      "yy-001-plugh-quuxing",
    ]);
    expect(buildSpeakPlan(lessons["005"].xx.phrases)).toEqual([
      "xx-005-wug-quuxing",
      "xx-005-blarg-zorping",
      "xx-005-snarf-quuxing",
      "xx-005-plugh-zorping",
    ]);
  });

  it("parses lang from the player route", () => {
    expect(langFromPath("/lesson/01")).toBe("en");
    expect(langFromPath("/lesson/es/01")).toBe("es");
    expect(langFromPath("/lesson/en/01")).toBe("en");
  });

  it("parses lesson from the player route", () => {
    expect(lessonFromPath("/lesson/01")).toBe("01");
    expect(lessonFromPath("/lesson/02")).toBe("02");
    expect(lessonFromPath("/lesson/es/02")).toBe("02");
    expect(lessonFromPath("/lesson/en/01")).toBe("01");
    expect(lessonFromPath("/lesson/en/001")).toBe("001");
    expect(lessonFromPath("/lesson/es/096")).toBe("096");
    expect(langFromPath("/lesson/es/096")).toBe("es");
  });
});

describe("readWritePicks", () => {
  it("picks two distinct phrases deterministically", () => {
    const picks = readWritePicks(phrases);
    expect(picks).toHaveLength(2);
    expect(new Set(picks).size).toBe(2);
    for (const id of picks) {
      expect(phrases.map((p) => p.id)).toContain(id);
    }
  });
});

describe("blanked", () => {
  it("blanks the final word and checks case-insensitively", () => {
    const b = blanked("The wug is zorping.");
    expect(b.prompt).toBe("The wug is ______.");
    expect(b.check("zorping")).toBe(true);
    expect(b.check("Zorping")).toBe(true);
    expect(b.check("quuxing")).toBe(false);
  });
});

describe("nextIncomplete", () => {
  it("resumes at the first incomplete activity", () => {
    const activities = ["listen-match", "image-phrase", "speak-score", "read-write"];
    expect(nextIncomplete(activities, [])).toBe("listen-match");
    expect(nextIncomplete(activities, ["listen-match"])).toBe("image-phrase");
    expect(nextIncomplete(activities, activities)).toBeNull();
  });
});
