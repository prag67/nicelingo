import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { createAuth, isRegisteredUser, type AuthEnv } from "./lib/auth";
import { curriculumMap, isFreeLesson, lessons, type Lang } from "./lessons/curriculum";
import { pickerLanguages } from "./lessons/languages";
import { completeActivity } from "./lib/progress";
import { judgePronunciation } from "./lib/judge";
import { attemptPasses, scoreTranscript, type Verdict } from "./lib/scoring";
import { scoreUnspacedTranscript } from "./lib/scoring-unspaced";
import { r2KeyForMedia } from "./lib/media-keys";
import { transcribeAudio } from "./lib/transcribe";
import {
  clientCategory,
  countryOf,
  isClientEvent,
  parseLessonRef,
  recordEvent,
  type AnalyticsEnv,
} from "./lib/analytics";
import { d1ProgressStore } from "./db/progress-store";
import { d1AttemptStore } from "./db/attempt-store";
import { buildCheckpointSet, checkpointAccess, unitLessons } from "./lib/checkpoint";
import { buildReviewSet, lessonOfPhrase, phraseById } from "./lib/review";
import { unitStats } from "./lib/lesson-progress";
import type { Milestone } from "./lib/attempts";
import { d1PrefsStore } from "./db/prefs-store";
import { coursePage } from "./routes/course";
import { masterProgressPage, progressPage } from "./routes/progress";
import { developersPage } from "./routes/developers";
import { contactPage, privacyPage, refundsPage, termsPage } from "./routes/legal";
import {
  isPreviewSample,
  isPreviewVoice,
  voicePreviewPage,
} from "./routes/voice-preview";
import { homePage } from "./routes/home";
import { lessonPage } from "./routes/lesson";
import {
  accountPage,
  forgotPasswordPage,
  registerPage,
  resetPasswordPage,
  signInPage,
} from "./routes/auth-pages";
import { countryOfRequest, langForCountry } from "./lib/geo";
import { isUiLang, uiLangFor, type UiLang } from "./lib/i18n";
import { d1StudentStore } from "./db/student-store";
import { MAX_STUDENTS, summarizeProgress } from "./lib/students";
import { studentsPage } from "./routes/students";
import {
  PASS_DAYS,
  checkoutSubscriptionDecision,
  createCheckoutSession,
  createPassCheckoutSession,
  createPortalSession,
  isPassPlan,
  passPriceForPlan,
  cardPriceForPlan,
  priceForPlan,
  retrieveCheckoutSession,
  retrieveSubscription,
  stripeConfigured,
  subscriptionEventMatchesCurrent,
  verifyStripeSignature,
  type BillingPlan,
  type StripeEnv,
} from "./lib/stripe";
import { d1SubscriptionStore } from "./db/subscription-store";
import {
  billingCancelPage,
  billingPage,
  billingSuccessPage,
  checkoutReturnUrls,
} from "./routes/billing";

type Env = AuthEnv &
  AnalyticsEnv &
  StripeEnv & {
    AI: Ai;
    ASSETS?: Fetcher;
    MEDIA?: R2Bucket;
    PAYWALL_DISABLED?: string;
  };

function userKind(user: SessionUser | null): "guest" | "anon" | "user" {
  if (!user) return "guest";
  return user.isAnonymous ? "anon" : "user";
}

function requestContext(c: { req: { raw: Request } }): {
  country: string;
  device: string;
  browser: string;
} {
  return { country: countryOf(c.req.raw), ...clientCategory(c.req.raw) };
}

const app = new Hono<{ Bindings: Env }>();

// ?ui=<lang> picks the interface language: store it in the nl_ui
// cookie (one year) and redirect to the same page without the param.
app.use("*", async (c, next) => {
  const ui = c.req.query("ui");
  if (isUiLang(ui)) {
    setCookie(c, UI_COOKIE, ui, {
      path: "/",
      maxAge: 365 * 24 * 3600,
      sameSite: "Lax",
    });
    const url = new URL(c.req.url);
    url.searchParams.delete("ui");
    return c.redirect(url.pathname + url.search, 302);
  }
  await next();
});

// Access model: Unit 1 (lessons 001-004) is open to everyone in every
// language; every other lesson (manifest + audio + images + scoring)
// needs an active or trialing Stripe subscription ($3/month or
// $29/year). Registration alone does not unlock paid lessons.
// Local QA override: set PAYWALL_DISABLED=1 in .dev.vars to open
// gated content on localhost (qa-audio.mjs scores gated lessons through
// the local /api/score). Production has no such var.
function paywallDisabled(env: Env | undefined): boolean {
  return env?.PAYWALL_DISABLED === "1";
}

/** Gate for content beyond Unit 1: null when the caller may proceed, or
 *  the error response to return. No session at all is 401 (the client
 *  first creates an anonymous session); a session without an active or
 *  trialing subscription is 402 subscription_required. */
