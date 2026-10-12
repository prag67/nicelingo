import { eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";

export type PrefsStore = {
  getLastLang: (userId: string) => Promise<string | null>;
  setLastLang: (userId: string, lang: string) => Promise<void>;
};

export function d1PrefsStore(db: D1Database): PrefsStore {
  const orm: DrizzleD1Database<typeof schema> = drizzle(db, { schema });
  return {
    getLastLang: async (userId) => {
      const rows = await orm
        .select({ lastLang: schema.userPrefs.lastLang })
        .from(schema.userPrefs)
        .where(eq(schema.userPrefs.userId, userId));
      return rows[0]?.lastLang ?? null;
    },
    setLastLang: async (userId, lang) => {
      await orm
        .insert(schema.userPrefs)
        .values({ userId, lastLang: lang, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.userPrefs.userId,
          set: { lastLang: lang, updatedAt: new Date() },
        });
    },
  };
}
