// Course home (/{lang}): continue card, level tabs, units, lesson cards.
// Server-rendered; a small inline script hydrates progress and account
// state from /api/progress/all plus the localStorage mirror.
import { CURRICULUM, LEVELS, UNITS, isFreeLesson, lessons, type Lang } from "../lessons/curriculum";
import { pickerLanguages } from "../lessons/languages";
import {
  ACTIVITY_SHORT,
  activitiesFor,
  activitiesTotal,
  doneCount,
  escapeHtml,
  hasStarted,
  levelStats,
  nextLesson,
  progressKey,
  unitStats,
} from "../lib/lesson-progress";
import { MONTHLY_PRICE_LABEL, YEARLY_PRICE_LABEL } from "./billing";
import { brandHtml, courseFooterHtml, pageShell } from "./shell";

export type CourseUser = {
  email: string | null;
  isAnonymous: boolean | null;
} | null;

export type CourseOpts = {
  progress: Record<string, string[]>;
  subscribed: boolean;
  paywallDisabled: boolean;
  user: CourseUser;
  /** Requested ?level=; falls back to the level holding nextLesson. */
  level?: number;
  origin?: string;
};

const LOCK_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
const CHECK_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>`;
const USER_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5"/></svg>`;

function thumbFor(n: string): string {
  return `/static/lesson-${n}/images/thumb.jpg`;
}

function stepsLabel(done: number, total: number): string {
  return `${done} of ${total} steps complete`;
}

function segsHtml(done: number, total: number): string {
  let segs = "";
  for (let i = 0; i < total; i++) {
    segs += `<i class="${i < done ? "on" : ""}"></i>`;
  }
  return `<span class="segs" role="img" aria-label="${stepsLabel(done, total)}">${segs}</span>`;
}

/** Step pills (desktop) + labeled step bars (phone) for the next lesson. */
function stepsHtml(lang: string, n: string, completed: string[]): string {
  const acts = activitiesFor(lang, n);
  const doneSet = new Set(completed);
  const nextIdx = acts.findIndex((a) => !doneSet.has(a));
  const pills = acts
    .map((a, i) => {
      const label = `${i + 1} ${ACTIVITY_SHORT[a] ?? a}`;
      if (doneSet.has(a)) return `<span class="pill pill-done">${label} · done</span>`;
      if (i === nextIdx && doneSet.size > 0) return `<span class="pill pill-next">${label} · next</span>`;
      return `<span class="pill">${label}</span>`;
    })
    .join("");
  const bars = acts
    .map((a, i) => {
      const cls = doneSet.has(a) ? "done" : i === nextIdx && doneSet.size > 0 ? "next" : "todo";
      return `<span class="stepbar ${cls}"><i></i><span>${ACTIVITY_SHORT[a] ?? a}</span></span>`;
    })
    .join("");
  const cols = acts.length === 3 ? "three" : "four";
  return `<div class="pills">${pills}</div><div class="stepbars ${cols}">${bars}</div>`;
}

function accountHtml(user: CourseUser, subscribed: boolean): string {
  if (subscribed) {
    return `<span class="badge-premium-top">Premium</span><a class="acct-btn" href="/billing" aria-label="Account">${USER_SVG}</a>`;
  }
  if (!user) {
    return `<a class="btn btn-prem btn-sm" href="/billing">Go Premium</a><span class="signin-plain" data-account><button class="linklike" data-signin type="button">Sign in</button></span>`;
  }
  return `<a class="btn btn-prem btn-sm" href="/billing">Go Premium</a><a class="acct-btn" href="/billing" aria-label="Account">${USER_SVG}</a>`;
}

function lessonCard(
  lang: string,
  n: string,
  locked: boolean,
  returnUrl: string,
  progress: Record<string, string[]>,
): string {
  const num = Number(n);
  const title = CURRICULUM[n].title;
  if (locked) {
    return `<a class="lcard" href="/billing?return=${encodeURIComponent(returnUrl)}"><span class="thumb locked"><img src="${thumbFor(n)}" alt="" loading="lazy"><span class="lbadge premium">${LOCK_SVG} Premium</span></span><span class="lbody"><span class="lnum">Lesson ${num}</span><span class="ltitle">${escapeHtml(title)}</span>${segsHtml(0, activitiesTotal(lang, n))}<span class="lstatus"><strong>Premium</strong></span></span></a>`;
  }
  const total = activitiesTotal(lang, n);
  const done = doneCount(progress[progressKey(lang, n)], total);
  const finished = total > 0 && done >= total;
  const now = !finished && done > 0 ? " now" : "";
  const badge =
    isFreeLesson(n)
      ? `<span class="lbadge free">Free</span>`
      : finished
        ? `<span class="lbadge done">${CHECK_SVG} Done</span>`
        : "";
  // Unit 1 lessons done by a non-subscriber still read Done, not Free.
  const badgeHtml = finished ? `<span class="lbadge done">${CHECK_SVG} Done</span>` : badge;
  const status = finished
    ? `<strong>Done</strong>`
    : done > 0
      ? `${done} of ${total} steps · <strong>Resume</strong>`
      : `Not started`;
  return `<a class="lcard${now}" href="/lesson/${lang}/${n}"><span class="thumb"><img src="${thumbFor(n)}" alt="" loading="lazy">${badgeHtml}</span><span class="lbody"><span class="lnum">Lesson ${num}</span><span class="ltitle">${escapeHtml(title)}</span><span data-prog="${progressKey(lang, n)}" data-total="${total}">${segsHtml(done, total)}<span class="lstatus">${stepsLabel(done, total)} · ${status}</span></span></span></a>`;
}

