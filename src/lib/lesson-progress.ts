// Shared lesson-progress math for the picker and course home. Pure: no
// HTML, no D1. Progress keys match the manifest ids ("lesson-001" for
// English, "{lang}-lesson-001" otherwise) so server progress maps and the
// localStorage mirror ("nicelingo:completed:{key}") share one vocabulary.
import { CURRICULUM, LEVELS, UNITS, lessons, type Lang } from "../lessons/curriculum";

export function progressKey(lang: string, n: string): string {
  return lang === "en" ? `lesson-${n}` : `${lang}-lesson-${n}`;
}

/** Activity count for a lesson, 0 when the language has no manifest there. */
export function activitiesTotal(lang: string, n: string): number {
  return lessons[n]?.[lang as Lang]?.activities.length ?? 0;
}

export function doneCount(
  completed: string[] | undefined,
  total: number,
): number {
  if (!completed || total <= 0) return 0;
  return Math.min(new Set(completed).size, total);
}

export function isLessonDone(
  lang: string,
  n: string,
  progress: Record<string, string[]>,
): boolean {
  const total = activitiesTotal(lang, n);
  return total > 0 && doneCount(progress[progressKey(lang, n)], total) >= total;
}

export function levelOfUnit(unit: number): number {
  return LEVELS.find((l) => l.units.includes(unit))?.level ?? 1;
}

export type NextLesson = {
  n: string;
  title: string;
  unit: number;
  unitTitle: string;
  level: number;
  done: number;
  total: number;
  /** True when every lesson is done and this is a review suggestion. */
  review: boolean;
};

/** First unfinished lesson in unit order, or the last lesson for review. */
export function nextLesson(
  lang: string,
  progress: Record<string, string[]>,
): NextLesson {
  let last: NextLesson | null = null;
  for (const u of UNITS) {
    for (const n of u.lessons) {
      const total = activitiesTotal(lang, n);
      if (total <= 0) continue;
      const entry: NextLesson = {
        n,
        title: CURRICULUM[n].title,
        unit: u.unit,
        unitTitle: u.title,
        level: levelOfUnit(u.unit),
        done: doneCount(progress[progressKey(lang, n)], total),
        total,
        review: false,
      };
      last = entry;
      if (entry.done < total) return entry;
    }
  }
  // No manifest at all (unknown lang): callers 404 before this matters.
  if (!last) {
    return {
      n: "001",
      title: CURRICULUM["001"].title,
      unit: 1,
      unitTitle: UNITS[0].title,
      level: 1,
      done: 0,
      total: 0,
      review: false,
    };
  }
  return { ...last, review: true };
}

export type StatCount = { done: number; total: number };

/** Done/total lessons for one level (total counts manifests, not 48). */
export function levelStats(
  lang: string,
  level: number,
  progress: Record<string, string[]>,
): StatCount {
  const units = LEVELS.find((l) => l.level === level)?.units ?? [];
  let done = 0;
  let total = 0;
  for (const unit of units) {
    for (const n of UNITS.find((u) => u.unit === unit)?.lessons ?? []) {
      if (activitiesTotal(lang, n) <= 0) continue;
      total++;
      if (isLessonDone(lang, n, progress)) done++;
    }
  }
  return { done, total };
}

export function unitStats(
  lang: string,
  unit: number,
  progress: Record<string, string[]>,
): StatCount {
  let done = 0;
  let total = 0;
  for (const n of UNITS.find((u) => u.unit === unit)?.lessons ?? []) {
    if (activitiesTotal(lang, n) <= 0) continue;
    total++;
    if (isLessonDone(lang, n, progress)) done++;
  }
  return { done, total };
}

/** Fully-done lessons across the language (picker "N of M done"). */
export function countDoneLessons(
  lang: string,
  progress: Record<string, string[]>,
): number {
  let done = 0;
  for (const u of UNITS) {
    for (const n of u.lessons) {
      if (isLessonDone(lang, n, progress)) done++;
    }
  }
  return done;
}

/** True when any activity exists for the language (picker "started"). */
export function hasStarted(
  lang: string,
  progress: Record<string, string[]>,
): boolean {
  const prefix = lang === "en" ? "lesson-" : `${lang}-lesson-`;
  return Object.entries(progress).some(
    ([key, done]) => key.startsWith(prefix) && done.length > 0,
  );
}

/** Short step labels for Continue pills, in manifest order. */
export const ACTIVITY_SHORT: Record<string, string> = {
  "listen-match": "Listen",
  "image-phrase": "Match",
  "speak-score": "Speak",
  "read-write": "Write",
};

/** Activity ids for a lesson, [] when the language has no manifest there. */
export function activitiesFor(lang: string, n: string): string[] {
  return lessons[n]?.[lang as Lang]?.activities ?? [];
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
