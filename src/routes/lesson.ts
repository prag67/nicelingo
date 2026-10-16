import { analyticsBeacon } from "../lib/analytics";

export function lessonPage(lang = "en"): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#1a5feb">
<meta name="monetag" content="ab1fd95d24c765cc004b8d115b8f76a9">
<title>Lesson 1 · Nicelingo</title>
<link rel="stylesheet" href="/app/lesson.css">
<link rel="icon" href="/logo/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/logo/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="/logo/apple-touch-icon.png">
</head>
<body>
<noscript><p style="font-family:sans-serif;text-align:center;padding:3rem 1rem">Nicelingo lessons need JavaScript to play sounds and hear you speak.</p></noscript>
<main id="app" aria-live="polite" tabindex="-1"></main>
${analyticsBeacon()}
<script type="module" src="/app/player.js"></script>
</body>
</html>`;
}
