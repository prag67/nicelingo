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
};

export type Attempt = {
  phraseId: string;
  lang: string;
  activity: string;
  correct: boolean;
  score?: number | null;
  at: string;
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
  };
}

export function applyAttempt(prev: PhraseStats | undefined, a: Attempt): PhraseStats {
  const s = prev ?? emptyStats(a.phraseId, a.lang);
  const speakBad = a.activity === "speak-score" && a.score != null && a.score < 70;
  const correctStreak = a.correct ? s.correctStreak + 1 : 0;
  let weak = s.weak;
  if (correctStreak >= 2) weak = false;
  if (!a.correct || speakBad) weak = true;
  return {
    phraseId: a.phraseId,
    lang: a.lang,
    attempts: s.attempts + 1,
    correct: s.correct + (a.correct ? 1 : 0),
    bestSpeakScore:
      a.activity === "speak-score" && a.score != null
        ? Math.max(s.bestSpeakScore ?? 0, a.score)
        : s.bestSpeakScore,
    lastSeenAt: a.at,
    weak,
    correctStreak,
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
  kind: "checkpoint" | "levelChallenge";
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
  recordAttempt(userId: string, a: Attempt): Promise<PhraseStats>;
  listMilestones(userId: string): Promise<Milestone[]>;
  recordMilestone(userId: string, m: Milestone): Promise<void>;
};
