import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createAuth, type AuthEnv } from "./lib/auth";
import { curriculumMap, isFreeLesson, lessons, type Lang } from "./lessons/curriculum";
import { pickerLanguages } from "./lessons/languages";
import { completeActivity } from "./lib/progress";
import { scoreTranscript } from "./lib/scoring";
import { scoreUnspacedTranscript } from "./lib/scoring-unspaced";
import {
  checkoutSubscriptionDecision,
  createCheckoutSession,
  createPortalSession,
  priceForPlan,
  retrieveCheckoutSession,
  retrieveSubscription,
  stripeConfigured,
  subscriptionEventMatchesCurrent,
  verifyStripeSignature,
  type BillingPlan,
  type StripeEnv,
} from "./lib/stripe";
import { transcribeAudio } from "./lib/transcribe";
import { d1ProgressStore } from "./db/progress-store";
import { d1PrefsStore } from "./db/prefs-store";
import { d1SubscriptionStore } from "./db/subscription-store";
import { coursePage } from "./routes/course";
import { developersPage } from "./routes/developers";
import { homePage } from "./routes/home";
import { lessonPage } from "./routes/lesson";
import {
  billingCancelPage,
  billingPage,
  billingSuccessPage,
  checkoutReturnUrls,
} from "./routes/billing";

type Env = AuthEnv &
  StripeEnv & {
    AI: Ai;
    ASSETS?: Fetcher;
    PAYWALL_DISABLED?: string;
  };

const app = new Hono<{ Bindings: Env }>();

// Paywall: Unit 1 (lessons 001-004) is free in every language; every
// other lesson (manifest + audio + images) needs a subscription.
// Local QA override: set PAYWALL_DISABLED=1 in .dev.vars to open paid
// content on localhost
// (qa-audio.mjs scores paid lessons through the local /api/score).
// Production has no such var, so the paywall is always on there.
function paywallDisabled(env: Env | undefined): boolean {
  return env?.PAYWALL_DISABLED === "1";
}

app.get("/health", (c) => c.text("ok"));

const LANG_COOKIE = "nl_lang";

function isPickerLang(code: string | undefined): code is string {
  return !!code && pickerLanguages().some((l) => l.code === code);
}

/** Session user + progress + subscription for SSR. Degrades to guest
 *  with empty progress when signed out, DB-less (tests), or on any
 *  store error — the inline client script hydrates instead. */
async function sessionForSsr(c: {
  env: AuthEnv;
  req: { raw: { headers: Headers } };
}): Promise<{
  user: SessionUser | null;
  progress: Record<string, string[]>;
  subscribed: boolean;
}> {
  const user = await currentUser(c);
  if (!user || !c.env?.DB) return { user, progress: {}, subscribed: false };
  try {
    const [progress, subscribed] = await Promise.all([
      d1ProgressStore(c.env.DB).listAll(user.id),
      d1SubscriptionStore(c.env.DB).isSubscribed(user.id),
    ]);
    return { user, progress, subscribed };
  } catch {
    return { user, progress: {}, subscribed: false };
  }
}

app.get("/", async (c) => {
  // Returning learner: account preference first, then the cookie. The
  // remembered language doubles as the hero demo language on the picker.
  const userId = await currentUserId(c);
  let remembered: string | undefined;
  if (userId && c.env?.DB) {
    try {
      const pref = await d1PrefsStore(c.env.DB).getLastLang(userId);
      if (pref && isPickerLang(pref)) remembered = pref;
    } catch {
      /* fall through to the cookie */
    }
  }
  const cookie = getCookie(c, LANG_COOKIE);
  if (!remembered && isPickerLang(cookie)) remembered = cookie;
  if (c.req.query("change") !== "1" && remembered) {
    return c.redirect(`/${remembered}`, 302);
  }
  const { user, progress, subscribed } = await sessionForSsr(c);
  const origin = new URL(c.req.url).origin;
  return c.html(homePage({ progress, user, subscribed, paywallDisabled: paywallDisabled(c.env), demoLang: remembered, origin }));
});

app.get("/developers", (c) => c.html(developersPage()));

// Course home. Constrained to 2-letter codes so the fixed single-segment
// routes (/billing, /health, /developers) and /api/* can never match it,
// regardless of registration order (Hono also prefers static routes).
app.get("/:lang{[a-z]{2}}", async (c) => {
  const lang = c.req.param("lang");
  if (!isPickerLang(lang)) return c.text("Not found", 404);
  const { user, progress, subscribed } = await sessionForSsr(c);
  setCookie(c, LANG_COOKIE, lang, {
    path: "/",
    maxAge: 365 * 24 * 3600,
    sameSite: "Lax",
  });
  if (user && c.env?.DB) {
    try {
      await d1PrefsStore(c.env.DB).setLastLang(user.id, lang);
    } catch {
      /* cookie still remembers; prefs catch up after migration */
    }
  }
  const level = Number(c.req.query("level"));
  const origin = new URL(c.req.url).origin;
  return c.html(
    coursePage(lang, {
      progress,
      subscribed,
      paywallDisabled: paywallDisabled(c.env),
      user,
      level: Number.isInteger(level) ? level : undefined,
      origin,
    }),
  );
});

