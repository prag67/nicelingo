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
import { accountMenuHtml, brandHtml, pageShell, siteFooterHtml } from "./shell";
import { MONTHLY_PRICE_LABEL, YEARLY_PRICE_LABEL } from "./billing";
import { fmt, localizeLessonTitle, localizeLevelTitle, localizeUnitTitle, t, type UiLang } from "../lib/i18n";
import { streakChipHtml } from "./shell";
import { computeStreak, localDayString } from "../lib/streaks";

export type CourseUser = {
  email: string | null;
  isAnonymous: boolean | null;
} | null;

export type CourseOpts = {
  progress: Record<string, string[]>;
  milestones?: import("../lib/attempts").Milestone[];
  weakCount?: number;
  registered: boolean;
  subscribed?: boolean;
  uiLang?: UiLang;
  streakDays?: string[];
  paywallDisabled: boolean;
  user: CourseUser;
  /** Requested ?level=; falls back to the level holding nextLesson. */
  level?: number;
  origin?: string;
};

const LOCK_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>`;
const CHECK_SVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>`;
function thumbFor(n: string): string {
  return `/static/lesson-${n}/images/thumb.jpg`;
}

function stepsLabel(done: number, total: number): string {
  return `${done} of ${total} steps complete`;
}

function segsHtml(done: number, total: number, ui: UiLang = "en"): string {
  let segs = "";
  for (let i = 0; i < total; i++) {
    segs += `<i class="${i < done ? "on" : ""}"></i>`;
  }
  return `<span class="segs" role="img" aria-label="${fmt(t(ui).stepsComplete, { done, total })}">${segs}</span>`;
}

/** Step pills (desktop) + labeled step bars (phone) for the next lesson. */
const ACT_KEYS: Record<string, "stepListen" | "stepMatch" | "stepSpeak" | "stepWrite"> = {
  "listen-match": "stepListen", "image-phrase": "stepMatch", "speak-score": "stepSpeak", "read-write": "stepWrite",
};
function stepsHtml(lang: string, n: string, completed: string[], ui: UiLang = "en"): string {
  const d = t(ui);
  const acts = activitiesFor(lang, n);
  const doneSet = new Set(completed);
  const nextIdx = acts.findIndex((a) => !doneSet.has(a));
  const pills = acts
    .map((a, i) => {
      const label = `${i + 1} ${d[ACT_KEYS[a] ?? "stepListen"] ?? ACTIVITY_SHORT[a] ?? a}`;
      if (doneSet.has(a)) return `<span class="pill pill-done">${label} · ${d.pillDone}</span>`;
      if (i === nextIdx && doneSet.size > 0) return `<span class="pill pill-next">${label} · ${d.pillNext}</span>`;
      return `<span class="pill">${label}</span>`;
    })
    .join("");
  const bars = acts
    .map((a, i) => {
      const cls = doneSet.has(a) ? "done" : i === nextIdx && doneSet.size > 0 ? "next" : "todo";
      return `<span class="stepbar ${cls}"><i></i><span>${d[ACT_KEYS[a] ?? "stepListen"] ?? ACTIVITY_SHORT[a] ?? a}</span></span>`;
    })
    .join("");
  const cols = acts.length === 3 ? "three" : "four";
  return `<div class="pills">${pills}</div><div class="stepbars ${cols}">${bars}</div>`;
}



