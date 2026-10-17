// FAKE curriculum stand-in for the public code repo. Same exports and
// shapes as the real src/lessons/curriculum.ts (content-owned — the
// merge overlays this file). Gibberish vocabulary only: if a real word
// ever appears here, that is a content leak. See
// specs/content-split.md.
import { buildManifest, type ConversationManifest, type LessonManifest } from "./build";

export type Lang = "en" | "xx" | "yy";

type NounSet = "fakies";

export type LessonDef = {
  nouns: NounSet;
  verbs: [string, string];
  title: string;
  tense?: "present" | "past" | "future" | "pastcont" | "conditional" | "question";
  object?: string;
};

const NOUNS: Record<NounSet, { key: string; en: string; xx: string; yy: string }[]> = {
  fakies: [
    { key: "wug", en: "wug", xx: "xx-wug", yy: "yy-wug" },
    { key: "blarg", en: "blarg", xx: "xx-blarg", yy: "yy-blarg" },
    { key: "snarf", en: "snarf", xx: "xx-snarf", yy: "yy-snarf" },
    { key: "plugh", en: "plugh", xx: "xx-plugh", yy: "yy-plugh" },
  ],
};

const VERBS: Record<string, { en: string; xx: string; yy: string }> = {
  zorping: { en: "zorping", xx: "xx-zorping", yy: "yy-zorping" },
  quuxing: { en: "quuxing", xx: "xx-quuxing", yy: "yy-quuxing" },
  wugging: { en: "wugging", xx: "xx-wugging", yy: "yy-wugging" },
  blarging: { en: "blarging", xx: "xx-blarging", yy: "yy-blarging" },
  snarfling: { en: "snarfling", xx: "xx-snarfling", yy: "yy-snarfling" },
  plughing: { en: "plughing", xx: "xx-plughing", yy: "yy-plughing" },
  wobbling: { en: "wobbling", xx: "xx-wobbling", yy: "yy-wobbling" },
  flobbing: { en: "flobbing", xx: "xx-flobbing", yy: "yy-flobbing" },
};

export const CURRICULUM: Record<string, LessonDef> = {
  "001": { nouns: "fakies", verbs: ["zorping", "quuxing"], title: "Zorping & Quuxing" },
  "002": { nouns: "fakies", verbs: ["wugging", "blarging"], title: "Wugging & Blarging" },
  "003": { nouns: "fakies", verbs: ["snarfling", "plughing"], title: "Snarfling & Plughing" },
  "004": { nouns: "fakies", verbs: ["wobbling", "flobbing"], title: "Wobbling & Flobbing" },
  "005": { nouns: "fakies", verbs: ["quuxing", "zorping"], title: "Quuxing & Zorping" },
  "006": { nouns: "fakies", verbs: ["blarging", "wugging"], title: "Blarging & Wugging" },
  "007": { nouns: "fakies", verbs: ["plughing", "snarfling"], title: "Plughing & Snarfling" },
  "008": { nouns: "fakies", verbs: ["flobbing", "wobbling"], title: "Flobbing & Wobbling" },
};

export const UNITS = [
  { unit: 1, title: "Wug Words", lessons: ["001", "002", "003", "004"] },
  { unit: 2, title: "Zorp Zone", lessons: ["005", "006", "007", "008"] },
];

/** Lessons open without a subscription: exactly Unit 1, derived from the
 *  unit table (UNITS[0]) so the free set can't drift from the curriculum. */
export const FREE_LESSONS: ReadonlySet<string> = new Set(UNITS[0].lessons);

export function isFreeLesson(n: string): boolean {
  return FREE_LESSONS.has(n);
}

export const LEVELS = [
  { level: 1, title: "Wugginner", units: [1] },
  { level: 2, title: "Blargary", units: [2] },
];

export type LevelMap = {
  level: number;
  title: string;
  units: {
    unit: number;
    title: string;
    lessons: { n: string; title: string }[];
  }[];
};

