import { afterEach, describe, expect, it, vi } from "vitest";
import staffApp, { audit, type StaffBindings } from "../src/staff";

// --- Fake D1 routed by SQL substring ---

type Row = Record<string, unknown>;

class FakeStmt {
  params: unknown[] = [];
  constructor(
    private db: FakeDB,
    private sql: string,
  ) {}
  bind(...params: unknown[]) {
    this.params = params;
    return this;
  }
  async first() {
    return this.db.first(this.sql, this.params);
  }
  async all() {
    return { results: this.db.all(this.sql, this.params) };
  }
  async run() {
    this.db.runs.push({ sql: this.sql, params: this.params });
    return { success: true };
  }
}

class FakeDB {
  runs: { sql: string; params: unknown[] }[] = [];
  staffUser: Row | null = null;
  users: Row[] = [
    {
      id: "u1",
      name: "Kid One",
      email: "kid@example.com",
      is_anonymous: 0,
      created_at: 1750000000,
      sub_status: "active",
      activities: 3,
    },
  ];
  prepare(sql: string) {
    return new FakeStmt(this, sql);
  }
  first(sql: string, _params: unknown[]): Row | null {
    if (sql.includes("staff_users")) {
      return this.staffUser && _params[0] === this.staffUser.subject
        ? this.staffUser
        : null;
    }
    if (sql.includes("FROM user WHERE id")) {
      if (_params[0] === "nope") return null;
      return {
        id: "u1",
        name: "Kid One",
        email: "kid@example.com",
        email_verified: 1,
        is_anonymous: 0,
        created_at: 1750000000,
        updated_at: 1750000000,
      };
    }
    if (sql.includes("user_prefs")) return { last_lang: "es", updated_at: 1750000000 };
    if (sql.includes("FROM subscriptions WHERE user_id")) {
      return { status: "active", stripe_customer_id: "cus_1", current_period_end: 1760000000, updated_at: 1750000000 };
    }
    if (sql.includes("COUNT(DISTINCT user_id)")) return { n: 5 };
    if (sql.includes("FROM session")) return { n: 2 };
    if (sql.includes("FROM lesson_progress")) return { n: 42 };
    if (sql.includes("FROM subscriptions")) return { n: 4 };
    if (sql.includes("is_anonymous,0) = 0")) return { n: 9 };
    if (sql.includes("is_anonymous,0) = 1")) return { n: 6 };
    if (sql.includes("FROM user")) return { n: 15 };
    return { n: 0 };
  }
  all(sql: string, _params: unknown[]): Row[] {
    if (sql.includes("FROM user u")) return this.users;
    if (sql.includes("staff_audit_events")) return [];
    if (sql.includes("FROM subscriptions s")) {
      return [{ user_id: "u1", status: "active", current_period_end: 1760000000, updated_at: 1750000000, email: "kid@example.com" }];
    }
    if (sql.includes("GROUP BY lesson_id")) return [{ lesson_id: "es-lesson-001", n: 2 }];
    if (sql.includes("FROM lesson_progress")) {
      return [{ lesson_id: "es-lesson-001", activity: "listen-match", completed_at: 1750000000 }];
    }
    return [];
  }
}

// --- Real RS256 Access JWTs, certs endpoint stubbed ---

const TEAM = "https://team.cloudflareaccess.com";
const AUD = "aud-test-1";

function b64url(bytes: Uint8Array | string): string {
  const raw = typeof bytes === "string" ? new TextEncoder().encode(bytes) : bytes;
  return Buffer.from(raw).toString("base64url");
}

async function makeKeys() {
  const pair = await crypto.subtle.generateKey(
    { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return { pair, jwk: { ...jwk, kid: "test-kid" } };
}

async function signToken(
  privateKey: CryptoKey,
  claims: Record<string, unknown>,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", kid: "test-kid", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ iss: TEAM, aud: AUD, iat: now, exp: now + 3600, ...claims }),
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    privateKey,
    new TextEncoder().encode(`${header}.${payload}`),
  );
  return `${header}.${payload}.${b64url(new Uint8Array(sig))}`;
}

async function setupEnv() {
  const { pair, jwk } = await makeKeys();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify({ keys: [jwk] }), { status: 200 })),
  );
  const db = new FakeDB();
  const env: StaffBindings = {
    DB: db as unknown as D1Database,
    ACCESS_TEAM_DOMAIN: TEAM,
    ACCESS_AUD: AUD,
    STAFF_ALLOWED_EMAILS: "admin@example.com",
  };
  return { pair, db, env };
}

function req(token?: string) {
  return {
    headers: token ? { "Cf-Access-Jwt-Assertion": token } : {},
  } as RequestInit & { headers: Record<string, string> };
}

