// Shared page shell for the picker and course home: head, brand, footers.
import { analyticsBeacon } from "../lib/analytics";
import { escapeHtml } from "../lib/lesson-progress";
import { UI_LANGS, fmt, t, type UiDict, type UiLang } from "../lib/i18n";
import type { StreakInfo } from "../lib/streaks";

// The parrot mark, inlined from public/logo/parrot-mark.svg (exact bytes,
// plus display size and a test hook). One shared component: a refined
// drawing replaces this const without touching the pages.
export const LOGO_SVG = `<svg data-logo="parrot" width="44" height="44" viewBox="0 0 120 120" role="img" aria-label="Nicelingo"><clipPath id="nl-head"><circle cx="54" cy="62" r="42"/></clipPath><path d="M30 30 C22 14, 34 6, 44 20 Z" fill="#FFE066"/><path d="M40 24 C38 6, 54 4, 56 22 Z" fill="#8CC8FF"/><circle cx="54" cy="62" r="42" fill="#1A5FEB"/><g clip-path="url(#nl-head)"><ellipse cx="44" cy="112" rx="36" ry="26" fill="#FFE066"/></g><path d="M78 62 C88 61, 95 67, 94 77 C89 83, 80 81, 76 73 Z" fill="#C96200"/><path d="M74 36 C100 28, 120 46, 114 70 C112 80, 104 86, 97 82 C102 70, 96 60, 74 60 Z" fill="#FF8A1F"/><circle cx="66" cy="52" r="19" fill="#FFFFFF"/><circle cx="70" cy="51" r="7.5" fill="#0E1B3D"/><circle cx="72.5" cy="48.5" r="2.4" fill="#FFFFFF"/><circle cx="56" cy="78" r="6" fill="#FF9DB5"/></svg>`;

const DESCRIPTION =
  "See it, hear it, say it. Bite-size photo lessons with pronunciation scoring. Unit 1 free.";

export function pageShell(opts: {
  title: string;
  origin: string;
  body: string;
  lang?: string;
  /** Canonical path ("/", "/es", ...): emits canonical + hreflang. */
  canonicalPath?: string;
  /** Private pages (sign-in, account, students): keep out of indexes. */
  noindex?: boolean;
  /** Inline JSON-LD block (already stringified and escaped). */
  jsonLd?: string;
}): string {
  const canon = opts.canonicalPath ? escapeHtml(opts.canonicalPath) : null;
  const canonical = canon
    ? `<link rel="canonical" href="${escapeHtml(opts.origin)}${canon}">`
    : "";
  const hreflang = canon
    ? `<link rel="alternate" hreflang="x-default" href="${escapeHtml(opts.origin)}${canon}">` +
      UI_LANGS.map(
        (l) =>
          `<link rel="alternate" hreflang="${l.code}" href="${escapeHtml(opts.origin)}${canon}?ui=${l.code}">`,
      ).join("")
    : "";
  return `<!DOCTYPE html>
<html lang="${escapeHtml(opts.lang ?? "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${DESCRIPTION}">
${opts.noindex ? `<meta name="robots" content="noindex">` : `${canonical}${hreflang}`}
<meta name="theme-color" content="#1a5feb">
<meta name="monetag" content="ab1fd95d24c765cc004b8d115b8f76a9">
<meta property="og:title" content="${escapeHtml(opts.title)}">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:image" content="${opts.origin}/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHtml(opts.title)}">
<meta name="twitter:description" content="${DESCRIPTION}">
<meta name="twitter:image" content="${opts.origin}/og.png">
${opts.jsonLd ? `<script type="application/ld+json">${opts.jsonLd}</script>` : ""}
<link rel="icon" href="/logo/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/logo/favicon-32.png" sizes="32x32" type="image/png">
<link rel="icon" href="/logo/favicon-16.png" sizes="16x16" type="image/png">
<link rel="apple-touch-icon" href="/logo/apple-touch-icon.png">
<link rel="manifest" href="/manifest.json">
<link rel="stylesheet" href="/app/site.css">
</head>
<body>
<div class="wrap">
${opts.body}
</div>
${analyticsBeacon()}
</body>
</html>`;
}

/** The parrot links home: "/" is the language picker, always, so a
 *  new course is one tap away with no cookie-clearing. */
export function brandHtml(): string {
  return `<a class="brand" href="/" aria-label="Nicelingo home — choose a language">${LOGO_SVG}<b>nicelingo</b></a>`;
}

const ACCOUNT_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-5.5 8-5.5s6.5 1.5 8 5.5"/></svg>`;

/** Account menu for page headers: the account button opens a menu
 *  whose first item is Go Premium (non-subscribers only), followed by
 *  the account/sign-in link and the interface-language picker. Every
 *  item is at least 44px tall with 8px between items (see CSS). */
