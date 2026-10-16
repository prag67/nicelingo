// Legal pages: Terms, Privacy, Refunds, Contact. Linked from every
// footer. Short, plain-language, authoritative in English; headings
// localize through the UI dictionary like the Developers page.
import { analyticsBeacon } from "../lib/analytics";
import { escapeHtml } from "../lib/lesson-progress";
import { LOGO_SVG } from "./shell";
import { t, type UiLang } from "../lib/i18n";

export const SUPPORT_EMAIL = "support@nicelingo.com";

const STYLE = `body{font-family:system-ui,sans-serif;max-width:40rem;margin:0 auto;padding:0 1rem 3rem;line-height:1.6;color:#0e1b3d;background:#eef6ff}
header.site{padding:1rem 0}
header.site a{display:inline-flex;align-items:center;gap:.5rem;text-decoration:none;color:#0e1b3d;font-weight:800}
header.site svg{width:32px;height:32px}
a{color:#1247b8}
h1{font-size:1.6rem;line-height:1.25}
p.small{color:#4c5873;font-size:.92rem}`;

function shell(title: string, heading: string, inner: string, uiLang: UiLang): string {
  return `<!DOCTYPE html>
<html lang="${uiLang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} · Nicelingo</title>
<meta name="theme-color" content="#1a5feb">
<link rel="icon" href="/logo/favicon.svg" type="image/svg+xml">
<style>${STYLE}</style>
</head>
<body>
<header class="site"><a href="/" aria-label="Nicelingo home">${LOGO_SVG}<span>nicelingo</span></a></header>
<main>
<h1>${escapeHtml(heading)}</h1>
${inner}
<p><a href="/">← Nicelingo</a></p>
</main>
${analyticsBeacon()}
</body>
</html>`;
}

export function termsPage(uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  return shell(d.terms, d.terms, `<p>Nicelingo teaches languages through short photo lessons with pronunciation scoring. Unit 1 (lessons 1–4) is free in every language; lessons from lesson 5 up need an active Nicelingo Premium subscription ($3/month or $29/year).</p>
<p>A free account saves your progress across devices. You are responsible for keeping your sign-in details safe.</p>
<p>Lesson content, audio, and images belong to Nicelingo. Learn with them as much as you like, but do not copy or redistribute them.</p>
<p>We may change these terms as the service grows; the version on this page always applies.</p>`, uiLang);
}

export function privacyPage(uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  return shell(d.privacy, d.privacy, `<p>We collect the minimum needed to run the service: your account email, your lesson progress and subscription status, and aggregate-only usage counts (for example, how many score attempts got each verdict). We never store visitor identifiers, IP addresses, raw user agents, your audio, or your transcripts.</p>
<p>Payments are handled by Stripe; we see your subscription status, never your card details. Sign-in is handled by our authentication provider with cookies that keep you signed in and remember your language choices.</p>
<p>To export or delete your data, write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>`, uiLang);
}

export function refundsPage(uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  return shell(d.refunds, d.refunds, `<p>Monthly ($3) and yearly ($29) Premium subscriptions can be cancelled anytime from your receipt or your account page. You keep Premium until the end of the period you already paid for.</p>
<p>One-time PromptPay passes (30 or 365 days) are non-refundable once granted.</p>
<p>Charged by mistake or something looks wrong? Write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and we will sort it out.</p>`, uiLang);
}

export function contactPage(uiLang: UiLang = "en"): string {
  const d = t(uiLang);
  return shell(d.contact, d.helpAndContact, `<p>Questions, billing help, or a bug to report? Write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> and tell us what happened, which language you are learning, and what you were doing when it happened.</p>`, uiLang);
}
