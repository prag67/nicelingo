// Shared page shell for the picker and course home: head, brand, footers.
import { escapeHtml } from "../lib/lesson-progress";

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
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(opts.title)}</title>
<meta name="description" content="${DESCRIPTION}">
<meta name="theme-color" content="#1a5feb">
<meta property="og:title" content="${escapeHtml(opts.title)}">
<meta property="og:description" content="${DESCRIPTION}">
<meta property="og:image" content="${opts.origin}/og.png">
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
</body>
</html>`;
}

export function brandHtml(): string {
  return `<a class="brand" href="/">${LOGO_SVG}<b>nicelingo</b></a>`;
}

/** Terms/Privacy/Contact pages don't exist yet; the brief allows leaving
 *  those links out until they do. */
export function pickerFooterHtml(): string {
  return `<footer class="site-foot"><span class="foot-brand">Nicelingo</span><nav><a href="/billing">Premium</a><a href="/developers">Developers</a></nav></footer>`;
}

export function courseFooterHtml(): string {
  return `<footer class="site-foot"><span class="foot-brand">Nicelingo</span><nav><a href="/billing">Manage subscription</a><a href="/developers">Developers</a></nav></footer>`;
}
