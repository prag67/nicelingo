import { describe, expect, it } from "vitest";
import { completeActivity, type ProgressStore } from "../src/lib/progress";

function memoryStore(): ProgressStore {
  const completed = new Map<string, string[]>();
  const key = (userId: string, lessonId: string) => `${userId}:${lessonId}`;
  return {
    listCompleted: async (userId, lessonId) =>
      completed.get(key(userId, lessonId)) ?? [],
    listAll: async (userId) => {
      const grouped: Record<string, string[]> = {};
      for (const [k, v] of completed) {
        if (k.startsWith(`${userId}:`)) grouped[k.slice(userId.length + 1)] = v;
      }
      return grouped;
    },
    markComplete: async (userId, lessonId, activity) => {
      const k = key(userId, lessonId);
      completed.set(k, [...(completed.get(k) ?? []), activity]);
    },
  };
}

describe("completeActivity", () => {
  it("completes the first activity and lists it", async () => {
    const store = memoryStore();
    const result = await completeActivity(
      store,
      "user-1",
      "lesson-001",
      "listen-match",
    );
    expect(result).toEqual({ ok: true, completed: ["listen-match"] });
    expect(await store.listCompleted("user-1", "lesson-001")).toEqual([
      "listen-match",
    ]);
  });

  it("rejects completing an activity before its predecessors", async () => {
    const store = memoryStore();
    const result = await completeActivity(
      store,
      "user-1",
      "lesson-001",
      "speak-score",
    );
    expect(result.ok).toBe(false);
    expect(await store.listCompleted("user-1", "lesson-001")).toEqual([]);
  });

  it("rejects unknown activities and lessons", async () => {
    const store = memoryStore();
    expect(
      (await completeActivity(store, "user-1", "lesson-001", "nope")).ok,
    ).toBe(false);
    expect(
      (await completeActivity(store, "user-1", "lesson-99", "listen-match")).ok,
    ).toBe(false);
  });

  it("gates Xxian lessons identically", async () => {
    const store = memoryStore();
    expect(
      (await completeActivity(store, "user-1", "xx-lesson-001", "speak-score")).ok,
    ).toBe(false);
    const result = await completeActivity(
      store,
      "user-1",
      "xx-lesson-001",
      "listen-match",
    );
    expect(result).toEqual({ ok: true, completed: ["listen-match"] });
  });

  it("re-completing an activity is idempotent", async () => {
    const store = memoryStore();
    await completeActivity(store, "user-1", "lesson-001", "listen-match");
    const result = await completeActivity(
      store,
      "user-1",
      "lesson-001",
      "listen-match",
    );
    expect(result).toEqual({ ok: true, completed: ["listen-match"] });
  });
});
