// Unlisted Spanish voice-preview page: not linked anywhere, not in the
// sitemap, and served with noindex so search engines stay away. It
// exists only so a human can listen to candidate voices before one is
// rolled out as a lesson voice. Samples live in R2 under
// voice-preview/es/<voice>/<file>.mp3 and are served through the
// /voice-preview/audio route in src/index.ts.
import { escapeHtml } from "../lib/lesson-progress";
import { LOGO_SVG } from "./shell";

export interface PreviewSample {
  file: string;
  text: string;
  en: string;
}

export interface PreviewVoice {
  id: string;
  name: string;
  kind: "current" | "candidate";
  detail: string;
}

export const PREVIEW_SAMPLES: PreviewSample[] = [
  { file: "man-eating", text: "El hombre está comiendo.", en: "The man is eating." },
  { file: "woman-drinking", text: "La mujer está bebiendo.", en: "The woman is drinking." },
  { file: "dog-running", text: "El perro está corriendo.", en: "The dog is running." },
  { file: "cat-hiding", text: "El gato está escondiendo.", en: "The cat is hiding." },
];

export const PREVIEW_VOICES: PreviewVoice[] = [
  { id: "aquila", name: "Aquila", kind: "current", detail: "Current default voice · masculine · Latin American · expressive, casual" },
  { id: "alvaro", name: "Álvaro", kind: "candidate", detail: "Being replaced · masculine · Spain · calm, professional" },
  { id: "selena", name: "Selena", kind: "candidate", detail: "Feminine · Latin American · young adult · friendly, calm" },
  { id: "celeste", name: "Celeste", kind: "current", detail: "Feminine · Colombian · young adult · clear, energetic" },
  { id: "estrella", name: "Estrella", kind: "candidate", detail: "Feminine · Mexican · mature · natural, calm" },
  { id: "diana", name: "Diana", kind: "current", detail: "Feminine · Spain · adult · expressive, confident" },
  { id: "carina", name: "Carina", kind: "candidate", detail: "Feminine · Spain · adult · professional, energetic" },
];

export function isPreviewVoice(id: string): boolean {
  return PREVIEW_VOICES.some((v) => v.id === id);
}

export function isPreviewSample(file: string): boolean {
  return PREVIEW_SAMPLES.some((s) => `${s.file}.mp3` === file);
}

const STYLE = `body{font-family:system-ui,sans-serif;max-width:44rem;margin:0 auto;padding:0 1rem 3rem;line-height:1.6;color:#0e1b3d;background:#eef6ff}
header.site{padding:1rem 0}
header.site a{display:inline-flex;align-items:center;gap:.5rem;text-decoration:none;color:#0e1b3d;font-weight:800}
header.site svg{width:32px;height:32px}
h1{font-size:1.6rem;line-height:1.25}
p.small{color:#4c5873;font-size:.92rem}
section.voice{background:#fff;border:2px solid #d3e2f5;border-radius:16px;padding:1rem 1.25rem;margin:1rem 0}
section.voice h2{margin:.2rem 0;font-size:1.25rem}
.tag{display:inline-block;font-size:.78rem;font-weight:700;letter-spacing:.02em;border-radius:999px;padding:.15rem .6rem;margin-bottom:.35rem}
.tag.current{background:#eef2ff;color:#4c5873}
.tag.candidate{background:#1247b8;color:#fff}
.sample{display:flex;align-items:center;gap:.75rem;padding:.45rem 0;border-top:1px solid #eef2ff;flex-wrap:wrap}
.sample p{margin:0;flex:1 1 12rem}
.sample .en{color:#4c5873;font-size:.9rem}
audio{height:44px;max-width:100%}`;

export function voicePreviewPage(): string {
  const sections = PREVIEW_VOICES.map((v) => {
    const samples = PREVIEW_SAMPLES.map(
      (s) => `<div class="sample"><p><span lang="es">${escapeHtml(s.text)}</span><br><span class="en">${escapeHtml(s.en)}</span></p><audio controls preload="none" src="/voice-preview/audio/${v.id}/${s.file}.mp3"></audio></div>`,
    ).join("\n");
    return `<section class="voice"><span class="tag ${v.kind}">${v.kind === "current" ? "Chosen voice" : "Not chosen"}</span><h2>${escapeHtml(v.name)}</h2><p class="small">${escapeHtml(v.detail)}</p>${samples}</section>`;
  }).join("\n");
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Spanish voice preview · Nicelingo</title>
<meta name="theme-color" content="#1a5feb">
<link rel="icon" href="/logo/favicon.svg" type="image/svg+xml">
<style>${STYLE}</style>
</head>
<body>
<header class="site"><a href="/" aria-label="Nicelingo home">${LOGO_SVG}<span>nicelingo</span></a></header>
<main>
<h1>Spanish voice preview</h1>
<p>Every voice below reads the same four Spanish phrases. The first two are the voices in the app today; the rest are female candidates. Have a listen and tell us the name of the one you like — nothing here changes in the app until you pick.</p>
<p><label style="display:inline-flex;align-items:center;gap:.5rem;min-height:44px;font-weight:600"><input type="checkbox" id="slow" style="width:22px;height:22px"> Slow playback (85%) — easier for beginners</label></p>
<script>
document.getElementById("slow").addEventListener("change", function (e) {
  document.querySelectorAll("audio").forEach(function (a) {
    a.playbackRate = e.target.checked ? 0.85 : 1;
    a.preservesPitch = true;
  });
});
</script>
${sections}
</main>
</body>
</html>`;
}
