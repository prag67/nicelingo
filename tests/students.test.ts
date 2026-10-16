import { describe, expect, it } from "vitest";
import app from "../src/index";
import { langOfLessonKey, MAX_STUDENTS, summarizeProgress } from "../src/lib/students";
import { studentsPage } from "../src/routes/students";

// NOTE: fake curriculum (xx has 8 lessons, yy partial 001-004; en keys
// carry no language prefix). Summaries only count started languages.
const DONE = ["listen-match", "image-phrase", "speak-score", "read-write"];

describe("progress key parsing", () => {
  it("parses prefixed and English keys", () => {
    expect(langOfLessonKey("lesson-001")).toEqual({ lang: "en", n: "001" });
    expect(langOfLessonKey("es-lesson-050")).toEqual({ lang: "es", n: "050" });
    expect(langOfLessonKey("nonsense")).toBeNull();
  });
});

describe("student progress summary", () => {
  it("summarises per language with next lesson and last activity", () => {
    const at = (d: number) => new Date(`2026-10-${String(d).padStart(2, "0")}T10:00:00Z`);
    const rows = [
      ...DONE.map((activity) => ({ lessonId: "xx-lesson-001", activity, completedAt: at(1) })),
      { lessonId: "xx-lesson-002", activity: "listen-match", completedAt: at(3) },
      ...DONE.map((activity) => ({ lessonId: "lesson-001", activity, completedAt: at(2) })),
      { lessonId: "bogus", activity: "listen-match", completedAt: at(9) },
    ];
    const s = summarizeProgress(rows);
    expect(s.languages.map((l) => l.lang)).toEqual(["en", "xx"]);
    const xx = s.languages.find((l) => l.lang === "xx")!;
    expect(xx.lessonsDone).toBe(1);
    expect(xx.lessonsTotal).toBe(8);
    expect(xx.nextLesson).toBe("002");
    expect(xx.lastActivityAt).toBe(at(3).getTime());
    const en = s.languages.find((l) => l.lang === "en")!;
    expect(en.lessonsDone).toBe(1);
    expect(s.lastActivityAt).toBe(at(3).getTime());
  });

  it("reports no languages before any activity", () => {
    expect(summarizeProgress([])).toEqual({ languages: [], lastActivityAt: null });
  });
});

describe("students routes require a registered account", () => {
  it("redirects guests from /students to sign-in", async () => {
    const res = await app.request("/students");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("403s student APIs without a registered session", async () => {
    for (const path of ["/api/students/request", "/api/students/respond", "/api/students/remove"]) {
      const res = await app.request(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      expect(res.status, path).toBe(403);
    }
  });
});

describe("students page", () => {
  it("renders students, summaries, and pending states", () => {
    const html = studentsPage({
      email: "holder@example.com",
      students: [
        {
          linkId: "l1",
          email: "mia@example.com",
          name: "Mia",
          summary: {
            languages: [
              { lang: "xx", lessonsDone: 3, lessonsTotal: 8, nextLesson: "004", nextLessonTitle: "Wug Words", lastActivityAt: Date.UTC(2026, 9, 10) },
            ],
            lastActivityAt: Date.UTC(2026, 9, 10),
          },
        },
      ],
      outgoingPending: [{ linkId: "l2", email: "pending@example.com" }],
      incomingPending: [{ linkId: "l3", email: "teacher@example.com", name: "Teach" }],
      viewers: [],
    });
    expect(html).toContain("Mia");
    expect(html).toContain("mia@example.com");
    expect(html).toContain("3 of 8 lessons done");
    expect(html).toContain("Next: lesson 4");
    expect(html).toContain("Waiting for acceptance");
    expect(html).toContain("Requests for you");
    expect(html).toContain(`up to ${MAX_STUDENTS} students`);
    expect(html).toContain('id="add-form"');
  });
});
