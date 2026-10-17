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
  milestones?: import("../lib/attempts").Milestone[];
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

/** Share-to-social block: the message is built from real numbers
 *  (phrases learned, streak). Intent links work without JS; a small
 *  inline script adds the native share sheet where available. */
function shareSectionHtml(args: {
  ui: UiLang;
  streak: StreakInfo;
  phrases: number;
  langName?: string;
  url: string;
}): string {
  const d = t(args.ui);
  const text =
    args.streak.current >= 1
      ? args.langName
        ? fmt(d.shareMsg, { phrases: args.phrases, lang: args.langName, streak: args.streak.current })
        : fmt(d.shareMsgMaster, { phrases: args.phrases, streak: args.streak.current })
      : args.langName
        ? fmt(d.shareMsgCalm, { phrases: args.phrases, lang: args.langName })
        : fmt(d.shareMsgMasterCalm, { phrases: args.phrases });
  const encText = encodeURIComponent(text);
  const encUrl = encodeURIComponent(args.url);
  const full = encodeURIComponent(`${text} ${args.url}`);
  return `<section class="share-section" aria-label="${escapeHtml(d.shareProgress)}">
<h2>${escapeHtml(d.shareProgress)}</h2>
<div class="share-row">
<button class="share-btn share-native" type="button" hidden>Share…</button>
<button class="share-btn share-copy" type="button">${escapeHtml(d.copyLink)}</button>
<a class="share-btn" href="https://twitter.com/intent/tweet?text=${encText}&url=${encUrl}" target="_blank" rel="noopener">X</a>
<a class="share-btn" href="https://wa.me/?text=${full}" target="_blank" rel="noopener">WhatsApp</a>
<a class="share-btn" href="https://line.me/R/msg/text/?${full}" target="_blank" rel="noopener">LINE</a>
<a class="share-btn" href="https://t.me/share/url?url=${encUrl}&text=${encText}" target="_blank" rel="noopener">Telegram</a>
<a class="share-btn" href="https://www.facebook.com/sharer/sharer.php?u=${encUrl}&quote=${encText}" target="_blank" rel="noopener">Facebook</a>
</div>
<script>
(function () {
  var url = ${JSON.stringify(args.url)};
  var btn = document.querySelector(".share-native");
  if (btn && navigator.share) {
    btn.hidden = false;
    btn.addEventListener("click", function () {
      navigator.share({ title: "Nicelingo", text: ${JSON.stringify(text)}, url: url }).catch(function () {});
    });
  }
  var copy = document.querySelector(".share-copy");
  if (copy) {
    copy.addEventListener("click", function () {
      function done() {
        var old = copy.textContent;
        copy.textContent = ${JSON.stringify(d.copied)};
        setTimeout(function () { copy.textContent = old; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(done);
      } else {
        var ta = document.createElement("textarea");
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (e) {}
        ta.remove();
        done();
      }
    });
  }
})();
</script>
</section>`;
}

// Dedicated per-word photos (content repo:
// public/static/lesson-001/images/words/{slug}.jpg, served from R2 as
// images/001/words/{slug}.jpg). Keyed by the word's English gloss,
// normalised to its root concept, so every course language shares
// the same purpose-made photo instead of reusing a phrase photo
// (the "man" card no longer shows a man eating). Verb tenses share
// one action photo per root; professions have their own portraits,
// distinct from the matching verb action (cook vs cooking).
const WORD_PHOTO: Record<string, string> = {
  man: "man", woman: "woman", boy: "boy", girl: "girl",
  dog: "dog", cat: "cat", bird: "bird", horse: "horse",
  bunny: "bunny", rabbit: "rabbit", puppy: "puppy", kitten: "kitten",
  chick: "chick", brother: "brother", sister: "sister",
  mother: "mother", father: "father", grandfather: "grandfather",
  grandmother: "grandmother", cousin: "cousin", uncle: "uncle",
  baker: "baker", cleaner: "cleaner", cyclist: "cyclist",
  dancer: "dancer", doctor: "doctor", driver: "driver",
  drummer: "drummer", farmer: "farmer", guitarist: "guitarist",
  player: "player", runner: "runner", singer: "singer",
  swimmer: "swimmer", teacher: "teacher", waiter: "waiter",
  eat: "eat", eating: "eat", ate: "eat",
  drink: "drink", drinking: "drink", drank: "drink",
  read: "read", reading: "read",
  write: "write", writing: "write",
  run: "run", running: "run", ran: "run",
  walk: "walk", walking: "walk", walked: "walk",
  sleep: "sleep", sleeping: "sleep", slept: "sleep",
  cook: "cooking", cooking: "cooking", cooked: "cooking",
  dance: "dance", dancing: "dance", danced: "dance",
  sing: "sing", singing: "sing", sang: "sing",
  play: "play", playing: "play", played: "play",
  talk: "talk", talking: "talk", talked: "talk",
  listen: "listen", listening: "listen", listened: "listen",
  laugh: "laugh", laughing: "laugh", laughed: "laugh",
  cry: "cry", crying: "cry", cried: "cry",
  smile: "smile", smiling: "smile", smiled: "smile",
  jump: "jump", jumping: "jump", jumped: "jump",
  swim: "swim", swimming: "swim", swam: "swim",
  draw: "draw", drawing: "draw", drew: "draw",
  shop: "shop", shopping: "shop", shopped: "shop",
  work: "work", working: "work", worked: "work",
  clap: "clap", clapping: "clap", clapped: "clap",
  hide: "hide", hiding: "hide", hid: "hide",
  diving: "dive", waving: "wave",
};

