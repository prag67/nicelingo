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
  { id: "selena", name: "Selena", kind: "current", detail: "Feminine · Latin American · young adult · friendly, calm" },
  { id: "celeste", name: "Celeste", kind: "current", detail: "Feminine · Colombian · young adult · clear, energetic" },
  { id: "estrella", name: "Estrella", kind: "candidate", detail: "Feminine · Mexican · mature · natural, calm" },
  { id: "diana", name: "Diana", kind: "candidate", detail: "Replaced by Selena in conversations (decision 16) · Feminine · Spain · adult" },
  { id: "carina", name: "Carina", kind: "candidate", detail: "Feminine · Spain · adult · professional, energetic" },
];


export interface PreviewLangVoice {
  id: string;
  name: string;
  kind: "current" | "candidate";
  detail: string;
}

export interface PreviewLang {
  code: string;
  name: string;
  sentence: string;
  sentenceLang: string;
  en: string;
  voices: PreviewLangVoice[];
}

// One sample sentence per voice for the non-Spanish languages
// (Spanish above predates this and keeps its four phrases). The
// current voice is listed first; the rest are candidates to pick
// from. Sample clips live in R2 under voice-preview/{lang}/{id}/.
export const PREVIEW_LANGS: PreviewLang[] = [
  {
    code: "en", name: "English", sentence: "The man is eating.", sentenceLang: "en", en: "",
    voices: [
      { id: "luna", name: "Luna", kind: "current", detail: "Current default · feminine · Aura-2" },
      { id: "orion", name: "Orion", kind: "candidate", detail: "Masculine · Aura-2" },
      { id: "arcas", name: "Arcas", kind: "candidate", detail: "Masculine · Aura-2" },
      { id: "athena", name: "Athena", kind: "candidate", detail: "Feminine · Aura-2" },
      { id: "hera", name: "Hera", kind: "candidate", detail: "Feminine · Aura-2" },
    ],
  },
  {
    code: "de", name: "German", sentence: "Der Mann isst.", sentenceLang: "de", en: "The man is eating.",
    voices: [
      { id: "narrator", name: "Narrator", kind: "current", detail: "Current default · MiniMax narrator" },
      { id: "sweetlady", name: "Sweet Lady", kind: "candidate", detail: "Feminine · MiniMax German" },
      { id: "playfulman", name: "Playful Man", kind: "candidate", detail: "Masculine · MiniMax German" },
      { id: "friendlyman", name: "Friendly Man", kind: "candidate", detail: "Masculine · MiniMax German" },
    ],
  },
  {
    code: "fr", name: "French", sentence: "L'homme mange.", sentenceLang: "fr", en: "The man is eating.",
    voices: [
      { id: "melotts", name: "MeloTTS", kind: "current", detail: "Current default · MeloTTS (single voice)" },
      { id: "kore", name: "Kore", kind: "candidate", detail: "Feminine · Gemini" },
      { id: "aoede", name: "Aoede", kind: "candidate", detail: "Feminine · Gemini" },
      { id: "charon", name: "Charon", kind: "candidate", detail: "Masculine · Gemini" },
      { id: "fenrir", name: "Fenrir", kind: "candidate", detail: "Masculine · Gemini" },
    ],
  },
  {
    code: "th", name: "Thai", sentence: "ph\u00fbu-chaai gam-lang gin.", sentenceLang: "th", en: "The man is eating.",
    voices: [
      { id: "sulafat", name: "Sulafat", kind: "current", detail: "Current default · feminine · Gemini" },
      { id: "zephyr", name: "Zephyr", kind: "candidate", detail: "Feminine · Gemini" },
      { id: "kore", name: "Kore", kind: "candidate", detail: "Feminine · Gemini" },
      { id: "charon", name: "Charon", kind: "candidate", detail: "Masculine · Gemini" },
      { id: "puck", name: "Puck", kind: "candidate", detail: "Masculine · Gemini" },
    ],
  },
  {
    code: "zh", name: "Mandarin", sentence: "\u7537\u4eba\u6b63\u5728\u5403 (n\u00e1nr\u00e9n zh\u00e8ngz\u00e0i ch\u012b)", sentenceLang: "zh", en: "The man is eating.",
    voices: [
      { id: "shaonv", name: "Shaonv", kind: "current", detail: "Current default · feminine · MiniMax" },
      { id: "yujie", name: "Yujie", kind: "candidate", detail: "Feminine · MiniMax" },
      { id: "qingse", name: "Qingse", kind: "candidate", detail: "Masculine · MiniMax" },
      { id: "jingying", name: "Jingying", kind: "candidate", detail: "Masculine · MiniMax" },
    ],
  },
];

export function previewLang(code: string): PreviewLang | undefined {
  return PREVIEW_LANGS.find((l) => l.code === code);
}

export function isPreviewLangVoice(code: string, voice: string): boolean {
  return !!previewLang(code)?.voices.some((v) => v.id === voice);
}

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
h2.lang{margin:2rem 0 .25rem;font-size:1.4rem}
audio{height:44px;max-width:100%}`;

export function voicePreviewPage(): string {
  const langSections = PREVIEW_LANGS.map((l) => {
    const rows = l.voices.map(
      (v) => `<section class="voice"><span class="tag ${v.kind}">${v.kind === "current" ? "Current voice" : "Candidate"}</span><h2>${escapeHtml(v.name)}</h2><p class="small">${escapeHtml(v.detail)}</p><div class="sample"><p><span lang="${escapeHtml(l.sentenceLang)}">${escapeHtml(l.sentence)}</span>${l.en ? `<br><span class="en">${escapeHtml(l.en)}</span>` : ""}</p><audio controls preload="none" src="/voice-preview/audio/${l.code}/${v.id}/sample.mp3"></audio></div></section>`,
    ).join("\n");
    return `<h2 class="lang">${escapeHtml(l.name)}</h2>\n${rows}`;
  }).join("\n");
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
<title>Voice preview · Nicelingo</title>
<meta name="theme-color" content="#1a5feb">
<link rel="icon" href="/logo/favicon.svg" type="image/svg+xml">
<style>${STYLE}</style>
</head>
<body>
<header class="site"><a href="/" aria-label="Nicelingo home">${LOGO_SVG}<span>nicelingo</span></a></header>
<main>
<h1>Voice preview</h1>
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
<h2 class="lang">Spanish</h2>
${sections}
${langSections}
</main>
</body>
</html>`;
}
