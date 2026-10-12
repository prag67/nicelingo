import { and, eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { ProgressStore } from "../lib/progress";

export function d1ProgressStore(db: D1Database): ProgressStore {
  const orm: DrizzleD1Database<typeof schema> = drizzle(db, { schema });
  return {
    listCompleted: async (userId, lessonId) => {
      const rows = await orm
        .select({ activity: schema.lessonProgress.activity })
        .from(schema.lessonProgress)
        .where(
          and(
            eq(schema.lessonProgress.userId, userId),
            eq(schema.lessonProgress.lessonId, lessonId),
          ),
        );
      return rows.map((row) => row.activity);
    },
    listAll: async (userId) => {
      const rows = await orm
        .select({
          lessonId: schema.lessonProgress.lessonId,
          activity: schema.lessonProgress.activity,
        })
        .from(schema.lessonProgress)
        .where(eq(schema.lessonProgress.userId, userId));
      const grouped: Record<string, string[]> = {};
      for (const row of rows) {
        (grouped[row.lessonId] ??= []).push(row.activity);
      }
      return grouped;
    },
    markComplete: async (userId, lessonId, activity) => {
      await orm.insert(schema.lessonProgress).values({
        id: crypto.randomUUID(),
        userId,
        lessonId,
        activity,
        completedAt: new Date(),
      });
    },
  };
}
