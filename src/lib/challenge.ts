// Level scene challenges and test out (Feature 4). One challenge
// per level: 3 scenes of 4 spoken lines, each line from a different
// unit of the level. Normal pass: average 75+, no line below 40,
// one retry per line (better score counts). Test out runs the same
// scenes harder: average 85+, no line below 50, no retries; passing
// completes the whole level with viaTestOut milestones.
import { LEVELS, UNITS, lessons } from "../lessons/curriculum";
import type { LessonPhrase } from "../lessons/build";
import { shuffle } from "./checkpoint";

export const CHALLENGE_PASS = { avg: 75, min: 40 };
export const TESTOUT_PASS = { avg: 85, min: 50 };

export type ChallengeScene = { lines: LessonPhrase[] };

export function levelUnits(level: number): number[] {
  return LEVELS.find((l) => l.level === level)?.units ?? [];
}

export function levelLessons(level: number): string[] {
  return levelUnits(level).flatMap(
    (u) => UNITS.find((x) => x.unit === u)?.lessons ?? [],
  );
}

/** 3 scenes x 4 lines; every line from a different unit, no phrase
 *  twice. Returns null when the level has too little content. */
export function buildChallengeScenes(
  lang: string,
  level: number,
  rng: () => number = Math.random,
): ChallengeScene[] | null {
  const units = levelUnits(level);
  if (units.length < 4) return null;
  const chosenUnits = shuffle(units, rng).slice(0, 12);
  if (chosenUnits.length < 12) return null;
  const lines: LessonPhrase[] = [];
  for (const unit of chosenUnits) {
    const lessonIds = UNITS.find((u) => u.unit === unit)?.lessons ?? [];
    const pool = lessonIds.flatMap(
      (n) => lessons[n]?.[lang as keyof (typeof lessons)[string]]?.phrases ?? [],
    );
    if (!pool.length) return null;
    lines.push(shuffle(pool, rng)[0]);
  }
  return [
    { lines: lines.slice(0, 4) },
    { lines: lines.slice(4, 8) },
    { lines: lines.slice(8, 12) },
  ];
}

export function evaluateChallenge(
  scores: number[],
  mode: "challenge" | "testout",
): { passed: boolean; avg: number; min: number } {
  const t = mode === "testout" ? TESTOUT_PASS : CHALLENGE_PASS;
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const min = scores.length ? Math.min(...scores) : 0;
  return { passed: avg >= t.avg && min >= t.min, avg, min };
}
