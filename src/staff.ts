// Nicelingo staff admin — a separate Worker (nicelingo-staff) sharing
// the main D1, modelled on blognice-staff. Cloudflare Access (Zero
// Trust) is the login: Access fronts this Worker's URL and injects a
// signed JWT in Cf-Access-Jwt-Assertion. This Worker never trusts the
// header alone — it verifies the RS256 signature against the team
// certs, checks iss/aud/exp, then maps the Access subject to a role
// via staff_users (STAFF_ALLOWED_EMAILS is the admin bootstrap
// fallback). Unconfigured Access fails closed (403 on everything
// except /health). v1 is read-only: dashboard, users, subscriptions,
// analytics, audit log.
import { Hono } from "hono";
import { escapeHtml as esc } from "./lib/lesson-progress";
import {
  analyticsConfigured,
  usageReport,
  type UsageReport,
} from "./lib/analytics";

export type StaffRole = "read_only" | "support" | "admin";
export type StaffIdentity = { subject: string; email: string; role: StaffRole };

export type StaffBindings = {
  DB: D1Database;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  STAFF_ALLOWED_EMAILS?: string;
  CF_ACCOUNT_ID?: string;
  CF_ANALYTICS_TOKEN?: string;
  EVENTS?: AnalyticsEngineDataset;
};

type AccessClaims = {
  sub?: string;
  email?: string;
  aud?: string[] | string;
  iss?: string;
  exp?: number;
  iat?: number;
};

const STAFF_ROLES = new Set<StaffRole>(["read_only", "support", "admin"]);

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const raw = atob(normalized);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(value))) as T;
}

function normalizedTeamDomain(value: string): string {
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

export async function accessClaims(
  c: { req: { header(name: string): string | undefined }; env: StaffBindings },
): Promise<AccessClaims | null> {
  const token = c.req.header("Cf-Access-Jwt-Assertion");
  const team = String(c.env.ACCESS_TEAM_DOMAIN || "").trim();
  const audience = String(c.env.ACCESS_AUD || "").trim();
  if (!token || !team || !audience) return null;
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) return null;
    const header = decodeJson<{ alg?: string; kid?: string }>(encodedHeader);
    const claims = decodeJson<AccessClaims>(encodedPayload);
    if (header.alg !== "RS256" || !header.kid || !claims.sub || !claims.email) return null;
    const now = Math.floor(Date.now() / 1000);
    if (!claims.exp || claims.exp <= now || (claims.iat && claims.iat > now + 60)) return null;
    const issuer = normalizedTeamDomain(team);
    if (!claims.iss || claims.iss.replace(/\/+$/, "") !== issuer) return null;
    const audiences = Array.isArray(claims.aud) ? claims.aud : claims.aud ? [claims.aud] : [];
    if (!audiences.includes(audience)) return null;
    const certs = await fetch(`${issuer}/cdn-cgi/access/certs`, {
      cf: { cacheTtl: 300 },
    } as RequestInit).then((res) =>
      res.ok ? res.json<{ keys?: JsonWebKey[] }>() : null,
    );
    const key = certs?.keys?.find(
      (candidate) => (candidate as JsonWebKey & { kid?: string }).kid === header.kid,
    );
    if (!key) return null;
    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      key,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      base64UrlDecode(encodedSignature) as BufferSource,
      new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
    );
    return valid ? claims : null;
  } catch {
    return null;
  }
}

export async function resolveStaff(
  c: { req: { header(name: string): string | undefined }; env: StaffBindings },
): Promise<StaffIdentity | null> {
  const claims = await accessClaims(c);
  if (!claims?.sub || !claims.email) return null;
  try {
    const row = (await c.env.DB.prepare(
      "SELECT subject, email, role FROM staff_users WHERE subject = ? AND active = 1",
    )
      .bind(claims.sub)
      .first()) as { subject: string; email: string; role: string } | null;
    if (row && STAFF_ROLES.has(row.role as StaffRole)) {
      return { subject: row.subject, email: row.email, role: row.role as StaffRole };
    }
  } catch {
    /* staff_users may not be migrated yet — allowlist still applies */
  }
  const email = String(claims.email).trim();
  const allowed = String(c.env.STAFF_ALLOWED_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.includes(email.toLowerCase())) {
    return { subject: claims.sub, email, role: "admin" };
  }
  return null;
}

