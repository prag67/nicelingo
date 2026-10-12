// Language picker (/). New visitors get the hero + grid + steps +
// pricing band; returning learners get a Keep-going card + list.
import { MONTHLY_PRICE_LABEL, YEARLY_PRICE_LABEL } from "./billing";
import { CURRICULUM, isFreeLesson, lessons } from "../lessons/curriculum";
import { pickerLanguages, type LanguageInfo } from "../lessons/languages";
import {
  activitiesTotal,
  countDoneLessons,
  escapeHtml,
  hasStarted,
  nextLesson,
} from "../lib/lesson-progress";
import { brandHtml, pageShell, pickerFooterHtml } from "./shell";
import type { CourseUser } from "./course";

export type PickerOpts = {
  progress?: Record<string, string[]>;
  user?: CourseUser;
  subscribed?: boolean;
  paywallDisabled?: boolean;
  /** Demo language for the hero card (remembered lang, default es). */
  demoLang?: string;
  origin?: string;
};

const CHECK_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>`;
const USER_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5"/></svg>`;
const SPEAKER_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16 9a4 4 0 0 1 0 6"/></svg>`;
const MIC_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>`;
const IMAGE_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 3.5 3.5L16 13l4 4"/></svg>`;
const PENCIL_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z"/></svg>`;

// Step copy verified against the player: listen-match hears audio and
// picks the photo; image-phrase sees the photo and picks the sentence;
// speak-score records and scores; read-write fills the missing word.
// Icon chips use the brief's fixed activity colors (sky/mint/orange/yellow).
const STEPS = [
  { icon: SPEAKER_SVG, name: "Listen", text: "Hear a phrase and pick the photo it describes.", tile: "#8CC8FF" },
  { icon: IMAGE_SVG, name: "Match", text: "See a photo and pick the phrase that fits it.", tile: "#7FE3C4" },
  { icon: MIC_SVG, name: "Speak", text: "Say the phrase aloud and get a pronunciation score.", tile: "#FFB061" },
  { icon: PENCIL_SVG, name: "Write", text: "Read the phrase and type the missing word.", tile: "#FFE066" },
];

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
        el.className = card.classList.contains("start-row") ? "" : "lang-prog";
        el.dataset.role = "prog";
        card.appendChild(el);
      }
      el.textContent = done + " of " + total + " done · Continue";
    });
    const keep = document.querySelector("[data-keep]");
    if (keep && map) {
      const lang = keep.dataset.keep;
      const prefix = lang === "en" ? "lesson-" : lang + "-lesson-";
      const total = Number(keep.dataset.total || "0");
      const need = Number(keep.dataset.steps || "4");
      let done = 0;
      for (const [key, acts] of Object.entries(map)) {
        if (key.startsWith(prefix) && new Set(acts).size >= need) done++;
      }
      const lbl = keep.querySelector("[data-role=keep-label]");
      if (lbl) lbl.textContent = keep.dataset.name + " · " + done + " of " + total + " lessons done";
      const bar = keep.querySelector("[data-role=keep-bar]");
      if (bar) bar.style.width = total ? Math.round((100 * done) / total) + "%" : "0%";
    }
  };
  // Seed from the server map so the first paint can only add this
  // browser's local progress, never wipe server-rendered counts.
  const merged = { ...(JSON.parse(document.getElementById("picker-data")?.textContent || "{}").server || {}) };
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
      $$("[data-account]").forEach((el) => {
        el.innerHTML = '<a class="acct-btn" href="/billing" aria-label="Account">${USER_SVG}</a>';
      });
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
  $$("[data-signin]").forEach((b) => b.addEventListener("click", async () => {
    try {
      await fetch("/api/auth/sign-in/anonymous", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: "{}",
      });
      location.reload();
    } catch {}
  }));
})();
</script>`;

function accountHtml(user: CourseUser): string {
  if (!user) return `<button class="btn-outline btn" data-signin type="button">Sign in</button>`;
  return `<a class="acct-btn" href="/billing" aria-label="Account">${USER_SVG}</a>`;
}

function cardHtml(info: LanguageInfo, progress: Record<string, string[]>): string {
  const tag = info.status === "partial" ? `<span class="tag">Level 1 only</span>` : "";
  // English reads "English / English" otherwise; skip the duplicate line.
  const sub = info.name !== info.ownName
    ? `${escapeHtml(info.name)} · ${info.lessons} lessons`
    : `${info.lessons} lessons`;
  const started = hasStarted(info.code, progress);
  const steps = activitiesTotal(info.code, "001") || 4;
  const prog = started
    ? `<span class="lang-prog" data-role="prog">${countDoneLessons(info.code, progress)} of ${info.lessons} done · Continue</span>`
    : "";
  return `<a class="lang-card" style="--tile:${info.tileColor}" href="/${info.code}" data-langcard="${info.code}" data-total="${info.lessons}" data-steps="${steps}"><span class="lang-greet">${escapeHtml(info.greeting)}</span>${tag}<span class="lang-body"><span class="lang-own">${escapeHtml(info.ownName)}</span><span class="lang-sub">${sub}</span>${prog}</span></a>`;
}

function rowHtml(info: LanguageInfo, progress: Record<string, string[]>): string {
  const tag = info.status === "partial" ? `<span class="mini-tag">Level 1 only</span>` : "";
  const steps = activitiesTotal(info.code, "001") || 4;
  const started = hasStarted(info.code, progress);
  const prog = started
    ? `<span data-role="prog">${countDoneLessons(info.code, progress)} of ${info.lessons} done · Continue</span>`
    : "";
  const sub = info.name !== info.ownName
    ? `${escapeHtml(info.name)} · ${info.lessons} lessons`
    : `${info.lessons} lessons`;
  return `<a class="start-row" style="--tile:${info.tileColor}" href="/${info.code}" data-langcard="${info.code}" data-total="${info.lessons}" data-steps="${steps}"><span><b>${escapeHtml(info.ownName)}${tag}</b><span>${sub}</span>${prog}</span><span class="chev" aria-hidden="true">›</span></a>`;
}

function newVisitorHtml(langs: LanguageInfo[], progress: Record<string, string[]>, demoLang: string, subscribed: boolean): string {
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
    : `<section class="band" aria-label="Pricing"><div><b>Unit 1 is free.</b><span>Every lesson ${MONTHLY_PRICE_LABEL} or ${YEARLY_PRICE_LABEL}.</span></div><a class="btn btn-prem" href="/billing">See plans</a></section>`;
  return `<section class="hero">