function lessonCard(
  lang: string,
  n: string,
  locked: boolean,
  returnUrl: string,
  progress: Record<string, string[]>,
  ui: UiLang = "en",
): string {
  const d = t(ui);
  const num = Number(n);
  const title = CURRICULUM[n].title;
  if (locked) {
    return `<a class="lcard" href="/billing?return=${encodeURIComponent(returnUrl)}"><span class="thumb locked"><img src="${thumbFor(n)}" alt="" loading="lazy"><span class="lbadge premium">${LOCK_SVG} ${d.premiumBadge}</span></span><span class="lbody"><span class="lnum">${d.lessonWord} ${num}</span><span class="ltitle">${escapeHtml(localizeLessonTitle(ui, title))}</span>${segsHtml(0, activitiesTotal(lang, n), ui)}<span class="lstatus"><strong>${d.premiumBadge}</strong></span></span></a>`;
  }
  const total = activitiesTotal(lang, n);
  const done = doneCount(progress[progressKey(lang, n)], total);
  const finished = total > 0 && done >= total;
  const now = !finished && done > 0 ? " now" : "";
  const badge =
    isFreeLesson(n)
      ? `<span class="lbadge free">${d.freeBadge}</span>`
      : finished
        ? `<span class="lbadge done">${CHECK_SVG} ${d.doneWord}</span>`
        : "";
  // Unit 1 lessons done by a non-subscriber still read Done, not Free.
  const badgeHtml = finished ? `<span class="lbadge done">${CHECK_SVG} ${d.doneWord}</span>` : badge;
  const status = finished
    ? `<strong>${d.doneWord}</strong>`
    : done > 0
      ? `${fmt(d.stepsComplete, { done, total })} · <strong>${d.resumeWord}</strong>`
      : `${d.notStarted}`;
  return `<a class="lcard${now}" href="/lesson/${lang}/${n}"><span class="thumb"><img src="${thumbFor(n)}" alt="" loading="lazy">${badgeHtml}</span><span class="lbody"><span class="lnum">${d.lessonWord} ${num}</span><span class="ltitle">${escapeHtml(localizeLessonTitle(ui, title))}</span><span data-prog="${progressKey(lang, n)}" data-total="${total}">${segsHtml(done, total, ui)}<span class="lstatus">${fmt(d.stepsComplete, { done, total })} · ${status}</span></span></span></a>`;
}