export function wordPhotoUrl(gloss: string, nounSlug?: string): string | undefined {
  if (nounSlug) return `/static/lesson-001/images/words/${nounSlug}.jpg`;
  const g = gloss
    .toLowerCase()
    .replace(/^(the|a|an) /, "")
    .replace(/^(will be|will|would|was|were) /, "");
  const slug = WORD_PHOTO[g];
  return slug ? `/static/lesson-001/images/words/${slug}.jpg` : undefined;
}

/** Words-you-know gallery: every phrase from finished lessons, with
 *  its photo and tappable word chips that replay the word (slice or
 *  own recording) and announce its meaning. */
function wordsGalleryHtml(lang: string, progress: Record<string, string[]>, ui: UiLang): string {
  const d = t(ui);
  // Individual words from finished lessons (not sentences): one
  // card per distinct word, with the photo of the first phrase it
  // appeared in and its own recording on tap.
  const seen = new Set<string>();
  const cards: string[] = [];
  for (const u of UNITS) {
    for (const n of u.lessons) {
      if (!isLessonDone(lang, n, progress)) continue;
      const manifest = lessons[n]?.[lang as keyof (typeof lessons)[string]];
      if (!manifest) continue;
      for (const p of manifest.phrases) {
        // The gallery lists single vocabulary words (man, woman,
        // eating, drinking), never articles or helper words. A
        // joined article+noun word contributes just its noun, whose
        // standalone recording already exists.
        const galleryWords = (p.words ?? []).flatMap((w) => {
          const FUNCTION_GLOSS = new Set([
            "is", "are", "was", "were", "will", "will be", "wants to",
            "likes to", "is (doing)", "the", "a", "an",
            "likes", "wants", "to", "would", "has", "is it", "that",
            "likes listening",
          ]);
          if (/^(the|a|an) /i.test(w.gloss) && w.text.includes(" ")) {
            const nounText = w.text.split(" ").slice(1).join(" ");
            const slug = nounText
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "");
            const nounGloss = w.gloss.replace(/^(the|a|an) /i, "");
            return [{
              text: nounText,
              chars: undefined as string | undefined,
              gloss: nounGloss,
              photo: wordPhotoUrl(nounGloss, nounGloss.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
              audioUrl: `/static/lesson-001/audio/${lang}/words/${slug}.mp3?v=5`,
            }];
          }
          if (FUNCTION_GLOSS.has(w.gloss.toLowerCase())) return [];
          if (/^(the|a|an|el|la|der|die|das|le|les)$/i.test(w.text)) return [];
          return [{ text: w.text, chars: w.chars, gloss: w.gloss, photo: wordPhotoUrl(w.gloss), audioUrl: w.audioUrl }];
        });
        if (!p.words?.length) {
          // No word data (public stand-in curriculum): fall back to
          // a phrase card so the gallery still shows finished work.
          cards.push(
            `<button class="word-card" type="button" data-audio="${escapeHtml(p.audioUrl)}" aria-label="${escapeHtml(p.text)}"><img src="${escapeHtml(p.imageUrl)}" alt="" loading="lazy"><span class="word-main">${escapeHtml(p.text)}</span></button>`,
          );
          continue;
        }
        for (const w of galleryWords) {
          const display = w.chars ?? w.text;
          const key = `${display.toLowerCase()}|${w.gloss.toLowerCase()}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const sub = w.chars ? `<span class="word-sub">${escapeHtml(w.text)}</span>` : "";
          cards.push(
            `<button class="word-card" type="button" data-audio="${escapeHtml(w.audioUrl ?? p.audioUrl)}" aria-label="${escapeHtml(`${display} — ${w.gloss}`)}"><img src="${escapeHtml(w.photo ?? p.imageUrl)}" alt="" loading="lazy"><span class="word-main">${escapeHtml(display)}</span>${sub}<span class="word-gloss">${escapeHtml(w.gloss)}</span></button>`,
          );
        }
      }
    }
  }
  if (!cards.length) return "";
  return `<section class="words-section" aria-label="${escapeHtml(d.wordsYouKnow)}">
<h2>${escapeHtml(d.wordsYouKnow)}</h2>
<div class="word-grid">${cards.join("")}</div>
<script>
(function () {
  var audio = null;
  document.querySelectorAll(".word-card").forEach(function (card) {
    card.addEventListener("click", function () {
      if (audio) audio.pause();
      audio = new Audio(card.dataset.audio);
      document.querySelectorAll(".word-card.playing").forEach(function (c) { c.classList.remove("playing"); });
      card.classList.add("playing");
      audio.play().catch(function () {});
      audio.onended = function () { card.classList.remove("playing"); };
    });
  });
})();
</script>
</section>`;
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
<p class="progress-lang"><b lang="${lang}">${escapeHtml(info.ownName)}</b>${info.name && info.name !== info.ownName ? ` · <span>${escapeHtml(info.name)}</span>` : ""}</p>
${streakHeroHtml(streak, new Set(opts.streakDays ?? []), ui)}
${streakNoteHtml(opts.user, streak, ui)}
${numbersHtml([
  { value: lessonsDone, label: labelOf(d.lessonsCount, lessonsDone) },
  { value: phrases, label: labelOf(d.phrasesLearned, phrases) },
  { value: unitsDone, label: labelOf(d.unitsDone, unitsDone) },
])}
${shareSectionHtml({ ui, streak, phrases, langName: info.ownName, url: `${opts.origin ?? ""}/${lang}` })}
${badgeSectionHtml(unitsDone, ui)}
${(() => {
  // One badge per unit: retakes (and a later test-out of the same
  // level) can leave several passed rows for the same unit.
  const byUnit = new Map<number, import("../lib/attempts").Milestone>();
  for (const m of opts.milestones ?? []) {
    if (m.kind !== "checkpoint" || m.lang !== lang || !m.passed || m.unit == null) continue;
    const key = m.unit;
    const prev = byUnit.get(key);
    if (!prev || (m.viaTestOut && !prev.viaTestOut)) byUnit.set(key, m);
  }
  const passed = [...byUnit.values()].sort((a, b) => (a.unit ?? 0) - (b.unit ?? 0));
  return passed.length
    ? `<section class="badge-section" aria-label="${escapeHtml(d.unitCheckpoint)}"><h2>${escapeHtml(d.unitCheckpoint)}</h2><div class="badge-grid">${passed
        .map(
          (m) =>
            `<div class="badge-card earned"><span class="badge-icon">✓</span><b>${escapeHtml(`${d.unitWord ?? "Unit"} ${m.unit}`)}</b><span>${escapeHtml(d.checkpointPassedText)}${m.viaTestOut ? ` · ${escapeHtml(d.testedOut)}` : ""}</span></div>`,
        )
        .join("")}</div></section>`
    : "";
})()}
${wordsGalleryHtml(lang, progress, ui)}
</main>
${siteFooterHtml(ui, `/${lang}`, { registered: opts.registered })}`;
  return pageShell({
    title: `${d.progressTitle} · ${info.ownName} · Nicelingo`,
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
${shareSectionHtml({ ui, streak, phrases: totalPhrases, url: `${opts.origin ?? ""}/` })}
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
