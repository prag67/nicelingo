// Language picker (/): hero + grid + steps + pricing band for
// everyone; started languages show progress on their cards.
import { CURRICULUM, lessons } from "../lessons/curriculum";
import { pickerLanguages, type LanguageInfo } from "../lessons/languages";
import {
  activitiesTotal,
  countDoneLessons,
  escapeHtml,
  hasStarted,
} from "../lib/lesson-progress";
import { accountMenuHtml, brandHtml, pageShell, siteFooterHtml, streakChipHtml } from "./shell";
import { computeStreak, localDayString } from "../lib/streaks";
import { MONTHLY_PRICE_LABEL, YEARLY_PRICE_LABEL } from "./billing";
import { fmt, t, type UiLang } from "../lib/i18n";
import type { CourseUser } from "./course";

export type PickerOpts = {
  progress?: Record<string, string[]>;
  user?: CourseUser;
  registered?: boolean;
  subscribed?: boolean;
  uiLang?: UiLang;
  streakDays?: string[];
  paywallDisabled?: boolean;
  /** Demo language for the hero card (remembered lang, default es). */
  demoLang?: string;
  origin?: string;
};

const CHECK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>`;
const SPEAKER_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>`;
const MIC_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;
const IMAGE_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 3.5 3.5L16 13l4 4"/></svg>`;
const PENCIL_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg>`;

// Step copy verified against the player: listen-match hears audio and
// picks the photo; image-phrase sees the photo and picks the sentence;
// speak-score records and scores; read-write fills the missing word.
// Icon chips use the brief's fixed activity colors (sky/mint/orange/yellow).
function stepsFor(ui: UiLang) {
  const d = t(ui);
  return [
    { icon: SPEAKER_SVG, name: d.stepListen, text: d.stepListenText, tile: "#8CC8FF" },
    { icon: IMAGE_SVG, name: d.stepMatch, text: d.stepMatchText, tile: "#7FE3C4" },
    { icon: MIC_SVG, name: d.stepSpeak, text: d.stepSpeakText, tile: "#FFB061" },
    { icon: PENCIL_SVG, name: d.stepWrite, text: d.stepWriteText, tile: "#FFE066" },
  ];
}

const CLIENT = `<script>
(async () => {
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const paint = (map) => {
    $$("[data-langcard]").forEach((card) => {
      const lang = card.dataset.langcard;
      const prefix = lang === "en" ? "lesson-" : lang + "-lesson-";
      let done = 0;
      let started = false;
      const total = Number(card.dataset.total || "0");
      const need = Number(card.dataset.steps || "4");
      for (const [key, acts] of Object.entries(map)) {
        if (!key.startsWith(prefix)) continue;
        if (acts.length > 0) started = true;
        if (new Set(acts).size >= need) done++;
      }
      if (!started) return;
      let el = card.querySelector("[data-role=prog]");
      if (!el) {
        el = document.createElement("span");
        el.className = "lang-prog";
        el.dataset.role = "prog";
        card.appendChild(el);
      }
      el.textContent = (blobUi.lessonsDone || "{done} of {total} lessons done").replace("{done}", done).replace("{total}", total) + " · " + (blobUi.continueLabel || "Continue");
    });
  };
  // Seed from the server map so the first paint can only add this
  // browser's local progress, never wipe server-rendered counts.
  const pickerBlob = JSON.parse(document.getElementById("picker-data")?.textContent || "{}");
  const blobUi = pickerBlob.ui || {};
  try {
    const local = JSON.parse(localStorage.getItem("nl-days") || "[]");
    const all = new Set([...(pickerBlob.days || []), ...local]);
    const now = new Date();
    const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
    const prevDay = (ds) => { const x = new Date(ds + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
    let cur = 0; let cursor = all.has(today) ? today : prevDay(today);
    while (all.has(cursor)) { cur++; cursor = prevDay(cursor); }
    const chip = document.querySelector("[data-streak]");
    if (chip && cur > 0) { chip.hidden = false; chip.innerHTML = "🔥 <b>" + cur + "</b>"; chip.title = (blobUi.dayStreak || "{n}-day streak").replace("{n}", cur); }
  } catch {}
  const merged = { ...(pickerBlob.server || {}) };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k && k.match(/^nicelingo:completed:(.+)$/);
      if (m) {
        const local = JSON.parse(localStorage.getItem(k) || "[]");
        merged[m[1]] = Array.from(new Set([...(merged[m[1]] || []), ...local]));
      }
    }
  } catch {}
  paint(merged);
  try {
    let me = await fetch("/api/me", { credentials: "include" });
    if (!me.ok) {
      await fetch("/api/auth/sign-in/anonymous", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: "{}",
      });
      me = await fetch("/api/me", { credentials: "include" });
    }
    if (me.ok) {
      const r = await fetch("/api/progress/all", { credentials: "include" });
      if (r.ok) {
        const { lessons } = await r.json();
        for (const [k, v] of Object.entries(lessons || {})) {
          merged[k] = Array.from(new Set([...(merged[k] || []), ...v]));
        }
        paint(merged);
      }
    }
  } catch { /* picker stays usable offline */ }
  const hear = document.querySelector("[data-hear]");
  if (hear) hear.addEventListener("click", () => {
    try { new Audio(hear.dataset.hear).play(); } catch {}
  });
})();
</script>`;

function cardHtml(info: LanguageInfo, progress: Record<string, string[]>, ui: UiLang = "en"): string {
  const d = t(ui);
  const tag = info.status === "partial" ? `<span class="tag">Level 1 only</span>` : "";
  // English reads "English / English" otherwise; skip the duplicate line.
  const sub = info.name !== info.ownName
    ? `${escapeHtml(info.name)} · ${fmt(d.lessonsCount, { n: info.lessons })}`
    : fmt(d.lessonsCount, { n: info.lessons });
  const started = hasStarted(info.code, progress);
  const steps = activitiesTotal(info.code, "001") || 4;
  const prog = started
    ? `<span class="lang-prog" data-role="prog">${fmt(d.lessonsDone, { done: countDoneLessons(info.code, progress), total: info.lessons })} · ${d.continueLabel}</span>`
    : "";
  return `<a class="lang-card" style="--tile:${info.tileColor}" href="/${info.code}" data-langcard="${info.code}" data-total="${info.lessons}" data-steps="${steps}"><span class="lang-greet">${escapeHtml(info.greeting)}</span>${tag}<span class="lang-body"><span class="lang-own"><span class="lang-flag" aria-hidden="true">${info.flag}</span> ${escapeHtml(info.ownName)}</span><span class="lang-sub">${sub}</span>${prog}</span></a>`;
}

function newVisitorHtml(langs: LanguageInfo[], progress: Record<string, string[]>, demoLang: string, subscribed: boolean, ui: UiLang = "en"): string {
  const d = t(ui);
  const demo = lessons["001"][demoLang as keyof (typeof lessons)["001"]];
  const demoInfo = langs.find((l) => l.code === demoLang) ?? langs[1] ?? langs[0];
  const phrase = demo?.phrases[0];
  const heroPhrase = phrase
    ? phrase.scoreText
      ? `${escapeHtml(phrase.scoreText)}<small>${escapeHtml(phrase.text)}</small>`
      : escapeHtml(phrase.text)
    : "";
  const band = subscribed
    ? ""
    : `<section class="band" aria-label="Pricing"><div><b>${d.bandTitle}</b><span>${fmt(d.everyLessonPrice, { monthly: d.monthlyPrice, yearly: d.yearlyPrice })}</span></div><a class="btn btn-prem" href="/billing">${d.seePlans}</a></section>`;
  return `<section class="hero">