export function accountMenuHtml(opts: {
  user?: { email: string | null; isAnonymous: boolean | null } | null;
  subscribed: boolean;
  ui: UiLang;
  path: string;
}): string {
  const d = t(opts.ui);
  const sep = opts.path.includes("?") ? "&" : "?";
  const uiItems = UI_LANGS.map(
    (l) =>
      `<a class="acct-item" href="${escapeHtml(opts.path)}${sep}ui=${l.code}"${l.code === opts.ui ? ` aria-current="true"` : ""}><span class="lang-flag" aria-hidden="true">${l.flag}</span>${escapeHtml(l.ownName)}${l.name !== l.ownName ? `<span class="lang-name">${escapeHtml(l.name)}</span>` : ""}</a>`,
  ).join("");
  const premium = opts.subscribed
    ? ""
    : `<a class="acct-item acct-prem" href="/billing">${escapeHtml(d.goPremium)}</a>`;
  const account = opts.user
    ? `<a class="acct-item" href="/account">${escapeHtml(d.account)}</a>`
    : `<a class="acct-item" href="/sign-in">${escapeHtml(d.signIn)}</a>`;
  return `<details class="account-menu"><summary class="acct-btn" aria-label="${escapeHtml(d.account)}">${ACCOUNT_SVG}</summary><div class="acct-menu" role="menu">${premium}${account}<p class="acct-label">${escapeHtml(d.interfaceLanguage)}</p>${uiItems}</div></details>`;
}

/** Daily-streak chip for page headers (🔥 + localized label). Hidden
 *  until the streak is at least 1; the inline client script repaints
 *  it from merged local + server days in the visitor's timezone. */
export function streakChipHtml(streak: StreakInfo, ui: UiLang): string {
  if (streak.current < 1) return `<span class="streak-chip" data-streak hidden></span>`;
  return `<span class="streak-chip" data-streak title="${fmt(t(ui).dayStreak, { n: streak.current })}">🔥 <b>${streak.current}</b></span>`;
}

/** App-language control for the footer: one 44px control showing the
 *  current language's native name + chevron (no flags or codes). The
 *  options are plain ?ui= links with lang attributes and aria-current,
 *  so it works without JavaScript. */
function appLangControl(uiLang: UiLang, path: string): string {
  const d = t(uiLang);
  const cur = UI_LANGS.find((l) => l.code === uiLang) ?? UI_LANGS[0];
  const sep = path.includes("?") ? "&" : "?";
  const items = UI_LANGS.map(
    (l) =>
      `<a class="foot-opt" lang="${l.code}" href="${escapeHtml(path)}${sep}ui=${l.code}"${l.code === uiLang ? ` aria-current="true"` : ""}>${escapeHtml(l.ownName)}</a>`,
  ).join("");
  return `<div class="foot-lang"><p class="foot-label">${escapeHtml(d.appLanguage)}</p><details class="foot-switch"><summary class="foot-current">${escapeHtml(cur.ownName)} ▾</summary><div class="foot-opts" role="menu">${items}</div></details></div>`;
}

function footerLinksHtml(d: UiDict, registered: boolean): string {
  const left = [
    `<a class="foot-link" href="/billing">${escapeHtml(d.premiumBadge)}</a>`,
    ...(registered
      ? []
      : [`<a class="foot-link" href="/register">${escapeHtml(d.freeAccount)}</a>`]),
    `<a class="foot-link" href="/contact">${escapeHtml(d.helpAndContact)}</a>`,
  ].join("");
  const right = (
    [
      [d.terms, "/terms"],
      [d.privacy, "/privacy"],
      [d.refunds, "/refunds"],
      [d.developers, "/developers"],
    ] as [string, string][]
  )
    .map(([label, href]) => `<a class="foot-link" href="${href}">${escapeHtml(label)}</a>`)
    .join("");
  return `<nav class="foot-links"><div class="foot-col">${left}</div><div class="foot-col">${right}</div></nav>`;
}

/** Shared footer for the picker and course home: brand + tagline, the
 *  link grid, one app-language control, and the legal bottom line.
 *  No buttons here — the upgrade band above already covers Premium. */
export function siteFooterHtml(
  uiLang: UiLang = "en",
  path = "/",
  opts: { registered?: boolean } = {},
): string {
  const d = t(uiLang);
  return `<footer class="site-foot"><div class="foot-brand"><span class="foot-mark">${LOGO_SVG}</span><b>nicelingo</b><p class="foot-tag">${escapeHtml(d.heroEyebrow)}</p></div>${footerLinksHtml(d, opts.registered ?? false)}${appLangControl(uiLang, path)}<p class="foot-legal">© 2026 Nicelingo · Payments by Stripe</p></footer>`;
}
