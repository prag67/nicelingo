// Daily review (Phase 1a): every phrase from a finished lesson
// gets a due date on the 1/3/7/14/30/60-day schedule in
// lib/attempts. A session serves up to 12 due phrases, oldest due
// first, mixing listen, speak and recall. Weak phrases are always
// due, so this absorbs the old "Practise my mistakes" session; the
// explicit ?phrases= mode still serves a given set (checkpoint and
// challenge result screens). Only phrases from lessons the learner
// can open are served, and retired phrase ids (no longer in any
// manifest, e.g. after the Phase 2c complement rebuild) are skipped.
import { UNITS, isFreeLesson, lessons } from "../lessons/curriculum";
import type { LessonPhrase } from "../lessons/build";
import { effectiveDueAt, sortWeak, type PhraseStats } from "./attempts";

export const REVIEW_LIMIT = 12;
export const REVIEW_MIN_WEAK = 3;

export function lessonOfPhrase(phraseId: string): string | null {
  const m = /(\d{3})/.exec(phraseId);
  return m ? m[1] : null;
}

export function phraseById(lang: string): Map<string, LessonPhrase> {
  const map = new Map<string, LessonPhrase>();
  for (const u of UNITS) {
    for (const n of u.lessons) {
      const manifest = lessons[n]?.[lang as keyof (typeof lessons)[string]];
      for (const p of manifest?.phrases ?? []) map.set(p.id, p);
    }
  }
  return map;
}

export type ReviewQuestion = { phrase: LessonPhrase; activity: string };

function hasWrite(lang: string, phraseId: string): boolean {
  const n = lessonOfPhrase(phraseId);
  if (!n) return false;
  return (lessons[n]?.[lang as keyof (typeof lessons)[string]]?.activities ?? []).includes("read-write");
}

/** Activity rotation for daily review: roughly a third listen, a
 *  third speak, a third recall, with image/write filling the rest.
 *  Languages without read-write swap write for image-phrase. */
function dailyActivity(lang: string, phraseId: string, i: number): string {
  const cycle = ["listen-match", "speak-score", "recall", "image-phrase", "listen-match", "recall"];
  const a = cycle[i % cycle.length];
  return a;
}

export function buildDailyReview(args: {
  lang: string;
  stats: PhraseStats[];
  subscribed: boolean;
  paywallDisabled?: boolean;
  today: string;
  phraseIds?: string[];
}): { questions: ReviewQuestion[]; weakCount: number; weakIds: string[]; dueCount: number; nextDueAt: string | null } {
  const byId = phraseById(args.lang);
  const openable = (p: LessonPhrase) => {
    const n = lessonOfPhrase(p.id);
    if (!n) return false;
    return args.paywallDisabled || args.subscribed || isFreeLesson(n);
  };
  const weak = sortWeak(args.stats.filter((s) => s.weak));
  const weakIds = weak.map((s) => s.phraseId);

  if (args.phraseIds?.length) {
    const fallback = ["listen-match", "image-phrase", "speak-score", "read-write"];
    const questions = args.phraseIds
      .map((id, i) => {
        const phrase = byId.get(id);
        if (!phrase || !openable(phrase)) return null;
        const st = args.stats.find((s) => s.phraseId === id);
        return { phrase, activity: st?.lastActivity || fallback[i % fallback.length] };
      })
      .filter((q): q is ReviewQuestion => q !== null)
      .slice(0, REVIEW_LIMIT);
    return { questions, weakCount: weak.length, weakIds, dueCount: 0, nextDueAt: null };
  }

  // Due set: schedule reached (backfilled for legacy rows) or weak.
  // Retired ids are absent from byId and drop out here.
  const due = args.stats
    .filter((s) => byId.has(s.phraseId))
    .map((s) => ({ s, due: effectiveDueAt(s, args.today) }))
    .filter(({ due }) => due <= args.today)
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  const openDue = due.filter(({ s }) => {
    const p = byId.get(s.phraseId);
    return p ? openable(p) : false;
  });
  const future = args.stats
    .filter((s) => byId.has(s.phraseId) && !s.weak)
    .map((s) => effectiveDueAt(s, args.today))
    .filter((d) => d > args.today)
    .sort();
  const questions = openDue
    .slice(0, REVIEW_LIMIT)
    .map(({ s }, i) => ({ phrase: byId.get(s.phraseId)!, activity: dailyActivity(args.lang, s.phraseId, i) }));
  return {
    questions,
    weakCount: weak.length,
    weakIds,
    dueCount: openDue.length,
    nextDueAt: future[0] ?? null,
  };
}

/** Back-compat wrapper: the daily review builder under the old name. */
export function buildReviewSet(args: {
  lang: string;
  stats: PhraseStats[];
  subscribed: boolean;
  paywallDisabled?: boolean;
  phraseIds?: string[];
  today?: string;
}): { questions: ReviewQuestion[]; weakCount: number; weakIds: string[]; dueCount: number; nextDueAt: string | null } {
  return buildDailyReview({ ...args, today: args.today ?? new Date().toISOString().slice(0, 10) });
}