app.get("/lesson/01", (c) => c.html(lessonPage()));

app.get("/lesson/02", (c) => c.html(lessonPage()));

app.get("/lesson/:lang/:lesson", (c) => {
  const lang = c.req.param("lang");
  if (!lessons[c.req.param("lesson")]?.[lang as Lang]) {
    return c.text("Not found", 404);
  }
  return c.html(lessonPage(lang));
});

app.get("/api/curriculum", (c) => c.json({ levels: curriculumMap() }));

// Paid media gate: manifests are gated above, but lesson audio/images are
// static files with guessable URLs, so the worker fronts them too. Unit 1
// (and non-lesson assets) stays open; every other lesson needs the
// same session + subscription as its manifest. This route must ship in
// the same deploy as the manifest gate — never one without the other.
app.get("/static/:rest{.+}", async (c) => {
  const rest = c.req.param("rest");
  const m = /^lesson-(\d{3})\/(.+)$/.exec(rest);
  // Teaser thumbnails stay public so locked cards can show their greyed
  // photo; full-size images and audio are gated with the manifest.
  const isThumb = m?.[2] === "images/thumb.jpg";
  if (m && !isFreeLesson(m[1]) && !isThumb && !paywallDisabled(c.env)) {
    const userId = await currentUserId(c);
    if (!userId || !c.env?.DB) return c.json({ error: "unauthorized" }, 401);
    const subscribed = await d1SubscriptionStore(c.env.DB).isSubscribed(userId);
    if (!subscribed) return c.json({ error: "subscription_required" }, 402);
  }
  const assets = c.env?.ASSETS;
  if (!assets) return c.text("Not found", 404);
  return assets.fetch(c.req.raw);
});

// Legacy alias from before 3-digit numbering; serves canonical Lesson 001.
app.get("/api/lessons/01", (c) => c.json(lessons["001"].en));

app.get("/api/lessons/:lang/:lesson", async (c) => {
  const lesson = c.req.param("lesson");
  const manifest = lessons[lesson]?.[c.req.param("lang") as Lang];
  if (!manifest) return c.json({ error: "unknown lesson" }, 404);
  // Unit 1 (001-004) is free in every language; the rest need a subscription
  // (unless the PAYWALL_DISABLED dev override is on for QA).
  if (!paywallDisabled(c.env) && !isFreeLesson(lesson)) {
    const userId = await currentUserId(c);
    if (!userId) return c.json({ error: "unauthorized" }, 401);
    const subscribed = await d1SubscriptionStore(c.env.DB).isSubscribed(userId);
    if (!subscribed) return c.json({ error: "subscription_required" }, 402);
  }
  return c.json(manifest);
});

app.post("/api/score", async (c) => {
  const { phraseId, audio } = await c.req.json();
  const phrase = Object.values(lessons)
    .flatMap((langs) => Object.values(langs))
    .flatMap((m) => m.phrases)
    .find((p) => p.id === phraseId);
  if (!phrase || typeof audio !== "string") {
    return c.json({ error: "unknown phrase" }, 404);
  }
  // Scoring is gated like the manifest: free for Unit 1 (001-004; an
  // ungated endpoint would be a free transcription service), session +
  // subscription otherwise. Unparseable ids default to paid.
  const lesson = /^\d{3}-/.test(phraseId)
    ? phraseId.slice(0, 3)
    : (/^[a-z]{2}-(\d{3})-/.exec(phraseId)?.[1] ?? "999");
  if (!paywallDisabled(c.env) && !isFreeLesson(lesson)) {
    const userId = await currentUserId(c);
    if (!userId) return c.json({ error: "unauthorized" }, 401);
    const subscribed = await d1SubscriptionStore(c.env.DB).isSubscribed(userId);
    if (!subscribed) return c.json({ error: "subscription_required" }, 402);
  }
  // EN phrase ids carry no prefix ("001-..."); others are "es-"/"de-"/"fr-".
  const language = phraseId.match(/^(es|de|fr|th|zh)-/)?.[1] ?? "en";
  const transcript = await transcribeAudio(c.env, audio, language);
  const reference = phrase.scoreText ?? phrase.text;
  // Unspaced scripts (Thai, Han) score by character similarity.
  if (phraseId.startsWith("th-") || phraseId.startsWith("zh-")) {
    return c.json(scoreUnspacedTranscript(reference, transcript));
  }
  return c.json(scoreTranscript(reference, transcript));
});

