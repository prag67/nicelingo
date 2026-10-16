import { afterEach, describe, expect, it, vi } from "vitest";
import app from "../src/index";
import {
  analyticsBeacon,
  analyticsConfigured,
  analyticsSql,
  clientCategory,
  parseLessonRef,
  recordEvent,
  usageReport,
  type AnalyticsEnv,
} from "../src/lib/analytics";

type DataPoint = {
  indexes?: string[];
  blobs?: string[];
  doubles?: number[];
};

function fakeEnv() {
  const points: DataPoint[] = [];
  const env: AnalyticsEnv = {
    EVENTS: {
      writeDataPoint: (p: DataPoint) => points.push(p),
    } as AnalyticsEngineDataset,
  };
  return { env, points };
}

const UA_CHROME_MOBILE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1";

describe("recordEvent", () => {
  it("writes the documented schema, with no identifier fields", () => {
    const { env, points } = fakeEnv();
    recordEvent(env, {
      name: "score_attempt",
      lang: "ES",
      lesson: "001",
      detail: "green",
      score: 92,
      country: "th",
      device: "Mobile",
      browser: "Chrome",
    });
    expect(points).toHaveLength(1);
    expect(points[0].indexes).toEqual(["score_attempt"]);
    expect(points[0].blobs).toEqual([
      "score_attempt",
      "es",
      "001",
      "",
      "green",
      "",
      "TH",
      "Mobile",
      "Chrome",
      "",
    ]);
    expect(points[0].doubles).toEqual([1, 92]);
    // Aggregate-only contract: exactly 10 blobs, none an id/email/ip.
    expect(points[0].blobs).toHaveLength(10);
  });

  it("clamps score and strips control characters", () => {
    const { env, points } = fakeEnv();
    recordEvent(env, {
      name: "score_attempt",
      detail: "green\u0000\n",
      score: 250,
    });
    expect(points[0].doubles).toEqual([1, 100]);
    expect(points[0].blobs?.[4]).toBe("green");
  });

  it("is a no-op without a binding, with an unknown event, or on write failure", () => {
    expect(() =>
      recordEvent(undefined, { name: "page_view" }),
    ).not.toThrow();
    expect(() => recordEvent({}, { name: "page_view" })).not.toThrow();
    const { env, points } = fakeEnv();
    recordEvent(env, { name: "not_an_event" as never });
    expect(points).toHaveLength(0);
    const throwing: AnalyticsEnv = {
      EVENTS: {
        writeDataPoint: () => {
          throw new Error("boom");
        },
      } as unknown as AnalyticsEngineDataset,
    };
    expect(() => recordEvent(throwing, { name: "page_view" })).not.toThrow();
  });
});

describe("clientCategory / parseLessonRef", () => {
  it("derives broad categories only", () => {
    const req = new Request("https://x/", {
      headers: { "user-agent": UA_CHROME_MOBILE },
    });
    expect(clientCategory(req)).toEqual({ device: "Mobile", browser: "Chrome" });
    const desktop = new Request("https://x/", {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15",
      },
    });
    expect(clientCategory(desktop)).toEqual({
      device: "Desktop",
      browser: "Safari",
    });
  });

  it("parses lesson refs and rejects junk", () => {
    expect(parseLessonRef("en-lesson-001")).toEqual({ lang: "en", lesson: "001" });
    expect(parseLessonRef("lesson-042")).toEqual({ lang: "", lesson: "042" });
    expect(parseLessonRef("xx-lesson-001")).toEqual({ lang: "xx", lesson: "001" });
    expect(parseLessonRef("lesson-01")).toEqual({ lang: "", lesson: "" });
    expect(parseLessonRef(undefined)).toEqual({ lang: "", lesson: "" });
  });
});

describe("analyticsBeacon", () => {
  it("posts only event+path to the beacon endpoint, storing nothing", () => {
    const script = analyticsBeacon();
    expect(script).toContain("/_nicelingo/events");
    expect(script).toContain("page_view");
    expect(script).not.toContain("localStorage");
    expect(script).not.toContain("visitor");
    expect(script).not.toContain("randomUUID");
  });

  it("is embedded in the picker/course shell and the lesson page", async () => {
    const home = await (await app.request("/")).text();
    expect(home).toContain("/_nicelingo/events");
    const lesson = await (await app.request("/lesson/en/001")).text();
    expect(lesson).toContain("/_nicelingo/events");
  });
});

