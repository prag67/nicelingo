import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

// Core Better Auth tables (D1/SQLite). Matches `auth generate` output;
// `isAnonymous` on user comes from the anonymous plugin.
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  isAnonymous: integer("is_anonymous", { mode: "boolean" }),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const userPrefs = sqliteTable("user_prefs", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  lastLang: text("last_lang").notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const lessonProgress = sqliteTable("lesson_progress", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  lessonId: text("lesson_id").notNull(),
  activity: text("activity").notNull(),
  completedAt: integer("completed_at", { mode: "timestamp" }).notNull(),
});

export const phraseStats = sqliteTable("phrase_stats", {
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  phraseId: text("phrase_id").notNull(),
  lang: text("lang").notNull(),
  attempts: integer("attempts").notNull(),
  correct: integer("correct").notNull(),
  bestSpeakScore: integer("best_speak_score"),
  lastSeenAt: text("last_seen_at").notNull(),
  weak: integer("weak").notNull(),
  correctStreak: integer("correct_streak").notNull(),
});

export const milestones = sqliteTable("milestones", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(),
  lang: text("lang").notNull(),
  level: integer("level").notNull(),
  unit: integer("unit"),
  score: integer("score").notNull(),
  passed: integer("passed").notNull(),
  viaTestOut: integer("via_test_out").notNull(),
  completedAt: text("completed_at").notNull(),
});

export const subscriptions = sqliteTable("subscriptions", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeSubscriptionCreated: integer("stripe_subscription_created"),
  status: text("status").notNull().default("none"),
  currentPeriodEnd: integer("current_period_end"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const stripeEvents = sqliteTable("stripe_events", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  userId: text("user_id"),
  status: text("status").notNull().default("processing"),
  processedAt: integer("processed_at"),
  lastError: text("last_error"),
});

// Staff admin (separate staff Worker, Cloudflare Access login).
// subject is the Access JWT `sub`; roles gate future mutations.
export const staffUsers = sqliteTable("staff_users", {
  subject: text("subject").primaryKey(),
  email: text("email").notNull(),
  role: text("role").notNull().default("read_only"),
  active: integer("active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const staffAuditEvents = sqliteTable("staff_audit_events", {
  id: text("id").primaryKey(),
  occurredAt: integer("occurred_at").notNull(),
  subject: text("subject").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason"),
  result: text("result").notNull(),
  requestId: text("request_id"),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
});

// Linked students: a registered account holder (e.g. a parent/teacher)
// requests a link to a student's own registered account by email; the
// student must accept before the holder can see their progress summary.
// status: pending -> accepted | declined (declined rows are deleted by
// the respond handler, so only pending/accepted persist in practice).
export const studentLinks = sqliteTable("student_links", {
  id: text("id").primaryKey(),
  holderUserId: text("holder_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  studentUserId: text("student_user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  respondedAt: integer("responded_at", { mode: "timestamp" }),
}, (t) => ({
  holderStudent: uniqueIndex("student_links_holder_student").on(t.holderUserId, t.studentUserId),
}));

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});