async function currentUserId(c: {
  env: AuthEnv;
  req: { raw: { headers: Headers } };
}): Promise<string | null> {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    return session?.user.id ?? null;
  } catch {
    return null;
  }
}

type SessionUser = { id: string; email: string | null; isAnonymous: boolean | null };

async function currentUser(c: {
  env: AuthEnv;
  req: { raw: { headers: Headers } };
}): Promise<SessionUser | null> {
  try {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email ?? null,
      isAnonymous: (session.user as { isAnonymous?: boolean | null }).isAnonymous ?? null,
    };
  } catch {
    return null;
  }
}

app.get("/billing", (c) => c.html(billingPage(c.req.query("return"))));

app.get("/billing/cancel", (c) =>
  c.html(billingCancelPage(c.req.query("return"))),
);

app.get("/billing/success", async (c) => {
  const sessionId = c.req.query("session_id") ?? "";
  let verified = false;
  if (stripeConfigured(c.env)) {
    try {
      const session = await retrieveCheckoutSession(c.env, sessionId);
      verified = session.status === "complete" && session.payment_status === "paid";
    } catch {
      verified = false;
    }
  }
  return c.html(billingSuccessPage(verified, c.req.query("return")));
});

app.post("/api/billing/checkout", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!stripeConfigured(c.env))
    return c.json({ error: "billing not configured" }, 503);
  const {
    plan,
    email,
    return: returnTo,
  } = await c.req.json().catch(() => ({}));
  if (plan !== "monthly" && plan !== "yearly")
    return c.json({ error: "unknown plan" }, 400);
  const priceId = priceForPlan(c.env, plan as BillingPlan);
  if (!priceId) return c.json({ error: "plan not configured" }, 503);
  const receiptEmail =
    typeof email === "string" && /.+@.+\..+/.test(email)
      ? email
      : !user.isAnonymous && user.email
        ? user.email
        : null;
  if (!receiptEmail)
    return c.json({ error: "an email address is required" }, 400);
  const store = d1SubscriptionStore(c.env.DB);
  const origin = new URL(c.req.url).origin;
  try {
    const urls = checkoutReturnUrls(origin, returnTo);
    const checkout = await createCheckoutSession(c.env, {
      userId: user.id,
      email: receiptEmail,
      successUrl: urls.successUrl,
      cancelUrl: urls.cancelUrl,
      priceId,
      customerId: (await store.get(user.id))?.stripeCustomerId,
    });
    return c.json({ url: checkout.url });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.post("/api/billing/portal", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!stripeConfigured(c.env))
    return c.json({ error: "billing not configured" }, 503);
  const sub = await d1SubscriptionStore(c.env.DB).get(user.id);
  if (!sub?.stripeCustomerId)
    return c.json({ error: "no subscription found" }, 404);
  try {
    const portal = await createPortalSession(
      c.env,
      sub.stripeCustomerId,
      new URL(c.req.url).origin,
    );
    return c.json({ url: portal.url });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.get("/api/billing/status", async (c) => {
  const userId = await currentUserId(c);
  if (!userId) return c.json({ error: "unauthorized" }, 401);
  const sub = await d1SubscriptionStore(c.env.DB).get(userId);
  return c.json({
    subscribed:
      sub?.status === "active" || sub?.status === "trialing",
    status: sub?.status ?? "none",
  });
});

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: {
      id: string;
      customer?: string;
      status?: string;
      created?: number;
      current_period_end?: number;
      subscription?: string;
      metadata?: Record<string, string>;
      client_reference_id?: string;
    };
  };
};