function continueCard(
  lang: string,
  info: { name: string; lessons: number },
  locked: boolean,
  subscribed: boolean,
  returnUrl: string,
  progress: Record<string, string[]>,
): string {
  const next = nextLesson(lang, progress);
  const num = Number(next.n);
  const completed = progress[progressKey(lang, next.n)] ?? [];
  const photo = `<div class="cont-photo"><img src="${thumbFor(next.n)}" alt=""></div>`;
  if (next.review) {
    return `<section class="cont" aria-label="Continue">${photo}<div class="cont-body"><p class="cont-label">Course complete 🎉</p><h2 class="cont-title">Lesson ${num} · ${escapeHtml(next.title)}</h2><p class="cont-ctx">Unit ${next.unit} · ${escapeHtml(next.unitTitle)}</p><a class="btn" href="/lesson/${lang}/${next.n}">Review lesson ${num} →</a></div></section>`;
  }
  if (locked) {
    return `<section class="cont" aria-label="Continue">${photo}<div class="cont-body"><p class="cont-label">Nice work! Next up</p><h2 class="cont-title">Lesson ${num} · ${escapeHtml(next.title)}</h2><p class="cont-ctx">You finished the free unit. Premium opens every ${escapeHtml(info.name)} lesson for ${MONTHLY_PRICE_LABEL} or ${YEARLY_PRICE_LABEL}.</p>${stepsHtml(lang, next.n, [])}<a class="btn" href="/billing?return=${encodeURIComponent(returnUrl)}">Unlock every lesson →</a></div></section>`;
  }
  const fresh = next.done === 0;
  const label = subscribed
    ? fresh && next.n === "001"
      ? "Start here"
      : "Keep going!"
    : fresh
      ? "Start here · Free"
      : "Continue";
  const verb = fresh ? "Start" : "Resume";
  const manifest = lessons[next.n]?.[lang as Lang];
  const counts = manifest ? ` · ${manifest.phrases.length} photos, ${manifest.activities.length} short steps` : "";
  const ctx = `Unit ${next.unit} · ${escapeHtml(next.unitTitle)}${counts}${fresh ? "" : ` · ${stepsLabel(next.done, next.total)}`}`;
  return `<section class="cont" aria-label="Continue">${photo}<div class="cont-body"><p class="cont-label">${label}</p><h2 class="cont-title">Lesson ${num} · ${escapeHtml(next.title)}</h2><p class="cont-ctx">${ctx}</p>${stepsHtml(lang, next.n, completed)}<a class="btn" href="/lesson/${lang}/${next.n}" data-continue>${verb} lesson ${num} →</a></div></section>`;
}

