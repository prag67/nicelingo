// Practise my mistakes (Feature 3): a review session of up to 10 of
// the learner's weak phrases, weakest first, each replayed in the
// activity it was missed in. Only phrases from lessons the learner
// can open are served.
import { UNITS, isFreeLesson, lessons } from "../lessons/curriculum";
import type { LessonPhrase } from "../lessons/build";
import { sortWeak, type PhraseStats } from "./attempts";

export const REVIEW_LIMIT = 10;
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

/** Weak phrases the learner may open, weakest first, capped. */
export function buildReviewSet(args: {
  lang: string;
  stats: PhraseStats[];
  subscribed: boolean;
  paywallDisabled?: boolean;
  phraseIds?: string[];
}): { questions: ReviewQuestion[]; weakCount: number; weakIds: string[] } {
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
    return { questions, weakCount: weak.length, weakIds };
  }

  const questions = weak
    .map((s) => {
      const phrase = byId.get(s.phraseId);
      if (!phrase || !openable(phrase)) return null;
      return { phrase, activity: s.lastActivity || "listen-match" };
    })
    .filter((q): q is ReviewQuestion => q !== null)
    .slice(0, REVIEW_LIMIT);
  return { questions, weakCount: weak.length, weakIds };
}
