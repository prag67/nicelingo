// "Your progress": the home for streaks and badges, reached by tapping
// the streak chip. Two views of one learner: the master page
// (/progress) shows the global streak plus a summary row per started
// language; each course page (/{lang}/progress) shows that language's
// badges and numbers. The streak itself is master — activity days are
// per user across languages — only badges/counts are per language.
// Rewards follow learning only; free and Premium see the same page.
import { UNITS, lessons } from "../lessons/curriculum";
import { pickerLanguages } from "../lessons/languages";
import {
  countDoneLessons,
  escapeHtml,
  hasStarted,
  isLessonDone,
} from "../lib/lesson-progress";
import { fmt, nextBadgeText, t, type UiLang } from "../lib/i18n";
import { computeStreak, localDayString, type StreakInfo } from "../lib/streaks";
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

function streakHeroHtml(streak: StreakInfo, daySet: Set<string>, ui: UiLang): string {
  const d = t(ui);
  const today = localDayString();
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
  return `<section class="streak-hero" aria-label="${escapeHtml(fmt(d.dayStreak, { n: streak.current }))}">
<div class="flame" aria-hidden="true">🔥</div>
<p class="streak-num">${escapeHtml(fmt(d.dayStreak, { n: streak.current }))}</p>
<div class="week-strip" role="img" aria-label="${escapeHtml(fmt(d.dayStreak, { n: streak.current }))}">${strip}</div>
<p class="hero-line">${escapeHtml(heroLine)}</p>
</section>`;
}

function badgeSectionHtml(unitsDone: number, ui: UiLang): string {
  const d = t(ui);
  const { next } = badgeFor(unitsDone);
  const nextHtml = next
    ? `<p class="badge-next-line">${nextBadgeText(ui, unitsDone, next.units)}</p>`
    : "";
  const grid = UNIT_BADGE_TIERS.map((tier) => {
    const earned = unitsDone >= tier.units;
    return earned
      ? `<div class="badge-card earned"><span class="badge-icon">${tier.icon}</span><b>${fmt(d.unitsDone, { n: tier.units })}</b></div>`
      : `<div class="badge-card locked"><span class="badge-icon">${tier.icon}</span><span>${fmt(tier.units === 1 ? d.badgeHowToOne : d.badgeHowTo, { n: tier.units })}</span></div>`;
  }).join("");
  return `<section class="badge-section" aria-label="${escapeHtml(d.badgesTitle)}">
<h2>${escapeHtml(d.badgesTitle)}</h2>
${nextHtml}
<div class="badge-grid">${grid}</div>
</section>`;
}

function numbersHtml(items: { value: number; label: string }[]): string {
  return `<section class="numbers">${items
    .map(
      (i) =>
        `<div class="num-card"><b>${i.value}</b><span>${escapeHtml(i.label)}</span></div>`,
    )
    .join("")}</section>`;
}

function labelOf(template: string, n: number): string {
  return fmt(template, { n }).replace(String(n), "").trim();
}

function streakNoteHtml(user: CourseUser, streak: StreakInfo, ui: UiLang): string {
  const d = t(ui);
  if (user?.isAnonymous && streak.current >= 1) {
    return `<p class="signin-line">${fmt(d.signInStreak, { n: streak.current })} <a class="linklike" href="/register">${escapeHtml(d.signInToKeep)}</a></p>`;
  }
  if (!user) {
    return `<p class="signin-line">${escapeHtml(d.savedOnDevice)} <a class="linklike" href="/sign-in">${escapeHtml(d.signInToKeep)}</a></p>`;
  }
  return "";
}

function headHtml(path: string, streak: StreakInfo, opts: ProgressOpts, ui: UiLang): string {
  return `<header class="site-head">${brandHtml()}<span class="head-sp"></span>${streakChipHtml(streak, ui, path)}<span data-account>${accountMenuHtml({ user: opts.user, subscribed: opts.subscribed ?? false, ui, path })}</span></header>`;
}

