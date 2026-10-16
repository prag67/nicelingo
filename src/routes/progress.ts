// "Your progress" (/{lang}/progress): the home for streaks and badges,
// reached by tapping the streak chip. Slice one: streak hero with a
// 7-day strip, the unit-badge grid (earned in colour, locked grey with
// how-to-earn text), and honest numbers derived from lesson progress —
// lessons finished and phrases in finished lessons. Rewards follow
// learning only; the page is the same for free and Premium learners.
import { UNITS, lessons } from "../lessons/curriculum";
import { pickerLanguages } from "../lessons/languages";
import {
  countDoneLessons,
  escapeHtml,
  isLessonDone,
} from "../lib/lesson-progress";
import { fmt, nextBadgeText, t, type UiLang } from "../lib/i18n";
import { computeStreak, localDayString } from "../lib/streaks";
import { UNIT_BADGE_TIERS, badgeFor, completedUnits } from "../lib/badges";
import {
  accountMenuHtml,
  brandHtml,
  pageShell,
  siteFooterHtml,
  streakChipHtml,
} from "./shell";
import type { CourseUser } from "./course";

export type ProgressOpts = {
  progress: Record<string, string[]>;
  registered: boolean;
  subscribed?: boolean;
  uiLang?: UiLang;
  streakDays?: string[];
  user: CourseUser;
  origin?: string;
};

const WEEKDAY_INITIALS: Record<UiLang, string[]> = {
  // Sunday-first, matching Date.getUTCDay().
  en: ["S", "M", "T", "W", "T", "F", "S"],
  es: ["D", "L", "M", "M", "J", "V", "S"],
  de: ["S", "M", "D", "M", "D", "F", "S"],
  fr: ["D", "L", "M", "M", "J", "V", "S"],
  th: ["\u0e2d\u0e32", "\u0e08", "\u0e2d", "\u0e1e", "\u0e1e\u0e24", "\u0e28", "\u0e2a"],
  zh: ["\u65e5", "\u4e00", "\u4e8c", "\u4e09", "\u56db", "\u4e94", "\u516d"],
};

function last7Days(today: string): string[] {
  const out: string[] = [];
  const d = new Date(`${today}T12:00:00Z`);
  for (let i = 6; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function phrasesLearned(lang: string, progress: Record<string, string[]>): number {
  let total = 0;
  for (const u of UNITS) {
    for (const n of u.lessons) {
      if (!isLessonDone(lang, n, progress)) continue;
      total += lessons[n]?.[lang as keyof (typeof lessons)[string]]?.phrases.length ?? 0;
    }
  }
  return total;
}

export function progressPage(lang: string, opts: ProgressOpts): string {
  const info = pickerLanguages().find((l) => l.code === lang);
  if (!info) throw new Error(`unknown course language ${lang}`);
  const ui = opts.uiLang ?? "en";
  const d = t(ui);
  const { progress, user } = opts;
  const today = localDayString();
  const streak = computeStreak(opts.streakDays ?? [], today);
  const daySet = new Set(opts.streakDays ?? []);
  const initials = WEEKDAY_INITIALS[ui] ?? WEEKDAY_INITIALS.en;
  const strip = last7Days(today)
    .map((day) => {
      const wd = initials[new Date(`${day}T12:00:00Z`).getUTCDay()];
      const cls = daySet.has(day) ? "dot on" : "dot";
      const todayCls = day === today ? " today" : "";
      return `<span class="day${todayCls}"><i class="${cls}"></i><small>${escapeHtml(wd)}</small></span>`;
    })
    .join("");
  const heroLine =
    streak.current < 1
      ? d.streakStartLine
      : streak.activeToday
        ? d.streakDoneLine
        : d.streakKeepLine;

  const unitsDone = completedUnits(lang, progress);
  const { next } = badgeFor(unitsDone);
  const nextHtml = next
    ? `<p class="badge-next-line">${nextBadgeText(ui, unitsDone, next.units)}</p>`
    : "";
  const grid = UNIT_BADGE_TIERS.map((tier) => {
    const earned = unitsDone >= tier.units;
    return earned
      ? `<div class="badge-card earned"><span class="badge-icon">${tier.icon}</span><b>${fmt(d.unitsDone, { n: tier.units })}</b></div>`
      : `<div class="badge-card locked"><span class="badge-icon">${tier.icon}</span><span>${fmt(d.badgeHowTo, { n: tier.units })}</span></div>`;
  }).join("");

  const lessonsDone = countDoneLessons(lang, progress);
  const phrases = phrasesLearned(lang, progress);

  const streakNote =
    user?.isAnonymous && streak.current >= 1
      ? `<p class="signin-line">${fmt(d.signInStreak, { n: streak.current })} <a class="linklike" href="/register">${escapeHtml(d.signInToKeep)}</a></p>`
      : !user
        ? `<p class="signin-line">${escapeHtml(d.savedOnDevice)} <a class="linklike" href="/sign-in">${escapeHtml(d.signInToKeep)}</a></p>`
        : "";

  const head = `<header class="site-head">${brandHtml()}<span class="head-sp"></span>${streakChipHtml(streak, ui, `/${lang}/progress`)}<span data-account>${accountMenuHtml({ user, subscribed: opts.subscribed ?? false, ui, path: `/${lang}/progress` })}</span></header>`;
  const body = `${head}
<main class="progress-main">
<p class="back-line"><a class="linklike" href="/${lang}">← ${escapeHtml(d.backToCourse)}</a></p>
<h1>${escapeHtml(d.progressTitle)}</h1>
<section class="streak-hero" aria-label="${escapeHtml(fmt(d.dayStreak, { n: streak.current }))}">
<div class="flame" aria-hidden="true">🔥</div>
<p class="streak-num">${escapeHtml(fmt(d.dayStreak, { n: streak.current }))}</p>
<div class="week-strip" role="img" aria-label="${escapeHtml(fmt(d.dayStreak, { n: streak.current }))}">${strip}</div>
<p class="hero-line">${escapeHtml(heroLine)}</p>
</section>
${streakNote}
<section class="numbers" aria-label="${escapeHtml(d.progressTitle)}">
<div class="num-card"><b>${lessonsDone}</b><span>${escapeHtml(fmt(d.lessonsCount, { n: lessonsDone }).replace(String(lessonsDone), "").trim())}</span></div>
<div class="num-card"><b>${phrases}</b><span>${escapeHtml(fmt(d.phrasesLearned, { n: phrases }).replace(String(phrases), "").trim())}</span></div>
<div class="num-card"><b>${unitsDone}</b><span>${escapeHtml(fmt(d.unitsDone, { n: unitsDone }).replace(String(unitsDone), "").trim())}</span></div>
</section>
<section class="badge-section" aria-label="${escapeHtml(d.badgesTitle)}">
<h2>${escapeHtml(d.badgesTitle)}</h2>
${nextHtml}
<div class="badge-grid">${grid}</div>
</section>
</main>
${siteFooterHtml(ui, `/${lang}`, { registered: opts.registered })}`;
  return pageShell({
    title: `${d.progressTitle} · Nicelingo`,
    lang: ui,
    origin: opts.origin ?? "",
    noindex: true,
    body,
  });
}