describe("staff auth (Cloudflare Access JWT)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("serves /health without auth", async () => {
    const { env } = await setupEnv();
    const res = await staffApp.request("/health", {}, env);
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true, service: "nicelingo-staff" });
  });

  it("fails closed with no token, a bad signature, wrong aud, or expired token", async () => {
    const { pair, env } = await setupEnv();
    expect((await staffApp.request("/", req(), env)).status).toBe(403);

    const other = await makeKeys();
    const forged = await signToken(other.pair.privateKey, { sub: "s1", email: "admin@example.com" });
    expect((await staffApp.request("/", req(forged), env)).status).toBe(403);

    const now = Math.floor(Date.now() / 1000);
    const wrongAud = await signToken(pair.privateKey, { sub: "s1", email: "admin@example.com", aud: "nope" });
    expect((await staffApp.request("/", req(wrongAud), env)).status).toBe(403);
    const expired = await signToken(pair.privateKey, { sub: "s1", email: "admin@example.com", iat: now - 7200, exp: now - 3600 });
    expect((await staffApp.request("/", req(expired), env)).status).toBe(403);
  });

  it("admits an allowlisted email as admin and shows the dashboard", async () => {
    const { pair, env } = await setupEnv();
    const token = await signToken(pair.privateKey, { sub: "s-admin", email: "Admin@Example.com" });
    const res = await staffApp.request("/", req(token), env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Admin@Example.com");
    expect(html).toContain("· admin");
    expect(html).toContain("<strong>15</strong>");
    expect(html).toContain("<strong>4</strong>");
    expect(html).toContain("Analytics read-back is not configured");
    expect(html).toContain("/cdn-cgi/access/logout");
  });

  it("admits a staff_users row with its role and rejects unknown identities", async () => {
    const { pair, db, env } = await setupEnv();
    db.staffUser = { subject: "s-ro", email: "reader@example.com", role: "read_only" };
    const token = await signToken(pair.privateKey, { sub: "s-ro", email: "reader@example.com" });
    const res = await staffApp.request("/", req(token), env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("read_only");

    const stranger = await signToken(pair.privateKey, { sub: "s-x", email: "stranger@example.com" });
    expect((await staffApp.request("/", req(stranger), env)).status).toBe(403);
  });

  it("rejects everyone when Access is unconfigured", async () => {
    const db = new FakeDB();
    const env: StaffBindings = { DB: db as unknown as D1Database };
    const res = await staffApp.request("/", req(), env);
    expect(res.status).toBe(403);
  });
});

describe("staff pages", () => {
  afterEach(() => vi.unstubAllGlobals());

  async function authed() {
    const { pair, db, env } = await setupEnv();
    const token = await signToken(pair.privateKey, { sub: "s-admin", email: "admin@example.com" });
    return { db, env, init: req(token) };
  }

  it("lists, searches, and shows a user with progress and subscription", async () => {
    const { env, init } = await authed();
    const list = await staffApp.request("/users", init, env);
    expect(list.status).toBe(200);
    const listHtml = await list.text();
    expect(listHtml).toContain("kid@example.com");
    expect(listHtml).toContain('href="/users/u1"');

    const detail = await staffApp.request("/users/u1", init, env);
    expect(detail.status).toBe(200);
    const html = await detail.text();
    expect(html).toContain("es-lesson-001");
    expect(html).toContain("listen-match");
    expect(html).toContain("active");

    expect((await staffApp.request("/users/nope", init, env)).status).toBe(404);
  });

  it("escapes user data in rendered pages", async () => {
    const { db, env, init } = await authed();
    db.users = [{ ...db.users[0], email: "<script>alert(1)</script>@x.com", name: "<b>x</b>" }];
    const html = await (await staffApp.request("/users", init, env)).text();
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("shows subscriptions, analytics placeholder, and the empty audit log", async () => {
    const { env, init } = await authed();
    const subs = await (await staffApp.request("/subscriptions", init, env)).text();
    expect(subs).toContain("kid@example.com");
    const analytics = await (await staffApp.request("/analytics?days=7", init, env)).text();
    expect(analytics).toContain("not configured");
    const auditHtml = await (await staffApp.request("/audit", init, env)).text();
    expect(auditHtml).toContain("No staff actions recorded yet");
  });

  it("audit() writes a staff_audit_events row", async () => {
    const { db, env } = await authed();
    await audit(
      { env, req: { header: () => undefined } },
      { subject: "s-admin", email: "admin@example.com", role: "admin" },
      { action: "test_action", targetType: "user", targetId: "u1", result: "ok" },
    );
    expect(db.runs).toHaveLength(1);
    expect(db.runs[0].sql).toContain("staff_audit_events");
    expect(db.runs[0].params).toContain("test_action");
  });
});