<div>
<p class="eyebrow">See it. Hear it. Say it.</p>
<h1 class="display">What do you want to learn?</h1>
<p class="lede">Each lesson pairs eight photos with audio, then scores how you say them.</p>
<p class="free-line">${CHECK_SVG} Unit 1 (lessons 1-4) is free, no account needed.</p>
</div>
<div class="demo">
<img src="${phrase ? escapeHtml(phrase.imageUrl) : ""}" alt="" loading="eager">
<div class="demo-body">
<p class="demo-kicker">${escapeHtml(demoInfo.name)} · Lesson 1 · ${escapeHtml(CURRICULUM["001"].title)}</p>
<p class="demo-phrase">${heroPhrase}</p>
<div class="demo-actions">
<button class="btn" type="button" data-hear="${phrase ? escapeHtml(phrase.audioUrl) : ""}">${SPEAKER_SVG} Hear it</button>
<a class="btn btn-outline" href="/lesson/${demoInfo.code}/001">${MIC_SVG} Say it</a>
</div>
</div>
</div>
</section>
<h2 class="section-h">Choose a language</h2>
<div class="lang-grid">${langs.map((info) => cardHtml(info, progress)).join("")}</div>
<h2 class="section-h">Four steps in every lesson</h2>
<div class="steps-grid">${STEPS.map((s, i) => `<div class="step-card"><span class="step-ic" style="--tic:${s.tile}">${s.icon}</span><h3>${i + 1}. ${s.name}</h3><p>${s.text}</p></div>`).join("")}</div>
${band}`;
}

function returningHtml(
  keep: LanguageInfo,
  rest: LanguageInfo[],
  progress: Record<string, string[]>,
  subscribed: boolean,
  paywallDisabled: boolean,
): string {
  const done = countDoneLessons(keep.code, progress);
  const pct = keep.lessons ? Math.round((100 * done) / keep.lessons) : 0;
  const steps = activitiesTotal(keep.code, "001") || 4;
  const next = nextLesson(keep.code, progress);
  const locked = !paywallDisabled && !isFreeLesson(next.n) && !subscribed;
  // Deep-link the open lesson; fall back to the course when it's locked.
  const target = locked ? `/${keep.code}` : `/lesson/${keep.code}/${next.n}`;
  const verb = next.review ? "Review" : "Continue";
  return `<h1 class="display display-sm">What do you want to learn?</h1>
<h2 class="section-h section-h-sm">Keep going!</h2>
<div class="keep" data-keep="${keep.code}" data-total="${keep.lessons}" data-steps="${steps}" data-name="${escapeHtml(keep.name)}">
<div class="keep-top"><span class="keep-chip" style="--tile:${keep.tileColor}">${escapeHtml(keep.greeting)}</span><div class="keep-info"><b>${escapeHtml(keep.ownName)}</b><span data-role="keep-label">${escapeHtml(keep.name)} · ${done} of ${keep.lessons} lessons done</span></div></div>
<div class="keep-bar"><i data-role="keep-bar" style="width:${pct}%"></i></div>
<a class="btn btn-block" href="${target}">${verb} lesson ${Number(next.n)}</a>
</div>
<h2 class="section-h section-h-sm">Or start another</h2>
<div class="start-list">${rest.map((info) => rowHtml(info, progress)).join("")}</div>`;
}

export function homePage(opts: PickerOpts = {}): string {
  const progress = opts.progress ?? {};
  const user = opts.user ?? null;
  const langs = pickerLanguages();
  const started = langs.filter((l) => hasStarted(l.code, progress));
  const demoLang = langs.some((l) => l.code === opts.demoLang) ? opts.demoLang! : "es";
  const head = `<header class="site-head">${brandHtml()}<span class="head-sp"></span><span data-account>${accountHtml(user)}</span></header>`;
  const body =
    started.length > 0
      ? (() => {
          const ranked = [...started].sort(
            (a, b) => countDoneLessons(b.code, progress) - countDoneLessons(a.code, progress),
          );
          const keep = ranked[0];
          return returningHtml(
            keep,
            langs.filter((l) => l.code !== keep.code),
            progress,
            opts.subscribed ?? false,
            opts.paywallDisabled ?? false,
          );
        })()
      : newVisitorHtml(langs, progress, demoLang, opts.subscribed ?? false);
  const blob = JSON.stringify({ server: progress }).replace(/</g, "\\u003c");
  return pageShell({
    title: "Nicelingo — Learn to speak a new language, free",
    origin: opts.origin ?? "",
    body: `${head}${body}${pickerFooterHtml()}<script type="application/json" id="picker-data">${blob}</script>${CLIENT}`,
  });
}
