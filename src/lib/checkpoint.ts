// Unit checkpoints (Feature 2): a 10-question mixed review after a
// unit's four lessons. Pass is 8 of 10. Checkpoints reward, they
// never block: the next unit's lessons stay open either way.
import { LEVELS, UNITS, lessons } from "../lessons/curriculum";
import type { LessonPhrase } from "../lessons/build";

export const CHECKPOINT_QUESTIONS = 10;
export const CHECKPOINT_PASS = 8;

export type CheckpointQuestion = {
  phrase: LessonPhrase;
  activity: string;
};

export function unitLessons(level: number, unit: number): string[] | null {
  const lvl = LEVELS.find((l) => l.level === level);
  if (!lvl || !lvl.units.includes(unit)) return null;
  return UNITS.find((u) => u.unit === unit)?.lessons ?? null;
}

export function levelOfUnit(unit: number): number {
  return LEVELS.find((l) => l.units.includes(unit))?.level ?? 1;
}

/** Deterministic-ish shuffle with an injectable RNG for tests. */
export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 10 questions from the unit's 32 phrases: at least 2 from each of
 *  the 4 lessons, no phrase twice, activities in the spec rotation
 *  (3 listen, 3 image, 2 speak, 2 write; languages without read-write
 *  give the write slots to listen and image). */
export function buildCheckpointSet(
  lang: string,
  level: number,
  unit: number,
  rng: () => number = Math.random,
): { questions: CheckpointQuestion[]; pool: LessonPhrase[] } | null {
  const lessonIds = unitLessons(level, unit);
  if (!lessonIds) return null;
  const byLesson = lessonIds.map(
    (n) => lessons[n]?.[lang as keyof (typeof lessons)[string]]?.phrases ?? [],
  );
  if (byLesson.some((p) => p.length === 0)) return null;
  const pool = byLesson.flat();
  const picked: LessonPhrase[] = [];
  for (const phrases of byLesson) picked.push(...shuffle(phrases, rng).slice(0, 2));
  const rest = shuffle(pool.filter((p) => !picked.includes(p)), rng);
  picked.push(...rest.slice(0, CHECKPOINT_QUESTIONS - picked.length));
  const chosen = shuffle(picked, rng).slice(0, CHECKPOINT_QUESTIONS);

  const hasWrite = (lessons[lessonIds[0]]?.[lang as keyof (typeof lessons)[string]]?.activities ?? [])
    .includes("read-write");
  const activities = hasWrite
    ? ["listen-match", "listen-match", "listen-match", "image-phrase", "image-phrase", "image-phrase", "speak-score", "speak-score", "read-write", "read-write"]
    : ["listen-match", "listen-match", "listen-match", "listen-match", "image-phrase", "image-phrase", "image-phrase", "image-phrase", "speak-score", "speak-score"];
  const rotated = shuffle(activities, rng);
  return {
    questions: chosen.map((phrase, i) => ({ phrase, activity: rotated[i] })),
    pool,
  };
}

/** Checkpoint access: free learners (incl. anonymous) get Unit 1;
 *  subscribers get every unit. Lessons must also be finished, which
 *  is what unlocks the checkpoint on the course page. */
export function checkpointAccess(args: {
  level: number;
  unit: number;
  subscribed: boolean;
  paywallDisabled?: boolean;
}): boolean {
  if (args.paywallDisabled || args.subscribed) return true;
  return args.level === 1 && args.unit === 1;
}
