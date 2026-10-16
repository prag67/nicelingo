import { and, eq, sql } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { ProgressRow } from "../lib/students";

export type StudentLink = {
  id: string;
  holderUserId: string;
  studentUserId: string;
  status: string;
  createdAt: Date;
  respondedAt: Date | null;
  holderEmail: string | null;
  holderName: string | null;
  studentEmail: string | null;
  studentName: string | null;
};

function orm(db: D1Database): DrizzleD1Database<typeof schema> {
  return drizzle(db, { schema });
}

function toLink(row: {
  link: typeof schema.studentLinks.$inferSelect;
  holderEmail?: string | null;
  holderName?: string | null;
  studentEmail?: string | null;
  studentName?: string | null;
}): StudentLink {
  return {
    id: row.link.id,
    holderUserId: row.link.holderUserId,
    studentUserId: row.link.studentUserId,
    status: row.link.status,
    createdAt: row.link.createdAt,
    respondedAt: row.link.respondedAt ?? null,
    holderEmail: row.holderEmail ?? null,
    holderName: row.holderName ?? null,
    studentEmail: row.studentEmail ?? null,
    studentName: row.studentName ?? null,
  };
}

export function d1StudentStore(db: D1Database) {
  const o = orm(db);
  return {
    /** Registered (non-anonymous) user by email, case-insensitive. */
    async findRegisteredByEmail(email: string) {
      const rows = await o
        .select()
        .from(schema.user)
        .where(sql`lower(${schema.user.email}) = ${email.trim().toLowerCase()}`);
      const u = rows[0];
      if (!u || u.isAnonymous) return null;
      return u;
    },

    async getLink(id: string): Promise<StudentLink | null> {
      const rows = await o
        .select({ link: schema.studentLinks })
        .from(schema.studentLinks)
        .where(eq(schema.studentLinks.id, id));
      return rows[0] ? toLink(rows[0]) : null;
    },

    async findLink(holderUserId: string, studentUserId: string): Promise<StudentLink | null> {
      const rows = await o
        .select({ link: schema.studentLinks })
        .from(schema.studentLinks)
        .where(
          and(
            eq(schema.studentLinks.holderUserId, holderUserId),
            eq(schema.studentLinks.studentUserId, studentUserId),
          ),
        );
      return rows[0] ? toLink(rows[0]) : null;
    },

    async createLink(holderUserId: string, studentUserId: string): Promise<StudentLink> {
      const link = {
        id: crypto.randomUUID(),
        holderUserId,
        studentUserId,
        status: "pending",
        createdAt: new Date(),
        respondedAt: null,
      };
      await o.insert(schema.studentLinks).values(link);
      return toLink({ link });
    },

    async setStatus(id: string, status: "accepted" | "declined"): Promise<void> {
      await o
        .update(schema.studentLinks)
        .set({ status, respondedAt: new Date() })
        .where(eq(schema.studentLinks.id, id));
    },

    async deleteLink(id: string): Promise<void> {
      await o.delete(schema.studentLinks).where(eq(schema.studentLinks.id, id));
    },

    /** Links where this user is the holder, with student identity. */
    async listForHolder(holderUserId: string): Promise<StudentLink[]> {
      const rows = await o
        .select({
          link: schema.studentLinks,
          studentEmail: schema.user.email,
          studentName: schema.user.name,
        })
        .from(schema.studentLinks)
        .innerJoin(schema.user, eq(schema.user.id, schema.studentLinks.studentUserId))
        .where(eq(schema.studentLinks.holderUserId, holderUserId));
      return rows.map(toLink);
    },

    /** Links where this user is the student, with holder identity. */
    async listForStudent(studentUserId: string): Promise<StudentLink[]> {
      const rows = await o
        .select({
          link: schema.studentLinks,
          holderEmail: schema.user.email,
          holderName: schema.user.name,
        })
        .from(schema.studentLinks)
        .innerJoin(schema.user, eq(schema.user.id, schema.studentLinks.holderUserId))
        .where(eq(schema.studentLinks.studentUserId, studentUserId));
      return rows.map(toLink);
    },

    async progressRows(userId: string): Promise<ProgressRow[]> {
      const rows = await o
        .select({
          lessonId: schema.lessonProgress.lessonId,
          activity: schema.lessonProgress.activity,
          completedAt: schema.lessonProgress.completedAt,
        })
        .from(schema.lessonProgress)
        .where(eq(schema.lessonProgress.userId, userId));
      return rows;
    },
  };
}

export type StudentStore = ReturnType<typeof d1StudentStore>;