<div>
<p class="eyebrow">${d.heroEyebrow}</p>
<h1 class="display">${d.heroTitle}</h1>
<p class="lede">${d.heroLede}</p>
<p class="free-line">${CHECK_SVG} ${d.freeLine}</p>
</div>
<div class="demo">
<img src="${phrase ? escapeHtml(phrase.imageUrl) : ""}" alt="" loading="eager">
<div class="demo-body">
<p class="demo-kicker">${escapeHtml(demoInfo.name)} · ${d.lessonWord} 1 · ${escapeHtml(CURRICULUM["001"].title)}</p>
<p class="demo-phrase">${heroPhrase}</p>
<div class="demo-actions">
<button class="btn" type="button" data-hear="${phrase ? escapeHtml(phrase.audioUrl) : ""}">${SPEAKER_SVG} ${d.hearIt}</button>
<a class="btn btn-outline" href="/lesson/${demoInfo.code}/001">${MIC_SVG} ${d.sayIt}</a>
</div>
</div>
</div>
</section>
<h2 class="section-h">${d.chooseLanguage}</h2>
<div class="lang-grid">${langs.map((info) => cardHtml(info, progress, ui)).join("")}</div>
<h2 class="section-h">${d.stepsHeading}</h2>
<div class="steps-grid">${stepsFor(ui).map((s, i) => `<div class="step-card"><span class="step-ic" style="--tic:${s.tile}">${s.icon}</span><h3>${i + 1}. ${s.name}</h3><p>${s.text}</p></div>`).join("")}</div>
${band}`;
}

export function homePage(opts: PickerOpts = {}): string {
  // One picker for everyone: started languages show their progress on
  // their cards (lessons done + Continue), so no separate Keep-going
  // view is needed.
  const progress = opts.progress ?? {};
  const user = opts.user ?? null;
  const langs = pickerLanguages();
  const demoLang = langs.some((l) => l.code === opts.demoLang) ? opts.demoLang! : "es";
  const ui = opts.uiLang ?? "en";
  const head = `<header class="site-head">${brandHtml()}<span class="head-sp"></span>${streakChipHtml(computeStreak(opts.streakDays ?? [], localDayString()), ui)}<span data-account>${accountMenuHtml({ user, subscribed: opts.subscribed ?? false, ui, path: "/" })}</span></header>`;
  const body = newVisitorHtml(langs, progress, demoLang, opts.subscribed ?? false, ui);
  const blob = JSON.stringify({ server: progress, days: opts.streakDays ?? [], ui: { lessonsDone: t(ui).lessonsDone, continueLabel: t(ui).continueLabel, dayStreak: t(ui).dayStreak } }).replace(/</g, "\\u003c");
  const origin = opts.origin ?? "";
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${origin}/#org`, name: "Nicelingo", url: origin, logo: `${origin}/logo/favicon.svg` },
      { "@type": "WebSite", url: origin, name: "Nicelingo", publisher: { "@id": `${origin}/#org` }, inLanguage: ["en", "es", "de", "fr", "th", "zh"] },
    ],
  }).replace(/</g, "\\u003c");
  return pageShell({
    title: "Nicelingo — Learn to speak a new language, start free",
    lang: ui,
    origin,
    canonicalPath: "/",
    jsonLd,
    body: `${head}${body}${siteFooterHtml(ui, "/", { registered: opts.registered ?? false })}<script type="application/json" id="picker-data">${blob}</script>${CLIENT}`,
  });
}