async function subscriptionGate(c: {
  env: AuthEnv & { DB?: D1Database };
  req: { raw: { headers: Headers } };
}): Promise<Response | null> {
  const userId = await currentUserId(c);
  if (!userId || !c.env?.DB) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  let subscribed = false;
  try {
    subscribed = await d1SubscriptionStore(c.env.DB).isSubscribed(userId);
  } catch {
    subscribed = false;
  }
  if (!subscribed) {
    return new Response(JSON.stringify({ error: "subscription_required" }), {
      status: 402,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

app.get("/health", (c) => c.text("ok"));

// Browser beacon for client-only events (page_view). Aggregate-only:
// no visitor/user identifier is accepted or stored; country, device,
// and browser are derived server-side. Mirrors blognice's beacon checks.
app.post("/_nicelingo/events", async (c) => {
  const length = Number(c.req.header("content-length") || "0");
  if (length > 2048) return c.body(null, 413);
  const origin = c.req.header("origin");
  if (!origin || new URL(c.req.url).origin !== origin) return c.body(null, 403);
  let body: { event?: unknown; path?: unknown; lang?: unknown; lesson?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.body(null, 400);
  }
  if (!isClientEvent(body.event)) return c.body(null, 400);
  const path = typeof body.path === "string" ? body.path : "";
  if (path && !/^\/(?:$|[^?#]{1,300}$)/.test(path)) return c.body(null, 400);
  const lang =
    typeof body.lang === "string" && /^[a-z]{2}$/.test(body.lang) ? body.lang : "";
  const lesson =
    typeof body.lesson === "string" && /^\d{3}$/.test(body.lesson)
      ? body.lesson
      : "";
  recordEvent(c.env, {
    name: body.event,
    lang,
    lesson,
    path,
    ...requestContext(c),
  });
  return c.body(null, 204);
});

const LANG_COOKIE = "nl_lang";
const UI_COOKIE = "nl_ui";

/** Interface language for this request (cookie > country > English). */
function requestUiLang(c: {
  req: { raw: Request; header: (n: string) => string | undefined };
}): UiLang {
  const header = c.req.header("cookie") ?? "";
  const cookie = header
    .split(";")
    .map((p) => p.trim())
    .find((p) => p.startsWith(`${UI_COOKIE}=`))
    ?.slice(UI_COOKIE.length + 1);
  return uiLangFor({
    cookie: cookie ? decodeURIComponent(cookie) : null,
    country: countryOfRequest(c.req.raw),
  });
}

function isPickerLang(code: string | undefined): code is string {
  return !!code && pickerLanguages().some((l) => l.code === code);
}

/** Session user + progress + subscription state for SSR. Degrades to
 *  guest with empty progress when signed out, DB-less (tests), or on any
 *  store error — the inline client script hydrates instead. */
async function sessionForSsr(c: {
  env: AuthEnv;
  req: { raw: { headers: Headers } };
}): Promise<{
  user: SessionUser | null;
  progress: Record<string, string[]>;
  registered: boolean;
  subscribed: boolean;
  streakDays: string[];
  milestones: Milestone[];
}> {
  const user = await currentUser(c);
  const registered = isRegisteredUser(user);
  if (!user || !c.env?.DB) return { user, progress: {}, registered, subscribed: false, streakDays: [], milestones: [] };
  try {
    const store = d1ProgressStore(c.env.DB);
    const [progress, subscribed, streakDays, milestones] = await Promise.all([
      store.listAll(user.id),
      d1SubscriptionStore(c.env.DB).isSubscribed(user.id),
      store.listActivityDays(user.id),
      d1AttemptStore(c.env.DB).listMilestones(user.id).catch(() => [] as Milestone[]),
    ]);
    return { user, progress, registered, subscribed, streakDays, milestones };
  } catch {
    return { user, progress: {}, registered, subscribed: false, streakDays: [], milestones: [] };
  }
}

app.get("/", async (c) => {
  // The picker is the homepage, always: no redirects. A remembered
  // language (account preference, then cookie) or the country guess
  // only personalizes the hero demo card below.
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
  const geoLang = langForCountry(countryOfRequest(c.req.raw));
  const { user, progress, registered, subscribed, streakDays } = await sessionForSsr(c);
  const origin = new URL(c.req.url).origin;
  return c.html(homePage({ progress, user, registered, subscribed, paywallDisabled: paywallDisabled(c.env), demoLang: remembered ?? geoLang ?? undefined, origin, uiLang: requestUiLang(c), streakDays }));
});

app.get("/developers", (c) => c.html(developersPage(requestUiLang(c))));

app.get("/robots.txt", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`, 200, {
    "Content-Type": "text/plain; charset=utf-8",
  });
});

// Sitemap from the registry, so it covers the real courses in merged
// deploys and the fake stand-ins in the public tree. Lesson player
// pages and private areas stay out.
app.get("/sitemap.xml", (c) => {
  const origin = new URL(c.req.url).origin;
  const paths = [
    "/",
    ...pickerLanguages().map((l) => `/${l.code}`),
    "/billing",
    "/terms",
    "/privacy",
    "/refunds",
    "/contact",
    "/developers",
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    paths.map((p) => `  <url><loc>${origin}${p}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return c.text(xml, 200, {
    "Content-Type": "application/xml; charset=utf-8",
  });
});
// Unlisted voice-preview page (noindex, never linked or in the
// sitemap). The audio route only serves the fixed sample allowlist
// from R2 voice-preview/es/<voice>/<file>.mp3 keys.
app.get("/voice-preview", (c) =>
  c.html(voicePreviewPage(), 200, { "X-Robots-Tag": "noindex, nofollow" }),
);
app.get("/voice-preview/audio/:voice/:file", async (c) => {
  const voice = c.req.param("voice");
  const file = c.req.param("file");
  if (!isPreviewVoice(voice) || !isPreviewSample(file)) {
    return c.text("Not found", 404);
  }
  const media = c.env?.MEDIA;
  if (!media) return c.text("Not found", 404);
  const obj = await media.get(`voice-preview/es/${voice}/${file}`);
  if (!obj) return c.text("Not found", 404);
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("Content-Type", "audio/mpeg");
  headers.set("Cache-Control", "public, max-age=86400");
  headers.set("X-Robots-Tag", "noindex, nofollow");
  return new Response(await obj.arrayBuffer(), { headers });
});

app.get("/terms", (c) => c.html(termsPage(requestUiLang(c))));
app.get("/privacy", (c) => c.html(privacyPage(requestUiLang(c))));
app.get("/refunds", (c) => c.html(refundsPage(requestUiLang(c))));
app.get("/contact", (c) => c.html(contactPage(requestUiLang(c))));

// Master progress (/progress): global streak hero, per-language
// summary rows, cross-language badge grid. Personal, so noindex.
app.get("/progress", async (c) => {
  const { user, progress, registered, subscribed, streakDays } = await sessionForSsr(c);
  const origin = new URL(c.req.url).origin;
  return c.html(
    masterProgressPage({
      progress,
      registered,
      subscribed,
      uiLang: requestUiLang(c),
      streakDays,
      user,
      origin,
    }),
  );
});

// Your progress (/{lang}/progress): streak hero, 7-day strip, badges.
// Reached by tapping the streak chip; personal, so noindex.
app.get("/:lang{[a-z]{2}}/progress", async (c) => {
  const lang = c.req.param("lang");
  if (!isPickerLang(lang)) return c.text("Not found", 404);
  const { user, progress, registered, subscribed, streakDays, milestones } = await sessionForSsr(c);
  const origin = new URL(c.req.url).origin;
  return c.html(
    progressPage(lang, {
      progress,
      registered,
      subscribed,
      uiLang: requestUiLang(c),
      streakDays,
      milestones,
      user,
      origin,
    }),
  );
});

// Course home. Constrained to 2-letter codes so the fixed single-segment
// routes (/health, /developers, /register) and /api/* can never match it,
// regardless of registration order (Hono also prefers static routes).
app.get("/:lang{[a-z]{2}}", async (c) => {
  const lang = c.req.param("lang");
  if (!isPickerLang(lang)) return c.text("Not found", 404);
  const { user, progress, registered, subscribed, streakDays, milestones } = await sessionForSsr(c);
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
  recordEvent(c.env, {
    name: "language_selected",
    lang,
    userKind: userKind(user),
    ...requestContext(c),
  });
  const level = Number(c.req.query("level"));
  const origin = new URL(c.req.url).origin;
  let weakCount = 0;
  if (user && c.env?.DB) {
    try {
      const stats = await d1AttemptStore(c.env.DB).getStats(user.id, lang);
      const review = buildReviewSet({ lang, stats, subscribed, paywallDisabled: paywallDisabled(c.env) });
      weakCount = review.questions.length >= 3 ? review.weakCount : 0;
    } catch { /* attempts tables not migrated yet: no button */ }
  }
  return c.html(
    coursePage(lang, {
      progress,
      registered,
      subscribed,
      uiLang: requestUiLang(c),
      streakDays,
      milestones,
      paywallDisabled: paywallDisabled(c.env),
      weakCount,
      user,
      level: Number.isInteger(level) ? level : undefined,
      origin,
    }),
  );
});

app.get("/lesson/01", (c) => {
  recordEvent(c.env, { name: "lesson_started", lang: "en", lesson: "001", ...requestContext(c) });
  return c.html(lessonPage());
});

app.get("/lesson/02", (c) => {
  recordEvent(c.env, { name: "lesson_started", lang: "en", lesson: "002", ...requestContext(c) });
  return c.html(lessonPage());
});

app.get("/lesson/:lang/:lesson", (c) => {
  const lang = c.req.param("lang");
  const lesson = c.req.param("lesson");
  if (!lessons[lesson]?.[lang as Lang]) {
    return c.text("Not found", 404);
  }
  recordEvent(c.env, { name: "lesson_started", lang, lesson, ...requestContext(c) });
  return c.html(lessonPage(lang));
});

app.get("/api/curriculum", (c) => c.json({ levels: curriculumMap() }));

// Media gate: manifests are gated below, but lesson audio/images are
// static files with guessable URLs, so the worker fronts them too. Unit 1
// (and non-lesson assets) stays open; every other lesson needs the same
// subscription as its manifest. This route must ship in the same
// deploy as the manifest gate — never one without the other.
app.get("/static/:rest{.+}", async (c) => {
  const rest = c.req.param("rest");
  const m = /^lesson-(\d{3})\/(.+)$/.exec(rest);
  // Teaser thumbnails stay public so locked cards can show their photo;
  // full-size images and audio are gated with the manifest.
  const isThumb = m?.[2] === "images/thumb.jpg";
  if (m && !isFreeLesson(m[1]) && !isThumb && !paywallDisabled(c.env)) {
    const gate = await subscriptionGate(c);
    if (gate) return gate;
  }
  // R2 first (bucket nicelingo-media), static assets as fallback during
  // the migration, 404 when neither has the file.
  const key = r2KeyForMedia(rest);
  const media = c.env?.MEDIA;
  if (key && media) {
    const obj = await media.get(key);
    if (obj) {
      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("Cache-Control", "public, max-age=31536000, immutable");
      return new Response(await obj.arrayBuffer(), { headers });
    }
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
  // Unit 1 (001-004) is open in every language; the rest need a
  // subscription (unless the PAYWALL_DISABLED dev override is on).
  if (!paywallDisabled(c.env) && !isFreeLesson(lesson)) {
    const gate = await subscriptionGate(c);
    if (gate) return gate;
  }
  return c.json(manifest);
});

app.post("/api/score", async (c) => {
  const { phraseId, audio, prevVerdict } = await c.req.json();
  const prev: Verdict | null =
    prevVerdict === "green" || prevVerdict === "yellow" || prevVerdict === "red"
      ? prevVerdict
      : null;
  const phrase = Object.values(lessons)
    .flatMap((langs) => Object.values(langs))
    .flatMap((m) => m.phrases)
    .find((p) => p.id === phraseId);
  if (!phrase || typeof audio !== "string") {
    return c.json({ error: "unknown phrase" }, 404);
  }
  // Scoring is gated like the manifest: open for Unit 1 (001-004; an
  // ungated endpoint would be a free transcription service), subscription
  // otherwise. Unparseable ids default to gated.
  const lesson = /^\d{3}-/.test(phraseId)
    ? phraseId.slice(0, 3)
    : (/^[a-z]{2}-(\d{3})-/.exec(phraseId)?.[1] ?? "999");
  if (!paywallDisabled(c.env) && !isFreeLesson(lesson)) {
    const gate = await subscriptionGate(c);
    if (gate) return gate;
  }
  // EN phrase ids carry no prefix ("001-..."); others are "es-"/"de-"/"fr-".
  const language = phraseId.match(/^(es|de|fr|th|zh)-/)?.[1] ?? "en";
  const reference = phrase.scoreText ?? phrase.text;
  // Clef judges the audio directly; Whisper transcript scoring below is
  // the fallback when Clef is unavailable or fails.
  const roman =
    (language === "th" || language === "zh") && phrase.scoreText
      ? phrase.text
      : null;
  const judged = await judgePronunciation(
    c.env,
    audio,
    reference,
    roman,
    language,
  );
  // Pass decision lives here (attemptPasses): Thai yellows pass only
  // as a Clef minor slip with low p(wrong) on a second consecutive
  // yellow; Whisper-fallback yellows never pass on their own.
  const scored = judged
    ? judged
    : {
        ...(phraseId.startsWith("th-") || phraseId.startsWith("zh-")
          ? scoreUnspacedTranscript(reference, await transcribeAudio(c.env, audio, language))
          : scoreTranscript(reference, await transcribeAudio(c.env, audio, language))),
        source: "whisper" as const,
        wrongProb: null,
      };
  const result = {
    score: scored.score,
    verdict: scored.verdict,
    source: scored.source,
    wrongProb: scored.wrongProb,
    pass: attemptPasses({
      lang: language,
      verdict: scored.verdict,
      source: scored.source,
      wrongProb: scored.wrongProb,
      prevVerdict: prev,
    }),
  };
  // Only the verdict/score band is recorded — never audio or transcript.
  recordEvent(c.env, {
    name: "score_attempt",
    lang: language,
    lesson,
    detail: result.verdict,
    score: result.score,
    ...requestContext(c),
  });
  return c.json(result);
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

// Account pages (registration for progress, students, and billing).
app.get("/register", (c) => c.html(registerPage(c.req.query("return"), new URL(c.req.url).origin, requestUiLang(c))));
app.get("/sign-in", (c) => c.html(signInPage(c.req.query("return"), new URL(c.req.url).origin, requestUiLang(c))));
app.get("/forgot-password", (c) => c.html(forgotPasswordPage(new URL(c.req.url).origin, requestUiLang(c))));
app.get("/reset-password", (c) => c.html(resetPasswordPage(c.req.query("token") ?? "", new URL(c.req.url).origin, requestUiLang(c))));
app.get("/account", async (c) => {
  // Signed-in area: never render account controls (including Sign out)
  // for guests or anonymous sessions, and never let a browser cache the
  // signed-in page (a cached copy survives sign-out via back/bfcache).
  c.header("Cache-Control", "private, no-store");
  const user = await currentUser(c);
  if (!isRegisteredUser(user)) {
    return c.redirect(`/sign-in?return=${encodeURIComponent("/account")}`, 302);
  }
  return c.html(accountPage(new URL(c.req.url).origin, user?.email ?? "", requestUiLang(c)));
});

// Linked students: holder requests by email, student accepts, holder
// then sees a per-language summary (see src/lib/students.ts).
async function registeredUser(c: {
  env: AuthEnv;
  req: { raw: { headers: Headers } };
}): Promise<SessionUser | null> {
  const user = await currentUser(c);
  return isRegisteredUser(user) ? user : null;
}

app.get("/students", async (c) => {
  c.header("Cache-Control", "private, no-store");
  const user = await registeredUser(c);
  if (!user) return c.redirect(`/sign-in?return=${encodeURIComponent("/students")}`, 302);
  const store = d1StudentStore(c.env.DB);
  const [forHolder, forStudent] = await Promise.all([
    store.listForHolder(user.id),
    store.listForStudent(user.id),
  ]);
  const students = await Promise.all(
    forHolder
      .filter((l) => l.status === "accepted")
      .map(async (l) => ({
        linkId: l.id,
        email: l.studentEmail,
        name: l.studentName,
        summary: summarizeProgress(await store.progressRows(l.studentUserId)),
      })),
  );
  return c.html(
    studentsPage(
      {
        email: user.email ?? "",
        students,
        outgoingPending: forHolder
          .filter((l) => l.status === "pending")
          .map((l) => ({ linkId: l.id, email: l.studentEmail })),
        incomingPending: forStudent
          .filter((l) => l.status === "pending")
          .map((l) => ({ linkId: l.id, email: l.holderEmail, name: l.holderName })),
        viewers: forStudent
          .filter((l) => l.status === "accepted")
          .map((l) => ({ linkId: l.id, email: l.holderEmail })),
      },
      new URL(c.req.url).origin,
    ),
  );
});

app.post("/api/students/request", async (c) => {
  const user = await registeredUser(c);
  if (!user) return c.json({ error: "registration_required" }, 403);
  const { email } = await c.req.json().catch(() => ({}));
  if (typeof email !== "string" || !/.+@.+\..+/.test(email.trim()))
    return c.json({ error: "invalid_email", message: "Enter a valid email address." }, 400);
  const store = d1StudentStore(c.env.DB);
  const student = await store.findRegisteredByEmail(email);
  if (!student)
    return c.json(
      { error: "no_account", message: "No Nicelingo account uses that email yet. Ask them to create a free account first, then send the request again." },
      404,
    );
  if (student.id === user.id)
    return c.json({ error: "self_link", message: "You cannot link your own account as a student." }, 400);
  const existing = await store.findLink(user.id, student.id);
  if (existing?.status === "accepted")
    return c.json({ error: "already_linked", message: "That student is already linked to your account." }, 409);
  if (existing?.status === "pending")
    return c.json({ error: "already_pending", message: "A request to that student is already waiting for their acceptance." }, 409);
  const mine = await store.listForHolder(user.id);
  if (mine.filter((l) => l.status === "pending" || l.status === "accepted").length >= MAX_STUDENTS)
    return c.json({ error: "limit", message: `You can link at most ${MAX_STUDENTS} students.` }, 409);
  const link = await store.createLink(user.id, student.id);
  return c.json({ linkId: link.id, status: link.status }, 201);
});

app.post("/api/students/respond", async (c) => {
  const user = await registeredUser(c);
  if (!user) return c.json({ error: "registration_required" }, 403);
  const { linkId, accept } = await c.req.json().catch(() => ({}));
  const store = d1StudentStore(c.env.DB);
  const link = typeof linkId === "string" ? await store.getLink(linkId) : null;
  if (!link || link.studentUserId !== user.id || link.status !== "pending")
    return c.json({ error: "not_found" }, 404);
  if (accept === true) {
    await store.setStatus(link.id, "accepted");
    return c.json({ status: "accepted" });
  }
  await store.deleteLink(link.id);
  return c.json({ status: "declined" });
});

app.post("/api/students/remove", async (c) => {
  const user = await registeredUser(c);
  if (!user) return c.json({ error: "registration_required" }, 403);
  const { linkId } = await c.req.json().catch(() => ({}));
  const store = d1StudentStore(c.env.DB);
  const link = typeof linkId === "string" ? await store.getLink(linkId) : null;
  if (!link || (link.holderUserId !== user.id && link.studentUserId !== user.id))
    return c.json({ error: "not_found" }, 404);
  await store.deleteLink(link.id);
  return c.json({ status: "removed" });
});

app.get("/billing", (c) => {
  // PromptPay passes are offered only to Thai visitors (CF country);
  // with no country signal (local dev, tests) the section stays visible.
  const country = countryOfRequest(c.req.raw);
  const promptPay = !country || country === "TH";
  return c.html(billingPage(c.req.query("return"), { promptPay, uiLang: requestUiLang(c), thailand: country === "TH" }));
});

app.get("/billing/cancel", (c) => c.html(billingCancelPage(c.req.query("return"), requestUiLang(c))));

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
  return c.html(billingSuccessPage(verified, c.req.query("return"), requestUiLang(c)));
});

app.post("/api/billing/checkout", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!stripeConfigured(c.env)) return c.json({ error: "billing not configured" }, 503);
  const { plan, email, return: returnTo } = await c.req.json().catch(() => ({}));
  if (plan !== "monthly" && plan !== "yearly" && !isPassPlan(plan))
    return c.json({ error: "unknown plan" }, 400);
  const pass = isPassPlan(plan);
  const priceId = pass
    ? passPriceForPlan(c.env, plan)
    : cardPriceForPlan(c.env, plan as BillingPlan, countryOfRequest(c.req.raw));
  if (!priceId) return c.json({ error: "plan not configured" }, 503);
  const receiptEmail =
    typeof email === "string" && /.+@.+\..+/.test(email)
      ? email
      : !user.isAnonymous && user.email
        ? user.email
        : null;
  if (!receiptEmail) return c.json({ error: "an email address is required" }, 400);
  const store = d1SubscriptionStore(c.env.DB);
  const origin = new URL(c.req.url).origin;
  try {
    const urls = checkoutReturnUrls(origin, returnTo);
    const customerId = (await store.get(user.id))?.stripeCustomerId;
    const checkout = pass
      ? await createPassCheckoutSession(c.env, {
          userId: user.id,
          email: receiptEmail,
          successUrl: urls.successUrl,
          cancelUrl: urls.cancelUrl,
          priceId,
          passDays: PASS_DAYS[plan],
          customerId,
        })
      : await createCheckoutSession(c.env, {
          userId: user.id,
          email: receiptEmail,
          successUrl: urls.successUrl,
          cancelUrl: urls.cancelUrl,
          priceId,
          customerId,
        });
    recordEvent(c.env, { name: "checkout_started", detail: plan, userKind: userKind(user), ...requestContext(c) });
    return c.json({ url: checkout.url });
  } catch (err) {
    return c.json({ error: (err as Error).message }, 502);
  }
});

app.post("/api/billing/portal", async (c) => {
  const user = await currentUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  if (!stripeConfigured(c.env)) return c.json({ error: "billing not configured" }, 503);
  const sub = await d1SubscriptionStore(c.env.DB).get(user.id);
  if (!sub?.stripeCustomerId) return c.json({ error: "no subscription found" }, 404);
  try {
    const portal = await createPortalSession(c.env, sub.stripeCustomerId, new URL(c.req.url).origin);
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
    subscribed: sub?.status === "active" || sub?.status === "trialing",
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
  const ok = await verifyStripeSignature(raw, c.req.header("stripe-signature"), c.env?.STRIPE_WEBHOOK_SECRET);
  if (!ok) return c.json({ error: "invalid signature" }, 401);
  let event: StripeEvent;
  try {
    event = JSON.parse(raw);
    if (!event.id || !event.type || !event.data?.object) throw new Error("bad event");
  } catch {
    return c.json({ error: "invalid event" }, 400);
  }
  const store = d1SubscriptionStore(c.env.DB);
  if (!(await store.claimEvent(event.id, event.type))) return c.json({ received: true, duplicate: true });
  try {
    const object = event.data.object;
    if (event.type === "checkout.session.completed" && object.metadata?.kind === "promptpay_pass") {
      // PromptPay pass: verify payment with Stripe, then grant fixed
      // days (stacking onto any unexpired pass for the same user).
      const userId = object.metadata?.user_id ?? object.client_reference_id ?? null;
      const days = Number(object.metadata?.pass_days);
      if (userId && Number.isInteger(days) && days > 0) {
        const session = await retrieveCheckoutSession(c.env, object.id);
        if (session.payment_status !== "paid") throw new Error("pass checkout not paid");
        const current = await store.get(userId);
        const nowSec = Math.floor(Date.now() / 1000);
        const base =
          !current?.stripeSubscriptionId && (current?.currentPeriodEnd ?? 0) > nowSec
            ? current!.currentPeriodEnd!
            : nowSec;
        await store.upsert({
          userId,
          stripeCustomerId:
            typeof session.customer === "string" ? session.customer : (current?.stripeCustomerId ?? null),
          stripeSubscriptionId: current?.stripeSubscriptionId ?? null,
          stripeSubscriptionCreated: current?.stripeSubscriptionCreated ?? null,
          status: current?.stripeSubscriptionId ? current.status : "active",
          currentPeriodEnd: base + days * 86400,
        });
        recordEvent(c.env, { name: "subscription_changed", detail: "promptpay_pass", ...requestContext(c) });
        await store.markEvent(event.id, { userId, status: "processed" });
      } else {
        await store.markEvent(event.id, { status: "ignored" });
      }
    } else if (event.type === "checkout.session.completed") {
      const userId = object.metadata?.user_id ?? object.client_reference_id ?? null;
      const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
      if (userId && subscriptionId) {
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
            stripeCustomerId: typeof sub.customer === "string" ? sub.customer : (current?.stripeCustomerId ?? null),
            stripeSubscriptionId: sub.id,
            stripeSubscriptionCreated: sub.created ?? null,
            status: sub.status ?? "active",
            currentPeriodEnd: sub.current_period_end ?? null,
          });
          recordEvent(c.env, { name: "subscription_changed", detail: sub.status ?? "active", ...requestContext(c) });
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
          const status = event.type === "customer.subscription.deleted" ? "canceled" : (object.status ?? "active");
          await store.upsert({
            userId,
            stripeCustomerId: typeof object.customer === "string" ? object.customer : (current?.stripeCustomerId ?? null),
            stripeSubscriptionId: object.id,
            stripeSubscriptionCreated: object.created ?? current?.stripeSubscriptionCreated ?? null,
            status,
            currentPeriodEnd: object.current_period_end ?? null,
          });
          recordEvent(c.env, { name: "subscription_changed", detail: status, ...requestContext(c) });
        }
        await store.markEvent(event.id, { userId, status: "processed" });
      } else {
        await store.markEvent(event.id, { status: "ignored" });
      }
    } else if (event.type === "invoice.payment_failed") {
      const userId = object.metadata?.user_id ?? null;
      const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
      if (userId && subscriptionId) {
        const current = await store.get(userId);
        if (current?.stripeSubscriptionId === subscriptionId) {
          await store.upsert({ ...current, status: "past_due" });
          recordEvent(c.env, { name: "subscription_changed", detail: "past_due", ...requestContext(c) });
        }
        await store.markEvent(event.id, { userId, status: "processed" });
      } else {
        await store.markEvent(event.id, { status: "ignored" });
      }
    } else {
      await store.markEvent(event.id, { status: "ignored" });
    }
  } catch (err) {
    await store.markEvent(event.id, { status: "failed", lastError: (err as Error).message });
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
  recordEvent(c.env, {
    name: "activity_completed",
    ...parseLessonRef(lessonId),
    activity: typeof activity === "string" ? activity : "",
    ...requestContext(c),
  });
  return c.json({ lessonId, completed: result.completed });
});


// Unit checkpoint API: the server builds the 10-question set and
// enforces access (free learners get Unit 1; subscribers every unit;
// the unit's four lessons must be finished, which is the unlock).
app.get("/api/checkpoint/:lang/:level/:unit", async (c) => {
  const lang = c.req.param("lang");
  const level = Number(c.req.param("level"));
  const unit = Number(c.req.param("unit"));
  if (!isPickerLang(lang) || !Number.isInteger(level) || !Number.isInteger(unit)) {
    return c.json({ error: "not found" }, 404);
  }
  const built = buildCheckpointSet(lang, level, unit);
  if (!built) return c.json({ error: "not found" }, 404);
  const userId = await currentUserId(c);
  if (!userId || !c.env?.DB) return c.json({ error: "unauthorized" }, 401);
  const subscribed = await d1SubscriptionStore(c.env.DB).isSubscribed(userId).catch(() => false);
  if (!checkpointAccess({ level, unit, subscribed, paywallDisabled: paywallDisabled(c.env) })) {
    return c.json({ error: "subscription_required" }, 402);
  }
  const progress = await d1ProgressStore(c.env.DB).listAll(userId);
  const st = unitStats(lang, unit, progress);
  if (!(st.total > 0 && st.done >= st.total)) {
    return c.json({ error: "checkpoint_locked" }, 403);
  }
  return c.json({ lang, level, unit, questions: built.questions, pool: built.pool });
});

const ATTEMPT_ACTIVITIES = new Set(["listen-match", "image-phrase", "speak-score", "read-write"]);

// Record one answer; updates phraseStats (weak after a wrong answer
// or a speak score below 70; clears after two correct in a row).
app.post("/api/attempts", async (c) => {
  const userId = await currentUserId(c);
  if (!userId || !c.env?.DB) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json().catch(() => null);
  const { phraseId, lang, activity, correct, score } = body ?? {};
  if (
    typeof phraseId !== "string" || !phraseId ||
    !isPickerLang(lang) ||
    !ATTEMPT_ACTIVITIES.has(activity) ||
    typeof correct !== "boolean" ||
    (score != null && (typeof score !== "number" || score < 0 || score > 100))
  ) {
    return c.json({ error: "bad attempt" }, 400);
  }
  const stats = await d1AttemptStore(c.env.DB).recordAttempt(userId, {
    phraseId,
    lang,
    activity,
    correct,
    score: score ?? null,
    at: new Date().toISOString(),
  });
  return c.json({ stats });
});

// Record a finished checkpoint. The server enforces the pass mark
// itself (8 of 10) rather than trusting the client's passed flag.
app.post("/api/milestones", async (c) => {
  const userId = await currentUserId(c);
  if (!userId || !c.env?.DB) return c.json({ error: "unauthorized" }, 401);
  const body = await c.req.json().catch(() => null);
  const { kind, lang, level, unit, score, viaTestOut } = body ?? {};
  if (
    kind !== "checkpoint" ||
    !isPickerLang(lang) ||
    !Number.isInteger(level) || !Number.isInteger(unit) ||
    typeof score !== "number" || score < 0 || score > 10
  ) {
    return c.json({ error: "bad milestone" }, 400);
  }
  const passed = score >= 8;
  await d1AttemptStore(c.env.DB).recordMilestone(userId, {
    kind,
    lang,
    level,
    unit,
    score: Math.round(score),
    passed,
    viaTestOut: viaTestOut === true,
    completedAt: new Date().toISOString(),
  });
  return c.json({ passed });
});


// Practise my mistakes: up to 10 weak phrases, weakest first, only
// from lessons the learner can open. ?phrases=id1,id2 serves a given
// set (checkpoint/challenge result screens).
app.get("/api/review/:lang", async (c) => {
  const lang = c.req.param("lang");
  if (!isPickerLang(lang)) return c.json({ error: "not found" }, 404);
  const userId = await currentUserId(c);
  if (!userId || !c.env?.DB) return c.json({ error: "unauthorized" }, 401);
  const subscribed = await d1SubscriptionStore(c.env.DB).isSubscribed(userId).catch(() => false);
  const stats = await d1AttemptStore(c.env.DB).getStats(userId, lang);
  const phraseIds = (c.req.query("phrases") ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const built = buildReviewSet({
    lang,
    stats,
    subscribed,
    paywallDisabled: paywallDisabled(c.env),
    phraseIds: phraseIds.length ? phraseIds : undefined,
  });
  // Pool for choice-question distractors: phrases from the same lessons.
  const lessonNums = new Set(built.questions.map((q) => lessonOfPhrase(q.phrase.id)));
  const pool = [...phraseById(lang).values()].filter((p) => lessonNums.has(lessonOfPhrase(p.id)));
  return c.json({ lang, ...built, pool: pool.length ? pool : built.questions.map((q) => q.phrase) });
});

// Review page: same lesson shell; the player detects the path.
app.get("/:lang/review", (c) => {
  const lang = c.req.param("lang");
  if (!isPickerLang(lang)) return c.text("Not found", 404);
  return c.html(lessonPage(lang));
});

// Checkpoint page: same lesson shell; the player detects the path.
app.get("/:lang/checkpoint/:level/:unit", (c) => {
  const lang = c.req.param("lang");
  const level = Number(c.req.param("level"));
  const unit = Number(c.req.param("unit"));
  if (!isPickerLang(lang) || !Number.isInteger(level) || !Number.isInteger(unit) || !unitLessons(level, unit)) {
    return c.text("Not found", 404);
  }
  return c.html(lessonPage(lang));
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