describe("POST /_nicelingo/events", () => {
  function post(body: unknown, headers: Record<string, string> = {}) {
    return app.request(
      "/_nicelingo/events",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost",
          "user-agent": UA_CHROME_MOBILE,
          ...headers,
        },
        body: typeof body === "string" ? body : JSON.stringify(body),
      },
      // Hono test env: third arg is Env bindings.
      fakeEnv().env as never,
    );
  }

  it("records a page_view with server-derived context", async () => {
    const { env, points } = fakeEnv();
    const res = await app.request(
      "/_nicelingo/events",
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost",
          "user-agent": UA_CHROME_MOBILE,
        },
        body: JSON.stringify({ event: "page_view", path: "/en" }),
      },
      env as never,
    );
    expect(res.status).toBe(204);
    expect(points).toHaveLength(1);
    expect(points[0].blobs?.[0]).toBe("page_view");
    expect(points[0].blobs?.[5]).toBe("/en");
    expect(points[0].blobs?.[7]).toBe("Mobile");
    expect(points[0].blobs?.[8]).toBe("Chrome");
  });

  it("rejects cross-origin, server-only events, bad paths, and bad JSON", async () => {
    expect((await post({ event: "page_view", path: "/" }, { origin: "https://evil.example" })).status).toBe(403);
    expect((await post({ event: "score_attempt", path: "/" })).status).toBe(400);
    expect((await post({ event: "page_view", path: "https://evil.example/x" })).status).toBe(400);
    expect((await post("{nope")).status).toBe(400);
  });

  it("rejects oversized bodies", async () => {
    const res = await post(
      { event: "page_view", path: "/" },
      { "content-length": "4096" },
    );
    expect(res.status).toBe(413);
  });
});

describe("server-side funnel events", () => {
  it("records language_selected and lesson_started on page routes", async () => {
    const { env, points } = fakeEnv();
    const course = await app.request("/en", {}, env as never);
    expect(course.status).toBe(200);
    const lesson = await app.request("/lesson/en/001", {}, env as never);
    expect(lesson.status).toBe(200);
    const names = points.map((p) => p.blobs?.[0]);
    expect(names).toContain("language_selected");
    expect(names).toContain("lesson_started");
    const started = points.find((p) => p.blobs?.[0] === "lesson_started");
    expect(started?.blobs?.[2]).toBe("001");
  });

  it("does not record lesson_started for an unknown lesson", async () => {
    const { env, points } = fakeEnv();
    const res = await app.request("/lesson/en/999", {}, env as never);
    expect(res.status).toBe(404);
    expect(points).toHaveLength(0);
  });
});

describe("read-back", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("requires CF_ACCOUNT_ID + CF_ANALYTICS_TOKEN", async () => {
    expect(analyticsConfigured({})).toBe(false);
    expect(
      analyticsConfigured({ CF_ACCOUNT_ID: "a", CF_ANALYTICS_TOKEN: "t" }),
    ).toBe(true);
    await expect(analyticsSql({}, "SELECT 1")).rejects.toThrow(
      "not configured",
    );
  });

  it("treats a not-yet-created dataset as an empty report", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ errors: [{ message: "unknown table nicelingo_events" }] }),
          { status: 400 },
        ),
      ),
    );
    const env: AnalyticsEnv = { CF_ACCOUNT_ID: "acc", CF_ANALYTICS_TOKEN: "tok" };
    await expect(analyticsSql(env, "SELECT 1")).resolves.toEqual([]);
  });

  it("maps usageReport rows", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const q = init.body;
        const data = q.includes("blob5 AS verdict")
          ? [{ verdict: "green", attempts: 10, avg_score: 95 }]
          : q.includes("formatDateTime")
            ? [{ date: "2026-10-11", event: "page_view", events: 5 }]
            : q.includes("blob2 AS lang")
              ? [{ lang: "es", event: "lesson_started", events: 3 }]
              : q.includes("blob3 AS lesson")
                ? [{ lesson: "001", event: "lesson_started", events: 3 }]
                : [{ event: "page_view", events: 5 }];
        return new Response(JSON.stringify({ data }), { status: 200 });
      }),
    );
    const env: AnalyticsEnv = { CF_ACCOUNT_ID: "acc", CF_ANALYTICS_TOKEN: "tok" };
    const report = await usageReport(env, 30);
    expect(report.totals).toEqual([{ event: "page_view", events: 5 }]);
    expect(report.scores).toEqual([
      { verdict: "green", attempts: 10, avgScore: 95 },
    ]);
    expect(report.byLang[0].lang).toBe("es");
  });
});
