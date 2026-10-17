import { and, eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import {
  applyAttempt,
  type Attempt,
  type AttemptStore,
  type Milestone,
  type PhraseStats,
} from "../lib/attempts";

export function d1AttemptStore(db: D1Database): AttemptStore {
  const orm: DrizzleD1Database<typeof schema> = drizzle(db, { schema });
  const toStats = (r: typeof schema.phraseStats.$inferSelect): PhraseStats => ({
    phraseId: r.phraseId,
    lang: r.lang,
    attempts: r.attempts,
    correct: r.correct,
    bestSpeakScore: r.bestSpeakScore,
    lastSeenAt: r.lastSeenAt,
    weak: r.weak === 1,
    correctStreak: r.correctStreak,
  });
  return {
    getStats: async (userId, lang) => {
      const rows = await orm
        .select()
        .from(schema.phraseStats)
        .where(
          and(eq(schema.phraseStats.userId, userId), eq(schema.phraseStats.lang, lang)),
        );
      return rows.map(toStats);
    },
    recordAttempt: async (userId, a: Attempt) => {
      const rows = await orm
        .select()
        .from(schema.phraseStats)
        .where(
          and(
            eq(schema.phraseStats.userId, userId),
            eq(schema.phraseStats.phraseId, a.phraseId),
          ),
        );
      const next = applyAttempt(rows[0] ? toStats(rows[0]) : undefined, a);
      const values = {
        userId,
        phraseId: next.phraseId,
        lang: next.lang,
        attempts: next.attempts,
        correct: next.correct,
        bestSpeakScore: next.bestSpeakScore,
        lastSeenAt: next.lastSeenAt,
        weak: next.weak ? 1 : 0,
        correctStreak: next.correctStreak,
      };
      if (rows[0]) {
        await orm
          .update(schema.phraseStats)
          .set(values)
          .where(
            and(
              eq(schema.phraseStats.userId, userId),
              eq(schema.phraseStats.phraseId, a.phraseId),
            ),
          );
      } else {
        await orm.insert(schema.phraseStats).values(values);
      }
      return next;
    },
    listMilestones: async (userId) => {
      const rows = await orm
        .select()
        .from(schema.milestones)
        .where(eq(schema.milestones.userId, userId));
      return rows.map(
        (r): Milestone => ({
          kind: r.kind as Milestone["kind"],
          lang: r.lang,
          level: r.level,
          unit: r.unit,
          score: r.score,
          passed: r.passed === 1,
          viaTestOut: r.viaTestOut === 1,
          completedAt: r.completedAt,
        }),
      );
    },
    recordMilestone: async (userId, m) => {
      await orm.insert(schema.milestones).values({
        id: crypto.randomUUID(),
        userId,
        kind: m.kind,
        lang: m.lang,
        level: m.level,
        unit: m.unit,
        score: m.score,
        passed: m.passed ? 1 : 0,
        viaTestOut: m.viaTestOut ? 1 : 0,
        completedAt: m.completedAt,
      });
    },
  };
}