export function progressPage(lang: string, opts: ProgressOpts): string {
  const info = pickerLanguages().find((l) => l.code === lang);
  if (!info) throw new Error(`unknown course language ${lang}`);
  const ui = opts.uiLang ?? "en";
  const d = t(ui);
  const { progress } = opts;
  const streak = computeStreak(opts.streakDays ?? [], localDayString());
  const unitsDone = completedUnits(lang, progress);
  const lessonsDone = countDoneLessons(lang, progress);
  const phrases = phrasesLearned(lang, progress);

  const body = `${headHtml(`/${lang}/progress`, streak, opts, ui)}
<main class="progress-main">
<p class="back-line"><a class="linklike" href="/${lang}">← ${escapeHtml(d.backToCourse)}</a></p>
<h1>${escapeHtml(d.progressTitle)}</h1>
${streakHeroHtml(streak, new Set(opts.streakDays ?? []), ui)}
${streakNoteHtml(opts.user, streak, ui)}
${numbersHtml([
  { value: lessonsDone, label: labelOf(d.lessonsCount, lessonsDone) },
  { value: phrases, label: labelOf(d.phrasesLearned, phrases) },
  { value: unitsDone, label: labelOf(d.unitsDone, unitsDone) },
])}
${badgeSectionHtml(unitsDone, ui)}
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

/** Master progress (/progress): the same global streak, one summary
 *  row per started language, cross-language totals and badge grid. */
export function masterProgressPage(opts: ProgressOpts): string {
  const ui = opts.uiLang ?? "en";
  const d = t(ui);
  const { progress } = opts;
  const streak = computeStreak(opts.streakDays ?? [], localDayString());

  const langs = pickerLanguages().filter((l) => hasStarted(l.code, progress));
  let totalLessons = 0;
  let totalPhrases = 0;
  let totalUnits = 0;
  const rows = langs
    .map((l) => {
      const lessonsDone = countDoneLessons(l.code, progress);
      const phrases = phrasesLearned(l.code, progress);
      const unitsDone = completedUnits(l.code, progress);
      totalLessons += lessonsDone;
      totalPhrases += phrases;
      totalUnits += unitsDone;
      return `<div class="lang-row"><div class="lang-row-head"><b lang="${l.code}">${escapeHtml(l.ownName)}</b><a class="linklike" href="/${l.code}/progress">${escapeHtml(d.viewProgress)}</a></div><p class="lang-row-nums">${escapeHtml(fmt(d.lessonsCount, { n: lessonsDone }))} · ${escapeHtml(fmt(d.unitsDone, { n: unitsDone }))} · ${escapeHtml(fmt(d.phrasesLearned, { n: phrases }))}</p><a class="linklike" href="/${l.code}">${escapeHtml(d.backToCourse)}</a></div>`;
    })
    .join("");
  const langsSection = langs.length
    ? `<section class="langs-section" aria-label="${escapeHtml(d.languagesTitle)}"><h2>${escapeHtml(d.languagesTitle)}</h2>${rows}</section>`
    : `<p class="signin-line"><a class="linklike" href="/">${escapeHtml(d.pickLanguage)}</a></p>`;

  const body = `${headHtml("/progress", streak, opts, ui)}
<main class="progress-main">
<h1>${escapeHtml(d.progressTitle)}</h1>
${streakHeroHtml(streak, new Set(opts.streakDays ?? []), ui)}
${streakNoteHtml(opts.user, streak, ui)}
${numbersHtml([
  { value: totalLessons, label: labelOf(d.lessonsCount, totalLessons) },
  { value: totalPhrases, label: labelOf(d.phrasesLearned, totalPhrases) },
  { value: totalUnits, label: labelOf(d.unitsDone, totalUnits) },
])}
${langsSection}
${badgeSectionHtml(totalUnits, ui)}
</main>
${siteFooterHtml(ui, "/", { registered: opts.registered })}`;
  return pageShell({
    title: `${d.progressTitle} · Nicelingo`,
    lang: ui,
    origin: opts.origin ?? "",
    noindex: true,
    body,
  });
}
