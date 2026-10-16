import { lessons } from "../lessons/curriculum";

const LESSON_ORDER: Record<string, readonly string[]> = Object.fromEntries(
  Object.values(lessons).flatMap((langs) =>
    Object.values(langs).map((m) => [m.id, m.activities]),
  ),
);

export type ProgressStore = {
  listCompleted(userId: string, lessonId: string): Promise<string[]>;
  listAll(userId: string): Promise<Record<string, string[]>>;
  /** UTC day strings (YYYY-MM-DD) with at least one completed activity. */
  listActivityDays(userId: string): Promise<string[]>;
  markComplete(
    userId: string,
    lessonId: string,
    activity: string,
  ): Promise<void>;
};

export type CompletionResult =
  | { ok: true; completed: string[] }
  | { ok: false; error: string };

// Activities unlock strictly in order: an activity can only complete when
// every predecessor is already complete. Unknown lessons/activities rejected.
export async function completeActivity(
  store: ProgressStore,
  userId: string,
  lessonId: string,
  activity: string,
): Promise<CompletionResult> {
  const order = LESSON_ORDER[lessonId];
  if (!order) return { ok: false, error: "unknown lesson" };
  const index = order.indexOf(activity);
  if (index === -1) return { ok: false, error: "unknown activity" };
  const completed = await store.listCompleted(userId, lessonId);
  if (completed.includes(activity)) return { ok: true, completed };
  const predecessorsDone = order
    .slice(0, index)
    .every((a) => completed.includes(a));
  if (!predecessorsDone) return { ok: false, error: "out of order" };
  await store.markComplete(userId, lessonId, activity);
  return { ok: true, completed: [...completed, activity] };
}
