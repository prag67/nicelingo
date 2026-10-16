// Cloudflare Analytics Engine usage events, modelled on blognice's
// metrics.ts but aggregate-only: Nicelingo serves kids, so no visitor
// id, user id, email, IP, raw user-agent, audio, or transcript is ever
// recorded — only event, language, lesson, coarse outcome, country,
// device/browser category, and path.
//
// Dataset nicelingo_events schema:
//   index1: event name (sampling key)
//   blob1: event name
//   blob2: language code ("en", "es", ... or "")
//   blob3: lesson number ("001", ... or "")
//   blob4: activity id (activity_completed / score_attempt, or "")
//   blob5: detail — verdict (green/yellow/red), plan, or subscription status
//   blob6: path (page_view only, pathname without query)
//   blob7: country code (from cf, server-derived)
//   blob8: device category (Desktop/Mobile/Tablet)
//   blob9: browser family (Chrome/Safari/Firefox/Edge/Opera/Other)
//   blob10: user kind ("guest" | "anon" | "user" | "")
//   double1: event count (always 1)
//   double2: score 0-100 for score_attempt, else 0

export const ANALYTICS_DATASET = "nicelingo_events";
export const EVENTS_BINDING = "EVENTS";

export const ANALYTICS_EVENTS = [
  "page_view",
  "language_selected",
  "lesson_started",
  "activity_completed",
  "score_attempt",
  "checkout_started",
  "subscription_changed",
] as const;
export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number];

// Events a browser may report through the beacon. Everything else is
// recorded server-side where the action was already validated.
export const CLIENT_EVENTS = [
  "page_view",
  "language_selected",
  "lesson_started",
] as const;
export type ClientEventName = (typeof CLIENT_EVENTS)[number];

export type AnalyticsEnv = {
  EVENTS?: AnalyticsEngineDataset;
  CF_ACCOUNT_ID?: string;
  CF_ANALYTICS_TOKEN?: string;
};

export type AnalyticsEvent = {
  name: AnalyticsEventName;
  lang?: string;
  lesson?: string;
  activity?: string;
  detail?: string;
  path?: string;
  country?: string;
  device?: string;
  browser?: string;
  userKind?: "guest" | "anon" | "user" | "";
  score?: number;
};

function clean(value: unknown, max = 80): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

export function isAnalyticsEvent(value: unknown): value is AnalyticsEventName {
  return (
    typeof value === "string" &&
    (ANALYTICS_EVENTS as readonly string[]).includes(value)
  );
}

export function isClientEvent(value: unknown): value is ClientEventName {
  return (
    typeof value === "string" &&
    (CLIENT_EVENTS as readonly string[]).includes(value)
  );
}

/** Broad device/browser categories from the UA — the raw UA never leaves here. */
export function clientCategory(request: Request): {
  device: string;
  browser: string;
} {
  const ua = request.headers.get("user-agent") || "";
  const mobileHint = request.headers.get("sec-ch-ua-mobile");
  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua)
    ? "Tablet"
    : mobileHint === "?1" || /Mobile|iPhone|iPod|Android/i.test(ua)
      ? "Mobile"
      : "Desktop";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Firefox\/|FxiOS\//.test(ua)
      ? "Firefox"
      : /OPR\/|Opera/.test(ua)
        ? "Opera"
        : /Chrome\/|CriOS\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "Other";
  return { device, browser };
}

export function countryOf(request: Request): string {
  const cf = (request as { cf?: { country?: unknown } }).cf;
  return clean(String(cf?.country ?? ""), 2).toUpperCase();
}

/**
 * Record one event. Never throws and never blocks the caller: a missing
 * binding (tests, local without the dataset) or a write failure must not
 * break lessons, scoring, or billing.
 */
export function recordEvent(env: AnalyticsEnv | undefined, event: AnalyticsEvent): void {
  try {
    if (!env?.EVENTS || !isAnalyticsEvent(event.name)) return;
    const score =
      typeof event.score === "number" && Number.isFinite(event.score)
        ? Math.max(0, Math.min(100, Math.round(event.score)))
        : 0;
    env.EVENTS.writeDataPoint({
      indexes: [event.name],
      blobs: [
        event.name,
        clean(event.lang, 8).toLowerCase(),
        clean(event.lesson, 16),
        clean(event.activity, 80),
        clean(event.detail, 80),
        clean(event.path, 300),
        clean(event.country, 2).toUpperCase(),
        clean(event.device, 16),
        clean(event.browser, 16),
        clean(event.userKind, 8),
      ],
      doubles: [1, score],
    });
  } catch {
    /* analytics must never break the product */
  }
}

/** Parse "en-lesson-001" / "lesson-001" / "001" into { lang, lesson }. */
export function parseLessonRef(
  lessonId: unknown,
): { lang: string; lesson: string } {
  const raw = clean(lessonId, 40).toLowerCase();
  const m = /^(?:([a-z]{2})-)?(?:lesson-)?(\d{3})$/.exec(raw);
  if (!m) return { lang: "", lesson: "" };
  return { lang: m[1] ?? "", lesson: m[2] };
}

/**
 * Inline browser beacon: reports page_view only. No identifier is
 * created or stored; the server derives country/device/browser.
 */