export function canMutate(staff: StaffIdentity): boolean {
  return staff.role === "support" || staff.role === "admin";
}
export function canAdmin(staff: StaffIdentity): boolean {
  return staff.role === "admin";
}

export function sameOrigin(c: {
  req: { header(name: string): string | undefined; url: string };
}): boolean {
  const origin = c.req.header("origin");
  const requestUrl = new URL(c.req.url);
  const host = c.req.header("host");
  const origins = new Set([requestUrl.origin]);
  if (host) origins.add(`${requestUrl.protocol}//${host}`);
  if (origin) return origins.has(origin);
  if (c.req.header("sec-fetch-site") === "same-origin") return true;
  const referer = c.req.header("referer");
  if (!referer) return false;
  try {
    return origins.has(new URL(referer).origin);
  } catch {
    return false;
  }
}

function requestId(c: { req: { header(name: string): string | undefined } }): string {
  return c.req.header("cf-ray") || c.req.header("x-request-id") || crypto.randomUUID();
}

/** Record a staff action. Future mutation routes must call this; the
 *  audit page reads the same table. Never throws into the request. */
export async function audit(
  c: { env: StaffBindings; req: { header(name: string): string | undefined } },
  staff: StaffIdentity,
  event: {
    action: string;
    targetType: string;
    targetId: string;
    reason?: string;
    result: string;
    before?: unknown;
    after?: unknown;
  },
): Promise<void> {
  try {
    await c.env.DB.prepare(
      `INSERT INTO staff_audit_events
        (id, occurred_at, subject, email, role, action, target_type, target_id,
         reason, result, request_id, before_json, after_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        crypto.randomUUID(),
        Math.floor(Date.now() / 1000),
        staff.subject,
        staff.email,
        staff.role,
        event.action,
        event.targetType,
        event.targetId,
        event.reason || null,
        event.result,
        requestId(c),
        event.before == null ? null : JSON.stringify(event.before),
        event.after == null ? null : JSON.stringify(event.after),
      )
      .run();
  } catch {
    /* audit storage must not break the staff page */
  }
}

// --- Rendering (layout adapted from blognice-staff, Nicelingo brand) ---

function fmtDate(value: unknown): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return "—";
  const ms = n < 1e12 ? n * 1000 : n;
  return new Date(ms).toISOString().slice(0, 10);
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function staffHeader(staff: StaffIdentity): string {
  return `<header class="staff-top"><a class="staff-brand" href="/">nicelingo <span>staff</span></a><div class="staff-top-meta"><small>${esc(staff.email)} · ${esc(staff.role)}</small><a class="logout" href="/cdn-cgi/access/logout">Log out</a><button class="staff-menu-toggle" type="button" aria-controls="staff-sidebar" aria-expanded="false">Menu</button></div></header><div class="staff-shell"><aside class="staff-sidebar" id="staff-sidebar"><nav class="staff-nav" aria-label="Staff navigation"><a href="/" data-staff-nav>Dashboard</a><a href="/users" data-staff-nav>Users</a><a href="/subscriptions" data-staff-nav>Subscriptions</a><a href="/analytics" data-staff-nav>Analytics</a><a href="/audit" data-staff-nav>Audit log</a></nav></aside><div class="staff-content">`;
}

function staffPage(title: string, staff: StaffIdentity, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · nicelingo staff</title><style>
:root{color-scheme:light;--ink:#0e1b3d;--muted:#4c5873;--rule:#d3e2f5;--paper:#eef6ff;--accent:#1a5feb;--accent-soft:#e3eeff;--card:#fff;--bad:#b00020;--warn:#7a5b00}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}.staff-top{min-height:64px;display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:0 28px;background:var(--card);border-bottom:1px solid var(--rule)}.staff-brand{font-size:1.15rem;font-weight:800;color:var(--ink);text-decoration:none}.staff-brand span{font-weight:500;color:var(--muted)}.staff-top-meta{display:flex;align-items:center;gap:12px}.staff-top-meta small{color:var(--muted)}.logout{font-size:.86rem;color:var(--muted);border:1px solid var(--rule);padding:6px 10px;border-radius:8px;text-decoration:none}.staff-menu-toggle{display:none;border:1px solid var(--rule);background:var(--card);border-radius:8px;padding:6px 10px;font:inherit;cursor:pointer}.staff-shell{display:flex;min-height:calc(100vh - 64px)}.staff-sidebar{width:220px;flex:0 0 220px;background:var(--card);border-right:1px solid var(--rule);padding:22px 12px}.staff-nav{display:flex;flex-direction:column;gap:4px}.staff-nav a{color:var(--muted);text-decoration:none;padding:9px 12px;border-radius:8px}.staff-nav a.active{color:#0f3fae;background:var(--accent-soft);font-weight:650}.staff-content{width:min(1120px,100%);margin:0 auto;padding:28px}h1{font-size:1.5rem;margin:0 0 6px}h2{font-size:1.1rem;margin:22px 0 8px}.muted{color:var(--muted)}.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:16px 0}.stat{background:var(--card);border:1px solid var(--rule);border-radius:12px;padding:16px}.stat strong{display:block;font-size:1.9rem;line-height:1.1}.card{background:var(--card);border:1px solid var(--rule);border-radius:12px;padding:18px;margin:14px 0}.notice{padding:12px 14px;border-radius:8px;background:#fff4d6;color:var(--warn);margin:12px 0}.notice.bad{background:#fde8ea;color:var(--bad)}table{width:100%;border-collapse:collapse;background:var(--card)}th,td{text-align:left;padding:9px 8px;border-bottom:1px solid var(--rule);vertical-align:top;overflow-wrap:anywhere}th{font-size:.75rem;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}.badge{display:inline-block;border-radius:999px;padding:2px 9px;font-size:.78rem;background:var(--accent-soft);color:#0f3fae}.badge.bad{background:#fde8ea;color:var(--bad)}.search{display:flex;gap:8px;margin:16px 0}.search input{flex:1;padding:10px 12px;border:1px solid var(--rule);border-radius:8px;font:inherit;background:#fff}.btn{border:1px solid var(--rule);background:#fff;border-radius:8px;padding:9px 13px;font:inherit;cursor:pointer;text-decoration:none;color:var(--ink)}.pager{display:flex;gap:8px;margin:14px 0}@media(max-width:760px){.staff-menu-toggle{display:block}.staff-top-meta small{display:none}.staff-sidebar{display:none}.staff-sidebar.open{display:block;position:fixed;z-index:10;top:64px;bottom:0;left:0}.staff-content{padding:20px 14px}}
</style></head><body>${staffHeader(staff)}${body}</div></div><script>(function(){var path=location.pathname;document.querySelectorAll("[data-staff-nav]").forEach(function(l){var t=l.getAttribute("href");if(t==="/" ? path==="/" : path.indexOf(t)===0)l.classList.add("active")});var tg=document.querySelector(".staff-menu-toggle"),sb=document.getElementById("staff-sidebar");if(tg&&sb)tg.addEventListener("click",function(){var o=sb.classList.toggle("open");tg.setAttribute("aria-expanded",String(o))});})();</script></body></html>`;
}

// --- Data helpers ---

async function count(db: D1Database, sql: string, ...params: unknown[]): Promise<number> {
  try {
    const row = (await db.prepare(sql).bind(...params).first()) as { n?: unknown } | null;
    return num(row?.n);
  } catch {
    return 0;
  }
}

async function all<T>(db: D1Database, sql: string, ...params: unknown[]): Promise<T[]> {
  try {
    const res = await db.prepare(sql).bind(...params).all<T>();
    return res.results ?? [];
  } catch {
    return [];
  }
}

function boundedPage(value: string | undefined): number {
  const parsed = Number(value || 1);
  return Number.isSafeInteger(parsed) && parsed >= 1 && parsed <= 10_000_000 ? parsed : 1;
}

function subBadge(status: unknown): string {
  const s = String(status ?? "none");
  if (s === "active" || s === "trialing") return `<span class="badge">${esc(s)}</span>`;
  if (s === "past_due" || s === "canceled") return `<span class="badge bad">${esc(s)}</span>`;
  return `<span class="muted">${esc(s)}</span>`;
}

function analyticsSection(report: UsageReport | null, configured: boolean): string {
  if (!configured) {
    return `<div class="notice">Analytics read-back is not configured. Set the <code>CF_ANALYTICS_TOKEN</code> secret (Account Analytics Read) on the staff Worker to enable it. Event collection already runs without it.</div>`;
  }
  if (!report) {
    return `<div class="notice bad">Analytics are temporarily unavailable. Check the staff Worker Analytics token and its Account Analytics Read permission.</div>`;
  }
  const totals = report.totals
    .map((r) => `<tr><td>${esc(r.event)}</td><td>${r.events}</td></tr>`)
    .join("");
  return `<p class="muted">Last ${report.days} days · approximate, sampling-based counts from Analytics Engine.</p><table><thead><tr><th>Event</th><th>Events</th></tr></thead><tbody>${totals || `<tr><td colspan="2">No events yet.</td></tr>`}</tbody></table>`;
}

async function loadReport(env: StaffBindings, days: number): Promise<UsageReport | null> {
  if (!analyticsConfigured(env)) return null;
  try {
    return await usageReport(env, days);
  } catch {
    return null;
  }
}

// --- App ---

const app = new Hono<{
  Bindings: StaffBindings;
  Variables: { staff: StaffIdentity };
}>();

app.get("/health", (c) => c.json({ ok: true, service: "nicelingo-staff" }));

app.use("*", async (c, next) => {
  const staff = await resolveStaff(c);
  if (!staff) {
    return c.html(
      `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Staff authorization required</title></head><body style="font-family:system-ui,sans-serif;padding:3rem"><h1>Staff authorization required</h1><p>Sign in through Cloudflare Access, then reload. If you are already signed in, your account is not on the staff list.</p></body></html>`,
      403,
    );
  }
  c.set("staff", staff);
  await next();
});

app.get("/", async (c) => {
  const staff = c.get("staff");
  const db = c.env.DB;
  const [users, registered, anon, subscribed, learners, activities, report] =
    await Promise.all([
      count(db, "SELECT COUNT(*) AS n FROM user"),
      count(db, "SELECT COUNT(*) AS n FROM user WHERE COALESCE(is_anonymous,0) = 0"),
      count(db, "SELECT COUNT(*) AS n FROM user WHERE COALESCE(is_anonymous,0) = 1"),
      count(db, "SELECT COUNT(*) AS n FROM subscriptions WHERE status IN ('active','trialing')"),
      count(db, "SELECT COUNT(DISTINCT user_id) AS n FROM lesson_progress"),
      count(db, "SELECT COUNT(*) AS n FROM lesson_progress"),
      loadReport(c.env, 30),
    ]);
  const body = `<h1>Dashboard</h1><p class="muted">Accounts and learning activity, exact from D1. Usage events below are approximate.</p>
<div class="stats">
<div class="stat"><span class="muted">Users</span><strong>${users}</strong><span class="muted">${registered} registered · ${anon} anonymous</span></div>
<div class="stat"><span class="muted">Subscribed</span><strong>${subscribed}</strong><span class="muted">active or trialing</span></div>
<div class="stat"><span class="muted">Learners with progress</span><strong>${learners}</strong><span class="muted">${activities} activities completed</span></div>
</div>
<div class="card"><h2>Usage events</h2>${analyticsSection(report, analyticsConfigured(c.env))}<p><a href="/analytics">Full analytics</a></p></div>`;
  return c.html(staffPage("Dashboard", staff, body));
});

type UserRow = {
  id: string;
  name: string;
  email: string;
  is_anonymous: number | null;
  created_at: number;
  sub_status: string | null;
  activities: number;
};

app.get("/users", async (c) => {
  const staff = c.get("staff");
  const q = String(c.req.query("q") || "").trim().slice(0, 100);
  const page = boundedPage(c.req.query("page"));
  const limit = 50;
  const pattern = `%${q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = q
    ? "WHERE (u.email LIKE ? ESCAPE '\\' OR u.name LIKE ? ESCAPE '\\' OR u.id LIKE ? ESCAPE '\\')"
    : "";
  const params = q ? [pattern, pattern, pattern] : [];
  const rows = await all<UserRow>(
    c.env.DB,
    `SELECT u.id, u.name, u.email, u.is_anonymous, u.created_at,
            (SELECT status FROM subscriptions s WHERE s.user_id = u.id) AS sub_status,
            (SELECT COUNT(*) FROM lesson_progress p WHERE p.user_id = u.id) AS activities
       FROM user u ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    ...params,
    limit,
    (page - 1) * limit,
  );
  const trs = rows
    .map(
      (u) => `<tr><td><a href="/users/${esc(encodeURIComponent(u.id))}">${esc(u.email)}</a><br><span class="muted">${esc(u.name || "")}</span></td><td>${u.is_anonymous ? "anonymous" : "registered"}</td><td>${subBadge(u.sub_status)}</td><td>${num(u.activities)}</td><td>${fmtDate(u.created_at)}</td></tr>`,
    )
    .join("");
  const body = `<h1>Users</h1><form class="search" method="get" action="/users"><input name="q" value="${esc(q)}" placeholder="Search email, name, or user id" aria-label="Search users"><button class="btn" type="submit">Search</button></form>
<table><thead><tr><th>User</th><th>Kind</th><th>Subscription</th><th>Activities</th><th>Joined</th></tr></thead><tbody>${trs || `<tr><td colspan="5">No users found.</td></tr>`}</tbody></table>
<div class="pager">${page > 1 ? `<a class="btn" href="/users?q=${esc(encodeURIComponent(q))}&page=${page - 1}">Previous</a>` : ""}${rows.length === limit ? `<a class="btn" href="/users?q=${esc(encodeURIComponent(q))}&page=${page + 1}">Next</a>` : ""}</div>`;
  return c.html(staffPage("Users", staff, body));
});

app.get("/users/:id", async (c) => {
  const staff = c.get("staff");
  const id = c.req.param("id");
  const user = (await c.env.DB.prepare(
    "SELECT id, name, email, email_verified, is_anonymous, created_at, updated_at FROM user WHERE id = ?",
  )
    .bind(id)
    .first()
    .catch(() => null)) as Record<string, unknown> | null;
  if (!user) return c.html(staffPage("User not found", staff, `<h1>User not found</h1>`), 404);
  const [pref, sub, progress, lessonCounts, activeSessions] = await Promise.all([
    c.env.DB.prepare("SELECT last_lang, updated_at FROM user_prefs WHERE user_id = ?")
      .bind(id).first().catch(() => null) as Promise<Record<string, unknown> | null>,
    c.env.DB.prepare("SELECT status, stripe_customer_id, current_period_end, updated_at FROM subscriptions WHERE user_id = ?")
      .bind(id).first().catch(() => null) as Promise<Record<string, unknown> | null>,
    all(c.env.DB, "SELECT lesson_id, activity, completed_at FROM lesson_progress WHERE user_id = ? ORDER BY completed_at DESC LIMIT 50", id),
    all(c.env.DB, "SELECT lesson_id, COUNT(*) AS n FROM lesson_progress WHERE user_id = ? GROUP BY lesson_id ORDER BY lesson_id", id),
    count(c.env.DB, "SELECT COUNT(*) AS n FROM session WHERE user_id = ? AND expires_at > ?", id, Math.floor(Date.now() / 1000)),
  ]);
  const lessons = (lessonCounts as Record<string, unknown>[])
    .map((r) => `<tr><td>${esc(String(r.lesson_id))}</td><td>${num(r.n)}</td></tr>`)
    .join("");
  const recent = (progress as Record<string, unknown>[])
    .map((r) => `<tr><td>${esc(String(r.lesson_id))}</td><td>${esc(String(r.activity))}</td><td>${fmtDate(r.completed_at)}</td></tr>`)
    .join("");
  const body = `<h1>${esc(String(user.email))}</h1><p class="muted">${user.is_anonymous ? "Anonymous" : "Registered"} · joined ${fmtDate(user.created_at)} · ${activeSessions} active session(s) · last language ${esc(String(pref?.last_lang ?? "—"))}</p>
<div class="card"><h2>Subscription</h2><p>${subBadge(sub?.status)} <span class="muted">period ends ${fmtDate(sub?.current_period_end)} · updated ${fmtDate(sub?.updated_at)}</span></p></div>
<div class="card"><h2>Progress by lesson</h2><table><thead><tr><th>Lesson</th><th>Activities</th></tr></thead><tbody>${lessons || `<tr><td colspan="2">No progress yet.</td></tr>`}</tbody></table></div>
<div class="card"><h2>Recent activity</h2><table><thead><tr><th>Lesson</th><th>Activity</th><th>Completed</th></tr></thead><tbody>${recent || `<tr><td colspan="3">No activity yet.</td></tr>`}</tbody></table></div>`;
  return c.html(staffPage("User", staff, body));
});

app.get("/subscriptions", async (c) => {
  const staff = c.get("staff");
  const page = boundedPage(c.req.query("page"));
  const limit = 50;
  const rows = await all<Record<string, unknown>>(
    c.env.DB,
    `SELECT s.user_id, s.status, s.current_period_end, s.updated_at, u.email
       FROM subscriptions s LEFT JOIN user u ON u.id = s.user_id
      ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`,
    limit,
    (page - 1) * limit,
  );
  const trs = rows
    .map(
      (r) => `<tr><td><a href="/users/${esc(encodeURIComponent(String(r.user_id)))}">${esc(String(r.email ?? r.user_id))}</a></td><td>${subBadge(r.status)}</td><td>${fmtDate(r.current_period_end)}</td><td>${fmtDate(r.updated_at)}</td></tr>`,
    )
    .join("");
  const body = `<h1>Subscriptions</h1><p class="muted">Stripe remains the source of truth for billing; this mirrors local access state.</p>
<table><thead><tr><th>User</th><th>Status</th><th>Period ends</th><th>Updated</th></tr></thead><tbody>${trs || `<tr><td colspan="4">No subscriptions yet.</td></tr>`}</tbody></table>
<div class="pager">${page > 1 ? `<a class="btn" href="/subscriptions?page=${page - 1}">Previous</a>` : ""}${rows.length === limit ? `<a class="btn" href="/subscriptions?page=${page + 1}">Next</a>` : ""}</div>`;
  return c.html(staffPage("Subscriptions", staff, body));
});

app.get("/analytics", async (c) => {
  const staff = c.get("staff");
  const raw = Number(c.req.query("days"));
  const days = [7, 30, 90].includes(raw) ? raw : 30;
  const configured = analyticsConfigured(c.env);
  const report = await loadReport(c.env, days);
  let detail = "";
  if (report) {
    const rows = (title: string, rs: { a: string; b: string; v: number }[]) =>
      `<div class="card"><h2>${title}</h2><table><tbody>${rs.map((r) => `<tr><td>${esc(r.a)}</td><td>${esc(r.b)}</td><td>${r.v}</td></tr>`).join("") || `<tr><td>No data yet.</td></tr>`}</tbody></table></div>`;
    detail =
      rows("Daily", report.daily.map((r) => ({ a: r.date, b: r.event, v: r.events }))) +
      rows("By language", report.byLang.map((r) => ({ a: r.lang, b: r.event, v: r.events }))) +
      rows("By lesson", report.lessons.map((r) => ({ a: r.lesson, b: r.event, v: r.events }))) +
      rows("Score verdicts", report.scores.map((r) => ({ a: r.verdict, b: `avg ${Math.round(r.avgScore)}`, v: r.attempts })));
  }
  const body = `<h1>Analytics</h1><div class="pager"><a class="btn" href="/analytics?days=7">7 days</a><a class="btn" href="/analytics?days=30">30 days</a><a class="btn" href="/analytics?days=90">90 days</a></div>
<div class="card"><h2>Event totals</h2>${analyticsSection(report, configured)}</div>${detail}`;
  return c.html(staffPage("Analytics", staff, body));
});

app.get("/audit", async (c) => {
  const staff = c.get("staff");
  const page = boundedPage(c.req.query("page"));
  const limit = 50;
  const rows = await all<Record<string, unknown>>(
    c.env.DB,
    `SELECT occurred_at, email, role, action, target_type, target_id, result
       FROM staff_audit_events ORDER BY occurred_at DESC LIMIT ? OFFSET ?`,
    limit,
    (page - 1) * limit,
  );
  const trs = rows
    .map(
      (r) => `<tr><td>${fmtDate(r.occurred_at)}</td><td>${esc(String(r.email))} <span class="muted">${esc(String(r.role))}</span></td><td>${esc(String(r.action))}</td><td>${esc(String(r.target_type))}:${esc(String(r.target_id))}</td><td>${esc(String(r.result))}</td></tr>`,
    )
    .join("");
  const body = `<h1>Audit log</h1><p class="muted">Staff actions are recorded here. This v1 is read-only, so entries appear once mutation tools are added; nothing is hidden by that.</p>
<table><thead><tr><th>When</th><th>Staff</th><th>Action</th><th>Target</th><th>Result</th></tr></thead><tbody>${trs || `<tr><td colspan="5">No staff actions recorded yet.</td></tr>`}</tbody></table>
<div class="pager">${page > 1 ? `<a class="btn" href="/audit?page=${page - 1}">Previous</a>` : ""}${rows.length === limit ? `<a class="btn" href="/audit?page=${page + 1}">Next</a>` : ""}</div>`;
  return c.html(staffPage("Audit log", staff, body));
});

export default app;