// Resolved levels -> units -> lessons. Single source for the landing map,
// the /api/curriculum endpoint, and (via that endpoint) SW precaching.
export function curriculumMap(): LevelMap[] {
  return LEVELS.map((l) => ({
    level: l.level,
    title: l.title,
    units: l.units.map((unit) => {
      const def = UNITS.find((u) => u.unit === unit);
      if (!def) throw new Error(`unknown unit ${unit}`);
      return {
        unit: def.unit,
        title: def.title,
        lessons: def.lessons.map((n) => ({ n, title: CURRICULUM[n].title })),
      };
    }),
  }));
}

function manifestFor(lesson: string, lang: Lang): LessonManifest {
  const def = CURRICULUM[lesson];
  const nouns = NOUNS[def.nouns].map((n) => ({ key: n.key, label: n[lang] }));
  const verbs = def.verbs.map((key) => ({ key, label: VERBS[key][lang] }));
  return buildManifest({
    id: lang === "en" ? `lesson-${lesson}` : `${lang}-lesson-${lesson}`,
    nouns,
    verbs,
    sentence: (noun, verb) =>
      lang === "en"
        ? `The ${noun} is ${verb}.`
        : `${lang === "xx" ? "Xx" : "Yy"} ${noun} ${verb}.`,
    phraseId: (lesson, combo) =>
      lang === "en" ? `${lesson}-${combo}` : `${lang}-${lesson}-${combo}`,
    audioUrl: (combo) =>
      lang === "en"
        ? `/static/lesson-${lesson}/audio/${combo}.mp3`
        : `/static/lesson-${lesson}/audio/${lang}/${combo}.mp3`,
    imageUrl: (combo) => `/static/lesson-${lesson}/images/${combo}.jpg`,
  });
}

// Registry: lessons["003"].xx etc. Single source of truth for routes,
// progress keys, landing map, and media scripts (via the manifest API).
// yy is partial (Unit 1 only), mirroring the real partial-language shape.
export const lessons: Record<
  string,
  Record<"en" | "xx", LessonManifest> & Partial<Record<"yy", LessonManifest>>
> = Object.fromEntries(
  Object.keys(CURRICULUM).map((n) => [
    n,
    {
      en: manifestFor(n, "en"),
      xx: manifestFor(n, "xx"),
      ...(Number(n) <= 4 ? { yy: manifestFor(n, "yy") } : {}),
    },
  ]),
);

/** Fake conversation scenes (gibberish stand-ins, one per unit) so
 *  public tests cover the Phase 2 conversation path. Real scenes
 *  live in the content repo and replace this file wholesale. */
function fakeConversation(unit: number, lang: Lang): ConversationManifest {
  const lines = [0, 1, 2, 3].map((i) => ({
    id: `${lang}-conv-${unit}-${i + 1}`,
    text: `${lang === "xx" ? "Xx" : "Yy"} wug ${unit} line ${i + 1}.`,
    audioUrl: `/static/lesson-001/audio/${lang}/conv-u${unit}-l${i + 1}.mp3`,
    imageUrl: `/static/lesson-001/images/conv-u${unit}.jpg`,
    speaker: (i % 2 === 0 ? "A" : "B") as "A" | "B",
  }));
  return {
    id: `${lang}-conv-${unit}`,
    unit,
    title: `Gibberish scene ${unit}`,
    imageUrl: `/static/lesson-001/images/conv-u${unit}.jpg`,
    speakers: { A: { voice: "male" }, B: { voice: "female" } },
    lines,
    comprehension: [{ prompt: lines[0], options: lines.slice(0, 3), answerId: lines[0].id }],
  };
}

export const conversations: Record<number, Partial<Record<Lang, ConversationManifest>>> =
  Object.fromEntries(
    UNITS.map((u) => [
      u.unit,
      Object.fromEntries((["xx", "yy"] as Lang[]).map((lang) => [lang, fakeConversation(u.unit, lang)])),
    ]),
  );
