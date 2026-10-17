// Per-phrase learning stats and unit/level milestones (checkpoints
// spec): phraseStats is written after every answer in any lesson,
// checkpoint or challenge; milestones when a checkpoint or challenge
// finishes. A phrase is weak when its last answer was wrong or its
// last speak score was below 70; it stops being weak after two
// correct answers in a row.

export type PhraseStats = {
  phraseId: string;
  lang: string;
  attempts: number;
  correct: number;
  bestSpeakScore: number | null;
  lastSeenAt: string;
  weak: boolean;
  correctStreak: number;
  /** Activity of the most recent answer (review replays the missed kind). */
  lastActivity: string;
  /** Daily review schedule (Phase 1): step 0-6 into REVIEW_INTERVALS,
   *  and the date (YYYY-MM-DD) the phrase is next due. Empty dueAt
   *  means legacy rows not yet backfilled (see effectiveDueAt). */
  reviewStep: number;
  dueAt: string;
  recallCorrect: number;
  recallWithHelp: number;
};

/** Spaced repetition intervals in days (Phase 1a). */
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60];

export function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The date a phrase is due, backfilling legacy rows (no dueAt)
 *  from lastSeenAt + the interval for their current step, so
 *  existing learners have phrases due on first load. Weak phrases
 *  are always due today. */
export function effectiveDueAt(s: PhraseStats, today: string): string {
  if (s.weak) return today;
  if (s.dueAt) return s.dueAt;
  if (!s.lastSeenAt) return today;
  const step = Math.min(Math.max(s.reviewStep, 1), REVIEW_INTERVALS.length);
  return addDays(s.lastSeenAt, REVIEW_INTERVALS[step - 1]);
}

/** Gallery strength from the review step: 0-2 weak (learning after
 *  a reset counts as weak), 3-4 learning, 5-6 strong. */
export function strengthOf(step: number): "weak" | "learning" | "strong" {
  if (step >= 5) return "strong";
  if (step >= 3) return "learning";
  return "weak";
}

export type Attempt = {
  phraseId: string;
  lang: string;
  activity: string;
  correct: boolean;
  score?: number | null;
  at: string;
  /** Recall rounds only: the learner pressed help (text shown). */
  helped?: boolean;
};

export function emptyStats(phraseId: string, lang: string): PhraseStats {
  return {
    phraseId,
    lang,
    attempts: 0,
    correct: 0,
    bestSpeakScore: null,
    lastSeenAt: "",
    weak: false,
    correctStreak: 0,
    lastActivity: "",
    reviewStep: 0,
    dueAt: "",
    recallCorrect: 0,
    recallWithHelp: 0,
  };
}

export function applyAttempt(prev: PhraseStats | undefined, a: Attempt): PhraseStats {
  const s = prev ?? emptyStats(a.phraseId, a.lang);
  const spoken = a.activity === "speak-score" || a.activity === "recall";
  const speakBad = spoken && a.score != null && a.score < 70;
  const correctStreak = a.correct ? s.correctStreak + 1 : 0;
  let weak = s.weak;
  if (correctStreak >= 2) weak = false;
  if (!a.correct || speakBad) weak = true;
  // Daily review schedule: a correct answer climbs one interval
  // (1, 3, 7, 14, 30, 60 days); a wrong answer or a speak score
  // under 70 resets to due tomorrow and flags the phrase weak.
  const today = a.at.slice(0, 10);
  let reviewStep = s.reviewStep;
  let dueAt: string;
  if (a.correct && !speakBad) {
    reviewStep = Math.min(s.reviewStep + 1, REVIEW_INTERVALS.length);
    dueAt = addDays(today, REVIEW_INTERVALS[reviewStep - 1]);
  } else {
    reviewStep = 0;
    dueAt = addDays(today, 1);
  }
  return {
    phraseId: a.phraseId,
    lang: a.lang,
    attempts: s.attempts + 1,
    correct: s.correct + (a.correct ? 1 : 0),
    bestSpeakScore:
      spoken && a.score != null
        ? Math.max(s.bestSpeakScore ?? 0, a.score)
        : s.bestSpeakScore,
    lastSeenAt: a.at,
    weak,
    correctStreak,
    lastActivity: a.activity,
    reviewStep,
    dueAt,
    recallCorrect: s.recallCorrect + (a.activity === "recall" && a.correct && !a.helped ? 1 : 0),
    recallWithHelp: s.recallWithHelp + (a.activity === "recall" && a.helped ? 1 : 0),
  };
}

/** Weakest first: lowest best speak score (never spoken = lowest),
 *  then most wrong answers, then oldest last seen. */
export function sortWeak(stats: PhraseStats[]): PhraseStats[] {
  return [...stats].sort((a, b) => {
    const sa = a.bestSpeakScore ?? -1;
    const sb = b.bestSpeakScore ?? -1;
    if (sa !== sb) return sa - sb;
    const wa = a.attempts - a.correct;
    const wb = b.attempts - b.correct;
    if (wa !== wb) return wb - wa;
    return a.lastSeenAt < b.lastSeenAt ? -1 : 1;
  });
}

export type Milestone = {
  kind: "checkpoint" | "levelChallenge" | "conversation";
  lang: string;
  level: number;
  unit: number | null;
  score: number;
  passed: boolean;
  viaTestOut: boolean;
  completedAt: string;
};

export type AttemptStore = {
  getStats(userId: string, lang: string): Promise<PhraseStats[]>;
  getActivityDays?(userId: string): Promise<string[]>;
  recordAttempt(userId: string, a: Attempt): Promise<PhraseStats>;
  listMilestones(userId: string): Promise<Milestone[]>;
  recordMilestone(userId: string, m: Milestone): Promise<void>;
};