const CLIENT = `<script>
(async () => {
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  try {
    const cur = document.querySelector("[data-current]");
    const first = document.querySelector("section.unit");
    if (cur && cur !== first) cur.scrollIntoView({ block: "start" });
  } catch {}
  // Broken thumbnails fall back to the tinted panel behind them.
  $$("img").forEach((img) => img.addEventListener("error", () => img.remove()));
  const blob = JSON.parse(document.getElementById("course-data")?.textContent || "{}");
  const server = blob.server || {};
  const totals = blob.totals || {};
  const merged = { ...server };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k && k.match(/^nicelingo:completed:(.+)$/);
      if (!m) continue;
      const local = JSON.parse(localStorage.getItem(k) || "[]");
      merged[m[1]] = Array.from(new Set([...(merged[m[1]] || []), ...local]));
    }
  } catch {}
  const paint = (map) => {
    $$("[data-prog]").forEach((el) => {
      const total = Number(el.dataset.total || "0");
      if (!total) return;
      const done = Math.min(new Set(map[el.dataset.prog] || []).size, total);
      el.querySelectorAll(".segs i").forEach((b, i) => b.classList.toggle("on", i < done));
      el.querySelector(".segs")?.setAttribute("aria-label", done + " of " + total + " steps complete");
      const lbl = el.querySelector(".lstatus");
      if (lbl) {
        if (done >= total) lbl.innerHTML = done + " of " + total + " steps complete · <strong>Done</strong>";
        else if (done > 0) lbl.innerHTML = done + " of " + total + " steps complete · " + done + " of " + total + " steps · <strong>Resume</strong>";
      }
    });
    $$("[data-unitcount]").forEach((el) => {
      const [unit, total] = el.dataset.unitcount.split(":").map(Number);
      let d = 0;
      for (const n of blob.units?.[unit] ?? []) {
        const key = blob.lang === "en" ? "lesson-" + n : blob.lang + "-lesson-" + n;
        const t = totals[key] || 0;
        if (t > 0 && Math.min(new Set(merged[key] || []).size, t) >= t) d++;
      }
      el.textContent = d + " of " + total + " done";
    });
  };
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
      const note = document.querySelector("[data-signin-note]");
      if (note) note.hidden = true;
      const r = await fetch("/api/progress/all", { credentials: "include" });
      if (r.ok) {
        const { lessons } = await r.json();
        for (const [k, v] of Object.entries(lessons || {})) {
          merged[k] = Array.from(new Set([...(merged[k] || []), ...v]));
        }
        paint(merged);
      }
    }
  } catch { /* page stays usable offline */ }
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

export function coursePage(lang: string, opts: CourseOpts): string {
  const info = pickerLanguages().find((l) => l.code === lang);
  if (!info) throw new Error(`unknown course language ${lang}`);
  const { progress, subscribed, paywallDisabled, user } = opts;
  const locked = (n: string): boolean =>
    !paywallDisabled && !isFreeLesson(n) && !subscribed;
  const next = nextLesson(lang, progress);
  // Totals don't depend on progress; the empty map keeps this pure.
  const levelHasLessons = (level: number): boolean =>
    levelStats(lang, level, {}).total > 0;
  const selected =
    opts.level !== undefined &&
    opts.level >= 1 &&
    opts.level <= 5 &&
    levelHasLessons(opts.level)
      ? opts.level
      : next.level;
  const returnUrl = `/${lang}?level=${selected}`;

  const tabs = LEVELS.map((l) => {
    const st = levelStats(lang, l.level, progress);
    if (st.total === 0) {
      return `<span class="tab-off" aria-disabled="true">${l.level} ${escapeHtml(l.title)} · Coming soon</span>`;
    }
    const cur = l.level === selected ? ` aria-current="page"` : "";
    return `<a class="tab" href="/${lang}?level=${l.level}"${cur}>${l.level} ${escapeHtml(l.title)} <span class="cnt">${st.done}/${st.total}</span></a>`;
  }).join("");

  const levelUnits = UNITS.filter((u) =>
    LEVELS.find((l) => l.level === selected)?.units.includes(u.unit),
  );
  const freshVisitor = !hasStarted(lang, progress) && !subscribed && !paywallDisabled;
  // Unit badges cycle the registry tile colors in registry order.
  const tiles = pickerLanguages().map((l) => l.tileColor);
  const sections = levelUnits
    .map((u, i) => {
      const st = unitStats(lang, u.unit, progress);
      const current = u.lessons.includes(next.n) ? " data-current" : "";
      const cards = u.lessons
        .map((n) =>
          activitiesTotal(lang, n) > 0
            ? lessonCard(lang, n, locked(n), returnUrl, progress)
            : "",
        )
        .join("");
      const strip =
        i === 0 && freshVisitor
          ? `<section class="band" aria-label="Pricing"><div><b>Unit 1 is free.</b><span>Premium opens every lesson for ${MONTHLY_PRICE_LABEL} or ${YEARLY_PRICE_LABEL}.</span></div><a class="btn btn-prem" href="/billing?return=${encodeURIComponent(returnUrl)}">See plans</a></section>`
          : "";
      const tile = tiles[(u.unit - 1) % tiles.length];
      return `<section class="unit" id="u${u.unit}"${current}><div class="unit-head"><span class="ubadge" style="--tile:${tile}">${u.unit}</span><h2>Unit ${u.unit} · ${escapeHtml(u.title)}</h2><span class="cnt" data-unitcount="${u.unit}:${st.total}">${st.done} of ${st.total} done</span></div><div class="lgrid">${cards}</div></section>${strip}`;
    })
    .join("");

  const signinNote = user
    ? ""
    : `<p class="signin-line" data-signin-note>Your progress is saved on this device only. <button class="linklike" data-signin type="button">Sign in to keep it</button></p>`;

  const totals: Record<string, number> = {};
  for (const u of UNITS) {
    for (const n of u.lessons) {
      const t = activitiesTotal(lang, n);
      if (t > 0) totals[progressKey(lang, n)] = t;
    }
  }
  const units: Record<number, string[]> = {};
  for (const u of UNITS) units[u.unit] = u.lessons;
  const blob = JSON.stringify({ lang, server: progress, totals, units });

  const head = `<header class="site-head">${brandHtml()}<a class="chip" href="/?change=1">${escapeHtml(info.ownName)} ▾</a><span class="head-sp"></span>${accountHtml(user, subscribed)}</header>`;
  const body = `${head}${continueCard(lang, info, locked(next.n), subscribed, returnUrl, progress)}${signinNote}<nav class="tabs" aria-label="Levels">${tabs}</nav>${sections}${courseFooterHtml()}<script type="application/json" id="course-data">${blob.replace(/</g, "\\u003c")}</script>${CLIENT}`;
  return pageShell({ title: `${info.ownName} course · Nicelingo`, origin: opts.origin ?? "", body });
}
