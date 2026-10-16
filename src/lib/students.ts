// Linked-student progress summaries (pure logic; store is in
// src/db/student-store.ts). A registered holder links up to MAX_STUDENTS
// students (their own registered accounts, accepted by the student) and
// sees, per student, a per-language summary — never activity detail.
import { UNITS } from "../lessons/curriculum";
import {
  activitiesTotal,
  doneCount,
  nextLesson,
  progressKey,
} from "./lesson-progress";

export const MAX_STUDENTS = 5;

export type ProgressRow = {
  lessonId: string;
  activity: string;
  completedAt: Date | number;
};

export type LanguageSummary = {
  lang: string;
  lessonsDone: number;
  lessonsTotal: number;
  /** Next unfinished lesson number ("005"), or null when complete. */
  nextLesson: string | null;
  nextLessonTitle: string | null;
  lastActivityAt: number | null;
};

export type StudentSummary = {
  languages: LanguageSummary[];
  lastActivityAt: number | null;
};

/** Parse a progress key ("lesson-001" or "es-lesson-001"). */
export function langOfLessonKey(key: string): { lang: string; n: string } | null {
  const plain = /^lesson-(\d{3})$/.exec(key);
  if (plain) return { lang: "en", n: plain[1] };
  const prefixed = /^([a-z]{2})-lesson-(\d{3})$/.exec(key);
  if (prefixed) return { lang: prefixed[1], n: prefixed[2] };
  return null;
}

function toMs(v: Date | number): number {
  return v instanceof Date ? v.getTime() : Number(v);
}

/** Per-language summary for one learner's progress rows. Only languages
 *  with at least one completed activity appear (i.e. started languages). */
export function summarizeProgress(rows: ProgressRow[]): StudentSummary {
  const progress: Record<string, string[]> = {};
  const lastByLang = new Map<string, number>();
  let lastOverall: number | null = null;
  for (const row of rows) {
    const parsed = langOfLessonKey(row.lessonId);
    if (!parsed) continue;
    (progress[row.lessonId] ??= []).push(row.activity);
    const at = toMs(row.completedAt);
    if (!Number.isFinite(at)) continue;
    if (at > (lastByLang.get(parsed.lang) ?? 0)) lastByLang.set(parsed.lang, at);
    if (lastOverall === null || at > lastOverall) lastOverall = at;
  }

  const languages: LanguageSummary[] = [];
  for (const [lang, lastActivityAt] of [...lastByLang.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    let total = 0;
    let done = 0;
    for (const u of UNITS) {
      for (const n of u.lessons) {
        const t = activitiesTotal(lang, n);
        if (t <= 0) continue;
        total++;
        if (doneCount(progress[progressKey(lang, n)], t) >= t) done++;
      }
    }
    if (total === 0) continue;
    const next = nextLesson(lang, progress);
    languages.push({
      lang,
      lessonsDone: done,
      lessonsTotal: total,
      nextLesson: next.review ? null : next.n,
      nextLessonTitle: next.review ? null : next.title,
      lastActivityAt,
    });
  }
  return { languages, lastActivityAt: lastOverall };
}