app.post("/api/billing/webhook", async (c) => {
  const raw = await c.req.text();
  const ok = await verifyStripeSignature(
    raw,
    c.req.header("stripe-signature"),
    c.env?.STRIPE_WEBHOOK_SECRET,
  );
  if (!ok) return c.json({ error: "invalid signature" }, 401);
  let event: StripeEvent;
  try {
    event = JSON.parse(raw);
    if (!event.id || !event.type || !event.data?.object)
      throw new Error("bad event");
  } catch {
    return c.json({ error: "invalid event" }, 400);
  }
  const store = d1SubscriptionStore(c.env.DB);
  if (!(await store.claimEvent(event.id, event.type)))
    return c.json({ received: true, duplicate: true });
  try {
    const object = event.data.object;
    if (event.type === "checkout.session.completed") {
      const userId = object.metadata?.user_id ?? object.client_reference_id ?? null;
      const subscriptionId =
        typeof object.subscription === "string" ? object.subscription : null;
      if (userId && subscriptionId) {
        // Trust-then-verify: read the subscription from Stripe so a forged
        // event body can't grant access with a signature alone.
        const sub = await retrieveSubscription(c.env, subscriptionId);
        const current = await store.get(userId);
        const decision = checkoutSubscriptionDecision({
          currentId: current?.stripeSubscriptionId,
          currentCreated: current?.stripeSubscriptionCreated,
          incomingId: sub.id,
          incomingCreated: sub.created,
        });
        if (decision === "adopt") {
          await store.upsert({
            userId,
            stripeCustomerId:
              typeof sub.customer === "string"
                ? sub.customer
                : (current?.stripeCustomerId ?? null),
            stripeSubscriptionId: sub.id,
            stripeSubscriptionCreated: sub.created ?? null,
            status: sub.status ?? "active",
            currentPeriodEnd: sub.current_period_end ?? null,
          });
        }
        await store.markEvent(event.id, { userId, status: "processed" });
      } else {
        await store.markEvent(event.id, { status: "ignored" });
      }
    } else if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const userId = object.metadata?.user_id ?? null;
      if (userId) {
        const current = await store.get(userId);
        if (subscriptionEventMatchesCurrent(current?.stripeSubscriptionId, object.id)) {
          await store.upsert({
            userId,
            stripeCustomerId:
              typeof object.customer === "string"
                ? object.customer
                : (current?.stripeCustomerId ?? null),
            stripeSubscriptionId: object.id,
            stripeSubscriptionCreated: object.created ?? current?.stripeSubscriptionCreated ?? null,
            status:
              event.type === "customer.subscription.deleted"
                ? "canceled"
                : (object.status ?? "active"),
            currentPeriodEnd: object.current_period_end ?? null,
          });
        }
        await store.markEvent(event.id, { userId, status: "processed" });
      } else {
        await store.markEvent(event.id, { status: "ignored" });
      }
    } else if (event.type === "invoice.payment_failed") {
      const userId = object.metadata?.user_id ?? null;
      const subscriptionId =
        typeof object.subscription === "string" ? object.subscription : null;
      if (userId && subscriptionId) {
        const current = await store.get(userId);
        if (current?.stripeSubscriptionId === subscriptionId) {
          await store.upsert({ ...current, status: "past_due" });
        }
        await store.markEvent(event.id, { userId, status: "processed" });
      } else {
        await store.markEvent(event.id, { status: "ignored" });
      }
    } else {
      await store.markEvent(event.id, { status: "ignored" });
    }
  } catch (err) {
    await store.markEvent(event.id, {
      status: "failed",
      lastError: (err as Error).message,
    });
    return c.json({ error: "webhook processing failed" }, 500);
  }
  return c.json({ received: true });
});

app.get("/api/progress/all", async (c) => {
  const userId = await currentUserId(c);
  if (!userId) return c.json({ error: "unauthorized" }, 401);
  return c.json({ lessons: await d1ProgressStore(c.env.DB).listAll(userId) });
});

app.get("/api/progress", async (c) => {
  const userId = await currentUserId(c);
  if (!userId) return c.json({ error: "unauthorized" }, 401);
  const lessonId = c.req.query("lesson") ?? "lesson-01";
  const store = d1ProgressStore(c.env.DB);
  return c.json({
    lessonId,
    completed: await store.listCompleted(userId, lessonId),
  });
});

app.post("/api/progress", async (c) => {
  const userId = await currentUserId(c);
  if (!userId) return c.json({ error: "unauthorized" }, 401);
  const { lessonId, activity } = await c.req.json();
  const result = await completeActivity(
    d1ProgressStore(c.env.DB),
    userId,
    lessonId,
    activity,
  );
  if (!result.ok) return c.json({ error: result.error }, 422);
  return c.json({ lessonId, completed: result.completed });
});

// Better Auth handler (social callbacks, anonymous sign-in, session, ...).
app.on(["GET", "POST"], "/api/auth/*", (c) => {
  const auth = createAuth(c.env);
  return auth.handler(c.req.raw);
});

// Smallest authenticated probe: returns the current session user or 401.
app.get("/api/me", async (c) => {
  const auth = createAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) return c.json({ error: "unauthorized" }, 401);
  return c.json({ user: session.user });
});

// With run_worker_first, every request reaches the worker: serve anything
// no route claimed (app shell, fonts, icons) from static assets. Must stay
// last so API/page routes match first.
app.get("*", async (c) => {
  const assets = c.env?.ASSETS;
  if (!assets) return c.text("Not found", 404);
  return assets.fetch(c.req.raw);
});

export default app;