function continueCard(
  lang: string,
  info: { name: string; lessons: number },
  locked: boolean,
  subscribed: boolean,
  returnUrl: string,
  progress: Record<string, string[]>,
  ui: UiLang = "en",
): string {
  const d = t(ui);
  const next = nextLesson(lang, progress);
  const num = Number(next.n);
  const completed = progress[progressKey(lang, next.n)] ?? [];
  const photo = `<div class="cont-photo"><img src="${thumbFor(next.n)}" alt=""></div>`;
  if (next.review) {
    return `<section class="cont" aria-label="Continue">${photo}<div class="cont-body"><p class="cont-label">${d.courseComplete} 🎉</p><h2 class="cont-title">${d.lessonWord} ${num} · ${escapeHtml(localizeLessonTitle(ui, next.title))}</h2><p class="cont-ctx">${d.unitWord} ${next.unit} · ${escapeHtml(localizeUnitTitle(ui, next.unitTitle))}</p><a class="btn" href="/lesson/${lang}/${next.n}">${fmt(d.reviewLesson, { n: num })} →</a></div></section>`;
  }
  if (locked) {
    return `<section class="cont" aria-label="Continue">${photo}<div class="cont-body"><p class="cont-label">${d.niceWorkNext}</p><h2 class="cont-title">${d.lessonWord} ${num} · ${escapeHtml(localizeLessonTitle(ui, next.title))}</h2><p class="cont-ctx">${d.finishedFreeUnit} ${fmt(d.premiumOpensLang, { name: info.name, monthly: d.monthlyPrice, yearly: d.yearlyPrice })}</p>${stepsHtml(lang, next.n, [], ui)}<a class="btn" href="/billing?return=${encodeURIComponent(returnUrl)}">${d.unlockEveryLesson} →</a></div></section>`;
  }
  const fresh = next.done === 0;
  const label = subscribed
    ? fresh && next.n === "001"
      ? d.startHere
      : d.keepGoingLabel
    : fresh
      ? d.startHereFree
      : d.continueLabel;
  const manifest = lessons[next.n]?.[lang as Lang];
  const counts = manifest ? ` · ${fmt(d.photosCount, { n: manifest.phrases.length })}, ${fmt(d.stepsShort, { n: manifest.activities.length })}` : "";
  const ctx = `${d.unitWord} ${next.unit} · ${escapeHtml(localizeUnitTitle(ui, next.unitTitle))}${counts}${fresh ? "" : ` · ${fmt(d.stepsComplete, { done: next.done, total: next.total })}`}`;
  return `<section class="cont" aria-label="Continue">${photo}<div class="cont-body"><p class="cont-label">${label}</p><h2 class="cont-title">${d.lessonWord} ${num} · ${escapeHtml(localizeLessonTitle(ui, next.title))}</h2><p class="cont-ctx">${ctx}</p>${stepsHtml(lang, next.n, completed, ui)}<a class="btn" href="/lesson/${lang}/${next.n}" data-continue>${fresh ? fmt(d.startLesson, { n: num }) : fmt(d.resumeLesson, { n: num })} →</a></div></section>`;
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
  const localOnly = {};
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      const m = k && k.match(/^nicelingo:completed:(.+)$/);
      if (!m) continue;
      const local = JSON.parse(localStorage.getItem(k) || "[]");
      localOnly[m[1]] = local;
      merged[m[1]] = Array.from(new Set([...(merged[m[1]] || []), ...local]));
    }
  } catch {}
  const paint = (map) => {
    $$("[data-prog]").forEach((el) => {
      const total = Number(el.dataset.total || "0");
      if (!total) return;
      const done = Math.min(new Set(map[el.dataset.prog] || []).size, total);
      el.querySelectorAll(".segs i").forEach((b, i) => b.classList.toggle("on", i < done));
      el.querySelector(".segs")?.setAttribute("aria-label", (blob.ui?.stepsComplete || "{done} of {total} steps complete").replace("{done}", done).replace("{total}", total));
      const lbl = el.querySelector(".lstatus");
      if (lbl) {
        if (done >= total) lbl.innerHTML = (blob.ui?.stepsComplete || "{done} of {total} steps complete").replace("{done}", done).replace("{total}", total) + " · <strong>" + (blob.ui?.doneWord || "Done") + "</strong>";
        else if (done > 0) lbl.innerHTML = (blob.ui?.stepsComplete || "{done} of {total} steps complete").replace("{done}", done).replace("{total}", total) + " · <strong>" + (blob.ui?.resumeWord || "Resume") + "</strong>";
      }
    });
    $$("[data-cp-locked]").forEach((el) => {
      const [level, unitRaw] = (el.dataset.cpLocked || "").split("/");
      const unit = Number(unitRaw);
      const lessonsInUnit = blob.units?.[unit] ?? [];
      if (!lessonsInUnit.length) return;
      const allDone = lessonsInUnit.every((n) => {
        const key = blob.lang === "en" ? "lesson-" + n : blob.lang + "-lesson-" + n;
        const t = totals[key] || 0;
        return t > 0 && Math.min(new Set(merged[key] || []).size, t) >= t;
      });
      if (!allDone) return;
      const a = document.createElement("a");
      a.className = el.className.replace(" locked", "");
      a.href = "/" + blob.lang + "/checkpoint/" + level + "/" + unit;
      a.innerHTML = el.innerHTML;
      const small = a.querySelector("small");
      if (small && blob.ui?.checkpointIntro) small.textContent = blob.ui.checkpointIntro;
      el.replaceWith(a);
    });
    $$("[data-unitcount]").forEach((el) => {
      const [unit, total] = el.dataset.unitcount.split(":").map(Number);
      let d = 0;
      for (const n of blob.units?.[unit] ?? []) {
        const key = blob.lang === "en" ? "lesson-" + n : blob.lang + "-lesson-" + n;
        const t = totals[key] || 0;
        if (t > 0 && Math.min(new Set(merged[key] || []).size, t) >= t) d++;
      }
      el.textContent = (blob.ui?.lessonsDone || "{done} of {total} lessons done").replace("{done}", d).replace("{total}", total);
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
      const note = document.querySelector("[data-signin-note]");
      if (note) note.hidden = true;
      const r = await fetch("/api/progress/all", { credentials: "include" });
      if (r.ok) {
        const { lessons, days } = await r.json();
        try {
          const local = JSON.parse(localStorage.getItem("nl-days") || "[]");
          const all = new Set([...(days || []), ...(blob.days || []), ...local]);
          const now = new Date();
          const today = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
          const prevDay = (ds) => { const x = new Date(ds + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() - 1); return x.toISOString().slice(0, 10); };
          let cur = 0; let cursor = all.has(today) ? today : prevDay(today);
          while (all.has(cursor)) { cur++; cursor = prevDay(cursor); }
          const chip = document.querySelector("[data-streak]");
          if (chip && cur > 0) { chip.hidden = false; chip.innerHTML = "🔥 <b>" + cur + "</b>"; chip.title = (blob.ui?.dayStreak || "{n}-day streak").replace("{n}", cur); }
        } catch {}
        for (const [k, v] of Object.entries(lessons || {})) {
          merged[k] = Array.from(new Set([...(merged[k] || []), ...v]));
        }
        paint(merged);
        // Heal the server copy: activities completed on this device
        // but never saved server-side (e.g. finished before sign-in)
        // are posted now, so server-gated unlocks (unit checkpoint,
        // level challenge) agree with what the learner sees as done.
        for (const [key, acts] of Object.entries(localOnly)) {
          const have = new Set(lessons?.[key] || []);
          for (const activity of acts) {
            if (have.has(activity)) continue;
            try {
              await fetch("/api/progress", {
                method: "POST", credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ lessonId: key, activity }),
              });
            } catch { /* still usable offline; retried next visit */ }
          }
        }
      }
    }
  } catch { /* page stays usable offline */ }
})();
</script>`;


export function coursePage(lang: string, opts: CourseOpts): string {
  const info = pickerLanguages().find((l) => l.code === lang);
  if (!info) throw new Error(`unknown course language ${lang}`);
  const { progress, registered, paywallDisabled, user } = opts;
  const ui = opts.uiLang ?? "en";
  const d = t(ui);
  const subscribed = opts.subscribed ?? false;
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
      return `<span class="tab-off" aria-disabled="true">${l.level} ${escapeHtml(localizeLevelTitle(ui, l.title))} · ${d.comingSoon}</span>`;
    }
    const cur = l.level === selected ? ` aria-current="page"` : "";
    return `<a class="tab" href="/${lang}?level=${l.level}"${cur}>${l.level} ${escapeHtml(localizeLevelTitle(ui, l.title))} <span class="cnt">${st.done}/${st.total}</span></a>`;
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
            ? lessonCard(lang, n, locked(n), returnUrl, progress, ui)
            : "",
        )
        .join("");
      const strip =
        i === 0 && freshVisitor
          ? `<section class="band" aria-label="Pricing"><div><b>${d.bandTitle}</b><span>${fmt(d.premiumOpens, { monthly: d.monthlyPrice, yearly: d.yearlyPrice })}</span></div><a class="btn btn-prem" href="/billing?return=${encodeURIComponent(returnUrl)}">${d.seePlans}</a></section>`
          : "";
      const tile = tiles[(u.unit - 1) % tiles.length];
      const cpPassed = (opts.milestones ?? []).some(
        (m) => m.kind === "checkpoint" && m.lang === lang && m.unit === u.unit && m.passed,
      );
      const cpUnlocked = st.total > 0 && st.done >= st.total;
      const cpBadge = cpPassed ? "✓" : u.unit;
      const cpCard = cpPassed
        ? `<a class="cp-card done" href="/${lang}/checkpoint/${selected}/${u.unit}"><span class="ubadge" style="--tile:${tile}">✓</span><span class="cp-text"><b>${escapeHtml(d.unitCheckpoint)}</b><small>${escapeHtml(d.checkpointPassedText)}</small></span></a>`
        : cpUnlocked
          ? `<a class="cp-card" href="/${lang}/checkpoint/${selected}/${u.unit}"><span class="ubadge" style="--tile:${tile}">${u.unit}</span><span class="cp-text"><b>${escapeHtml(d.unitCheckpoint)}</b><small>${escapeHtml(d.checkpointIntro)}</small></span></a>`
          : `<div class="cp-card locked" data-cp-locked="${selected}/${u.unit}" aria-disabled="true"><span class="ubadge" style="--tile:${tile}">${u.unit}</span><span class="cp-text"><b>${escapeHtml(d.unitCheckpoint)}</b><small>${escapeHtml(d.checkpointLocked)}</small></span></div>`;
      return `<section class="unit" id="u${u.unit}"${current}><div class="unit-head"><span class="ubadge" style="--tile:${tile}">${cpBadge}</span><h2>${d.unitWord} ${u.unit} · ${escapeHtml(localizeUnitTitle(ui, u.title))}</h2><span class="cnt" data-unitcount="${u.unit}:${st.total}">${fmt(d.lessonsDone, { done: st.done, total: st.total })}</span></div><div class="lgrid">${cards}</div>${cpCard}</section>${strip}`;
    })
    .join("");

  const signinNote = user
    ? ""
    : `<p class="signin-line" data-signin-note>${d.savedOnDevice} <a class="linklike" href="/sign-in">${d.signInToKeep}</a></p>`;

  const totals: Record<string, number> = {};
  for (const u of UNITS) {
    for (const n of u.lessons) {
      const t = activitiesTotal(lang, n);
      if (t > 0) totals[progressKey(lang, n)] = t;
    }
  }
  const units: Record<number, string[]> = {};
  for (const u of UNITS) units[u.unit] = u.lessons;
  const blob = JSON.stringify({ lang, server: progress, totals, units, ui: { stepsComplete: d.stepsComplete, lessonsDone: d.lessonsDone, doneWord: d.doneWord, resumeWord: d.resumeWord, dayStreak: d.dayStreak, checkpointIntro: d.checkpointIntro }, days: opts.streakDays ?? [] });

  const head = `<header class="site-head">${brandHtml()}<span class="head-sp"></span>${streakChipHtml(computeStreak(opts.streakDays ?? [], localDayString()), ui, `/${lang}/progress`)}<span data-account>${accountMenuHtml({ user, subscribed, ui, path: `/${lang}` })}</span></header>`;
  const reviewBtn = (opts.weakCount ?? 0) >= 3
    ? `<p class="review-line"><a class="btn ghost review-btn" href="/${lang}/review">${escapeHtml(fmt(d.practiseMistakes, { n: opts.weakCount ?? 0 }))}</a></p>`
    : "";
  const cpPassedUnits = new Set(
    (opts.milestones ?? [])
      .filter((m) => m.kind === "checkpoint" && m.lang === lang && m.passed)
      .map((m) => m.unit),
  );
  const allCpPassed = levelUnits.length > 0 && levelUnits.every((u) => cpPassedUnits.has(u.unit));
  const chPassed = (opts.milestones ?? []).some(
    (m) => m.kind === "levelChallenge" && m.lang === lang && m.level === selected && m.passed,
  );
  const challengeCard = chPassed
    ? `<a class="cp-card done" href="/${lang}/challenge/${selected}"><span class="ubadge">✓</span><span class="cp-text"><b>${escapeHtml(fmt(d.levelChallenge, { n: selected }))}</b><small>${escapeHtml(d.levelPassedText)}</small></span></a>`
    : allCpPassed
      ? `<a class="cp-card" href="/${lang}/challenge/${selected}"><span class="ubadge">${selected}</span><span class="cp-text"><b>${escapeHtml(fmt(d.levelChallenge, { n: selected }))}</b><small>${escapeHtml(d.checkpointIntro)}</small></span></a>`
      : `<div class="cp-card locked" aria-disabled="true"><span class="ubadge">${selected}</span><span class="cp-text"><b>${escapeHtml(fmt(d.levelChallenge, { n: selected }))}</b><small>${escapeHtml(d.challengeLocked)}</small></span></div>`;
  const levelStarted = levelUnits.some((u) =>
    u.lessons.some((n) => (progress[progressKey(lang, n)] ?? []).length > 0),
  );
  const testOutLine = levelStarted
    ? ""
    : `<p class="testout-line"><a class="linklike" href="/${lang}/challenge/${selected}?mode=testout">${escapeHtml(d.testOutLink)}</a></p>`;
  const body = `${head}${continueCard(lang, info, locked(next.n), subscribed, returnUrl, progress, ui)}${reviewBtn}${signinNote}<nav class="tabs" aria-label="Levels">${tabs}</nav>${testOutLine}${sections}${challengeCard}${siteFooterHtml(ui, `/${lang}`, { registered })}<script type="application/json" id="course-data">${blob.replace(/</g, "\\u003c")}</script>${CLIENT}`;
  return pageShell({ title: `${info.ownName} course · Nicelingo`, lang: ui, origin: opts.origin ?? "", canonicalPath: `/${lang}`, body });
}