export function analyticsBeacon(): string {
  return `<script>(function(){
    if(navigator.webdriver||document.visibilityState==="prerender")return;
    try{
      fetch("/_nicelingo/events",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({event:"page_view",path:location.pathname}),keepalive:true,credentials:"omit"}).catch(function(){});
    }catch(e){}
  })();</script>`;
}

// --- Read-back (Blognice-style Analytics Engine SQL API) ---

type SqlResponse = { data?: Record<string, unknown>[]; errors?: unknown[] };

function analyticsConfig(
  env: AnalyticsEnv,
): { accountId: string; token: string } | null {
  const accountId = env.CF_ACCOUNT_ID?.trim();
  const token = env.CF_ANALYTICS_TOKEN?.trim();
  return accountId && token ? { accountId, token } : null;
}

export function analyticsConfigured(env: AnalyticsEnv): boolean {
  return analyticsConfig(env) !== null;
}

export async function analyticsSql(
  env: AnalyticsEnv,
  query: string,
): Promise<Record<string, unknown>[]> {
  const config = analyticsConfig(env);
  if (!config) throw new Error("Analytics reporting is not configured.");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(config.accountId)}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${config.token}`,
        "content-type": "text/plain; charset=utf-8",
      },
      body: query,
    },
  );
  const responseText = await response.text();
  let result: SqlResponse = {};
  try {
    result = JSON.parse(responseText) as SqlResponse;
  } catch {
    throw new Error(`Analytics Engine returned an invalid response (${response.status}).`);
  }
  if (!response.ok) {
    const detail = JSON.stringify(result.errors ?? result).slice(0, 600);
    // The dataset is created on its first write; until then a query is
    // an empty report, not an operational failure.
    if (/unknown table|table .* (?:does not|doesn't) exist|not found/i.test(detail)) return [];
    throw new Error(`Analytics Engine query failed (${response.status}): ${detail}`);
  }
  if (!Array.isArray(result.data)) {
    throw new Error(`Analytics Engine response contained no data (${response.status}).`);
  }
  return result.data;
}

function numberValue(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export type UsageReport = {
  days: number;
  totals: { event: string; events: number }[];
  daily: { date: string; event: string; events: number }[];
  byLang: { lang: string; event: string; events: number }[];
  lessons: { lesson: string; event: string; events: number }[];
  scores: { verdict: string; attempts: number; avgScore: number }[];
};

export function usageQueries(days: number) {
  const interval = Math.max(1, Math.min(90, Math.trunc(days) || 30));
  const where = `timestamp >= NOW() - INTERVAL '${interval}' DAY`;
  const events = "SUM(_sample_interval)";
  return {
    totals: `SELECT blob1 AS event, ${events} AS events FROM ${ANALYTICS_DATASET} WHERE ${where} GROUP BY event ORDER BY events DESC`,
    daily: `SELECT formatDateTime(timestamp, '%Y-%m-%d') AS date, blob1 AS event, ${events} AS events FROM ${ANALYTICS_DATASET} WHERE ${where} GROUP BY date, event ORDER BY date, event`,
    byLang: `SELECT blob2 AS lang, blob1 AS event, ${events} AS events FROM ${ANALYTICS_DATASET} WHERE ${where} AND blob2 != '' GROUP BY lang, event ORDER BY events DESC LIMIT 100`,
    lessons: `SELECT blob3 AS lesson, blob1 AS event, ${events} AS events FROM ${ANALYTICS_DATASET} WHERE ${where} AND blob3 != '' GROUP BY lesson, event ORDER BY events DESC LIMIT 100`,
    scores: `SELECT blob5 AS verdict, ${events} AS attempts, avg(double2) AS avg_score FROM ${ANALYTICS_DATASET} WHERE ${where} AND blob1 = 'score_attempt' GROUP BY verdict ORDER BY attempts DESC`,
  };
}

export async function usageReport(
  env: AnalyticsEnv,
  days = 30,
): Promise<UsageReport> {
  const safeDays = [7, 30, 90].includes(days) ? days : 30;
  const queries = usageQueries(safeDays);
  const optional = (query: string) =>
    analyticsSql(env, query).catch((error) => {
      console.error(
        JSON.stringify({
          message: "optional analytics query failed",
          error: error instanceof Error ? error.message : String(error),
        }),
      );
      return [] as Record<string, unknown>[];
    });
  const [totals, daily, byLang, lessons, scores] = await Promise.all([
    analyticsSql(env, queries.totals),
    optional(queries.daily),
    optional(queries.byLang),
    optional(queries.lessons),
    optional(queries.scores),
  ]);
  return {
    days: safeDays,
    totals: totals.map((r) => ({ event: String(r.event ?? ""), events: numberValue(r.events) })),
    daily: daily.map((r) => ({
      date: String(r.date ?? ""),
      event: String(r.event ?? ""),
      events: numberValue(r.events),
    })),
    byLang: byLang.map((r) => ({
      lang: String(r.lang ?? ""),
      event: String(r.event ?? ""),
      events: numberValue(r.events),
    })),
    lessons: lessons.map((r) => ({
      lesson: String(r.lesson ?? ""),
      event: String(r.event ?? ""),
      events: numberValue(r.events),
    })),
    scores: scores.map((r) => ({
      verdict: String(r.verdict ?? ""),
      attempts: numberValue(r.attempts),
      avgScore: numberValue(r.avg_score),
    })),
  };
}
