import { eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import { statusGrantsAccess } from "../lib/stripe";

export type SubscriptionRow = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripeSubscriptionCreated: number | null;
  status: string;
  currentPeriodEnd: number | null;
};

export type SubscriptionStore = {
  get(userId: string): Promise<SubscriptionRow | null>;
  isSubscribed(userId: string): Promise<boolean>;
  upsert(sub: Omit<SubscriptionRow, "userId"> & { userId: string }): Promise<void>;
  // Returns false when the event was already seen (safe to ack + skip).
  claimEvent(id: string, type: string): Promise<boolean>;
  markEvent(
    id: string,
    patch: { userId?: string; status: string; lastError?: string | null },
  ): Promise<void>;
};

export function d1SubscriptionStore(db: D1Database): SubscriptionStore {
  const orm: DrizzleD1Database<typeof schema> = drizzle(db, { schema });
  return {
    get: async (userId) => {
      const rows = await orm
        .select()
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, userId))
        .limit(1);
      const row = rows[0];
      if (!row) return null;
      return {
        userId: row.userId,
        stripeCustomerId: row.stripeCustomerId,
        stripeSubscriptionId: row.stripeSubscriptionId,
        stripeSubscriptionCreated: row.stripeSubscriptionCreated,
        status: row.status,
        currentPeriodEnd: row.currentPeriodEnd,
      };
    },
    isSubscribed: async (userId) => {
      const rows = await orm
        .select({ status: schema.subscriptions.status })
        .from(schema.subscriptions)
        .where(eq(schema.subscriptions.userId, userId))
        .limit(1);
      return statusGrantsAccess(rows[0]?.status);
    },
    upsert: async (sub) => {
      await orm
        .insert(schema.subscriptions)
        .values({ ...sub, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.subscriptions.userId,
          set: {
            stripeCustomerId: sub.stripeCustomerId,
            stripeSubscriptionId: sub.stripeSubscriptionId,
            stripeSubscriptionCreated: sub.stripeSubscriptionCreated,
            status: sub.status,
            currentPeriodEnd: sub.currentPeriodEnd,
            updatedAt: new Date(),
          },
        });
    },
    claimEvent: async (id, type) => {
      const done = await orm
        .insert(schema.stripeEvents)
        .values({ id, type, status: "processing" })
        .onConflictDoNothing()
        .returning({ id: schema.stripeEvents.id });
      return done.length > 0;
    },
    markEvent: async (id, patch) => {
      await orm
        .update(schema.stripeEvents)
        .set({
          ...(patch.userId ? { userId: patch.userId } : {}),
          status: patch.status,
          processedAt:
            patch.status === "processed"
              ? Math.floor(Date.now() / 1000)
              : undefined,
          lastError: patch.lastError ?? null,
        })
        .where(eq(schema.stripeEvents.id, id));
    },
  };
}
