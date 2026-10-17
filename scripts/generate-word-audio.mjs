// Generate isolated word recordings for tap-to-hear: one clip per
// distinct word per language, single default voice (the same voice
// as the phrase audio; extra voices like Diana/Celeste do not get
// word clips). Clips live under lesson-001 (always free) and are
// shared by every phrase that uses the word:
//   /static/lesson-001/audio/{lang}/words/{slug}.mp3
// The word list comes from the dumped manifests (run merge +
// dump-manifests first), so clips always match served word data.
// Thai synthesizes the script form (parsed from the merged
// src/lessons/thai.ts atom tables); Mandarin synthesizes characters.
// Re-runnable: skips files that already exist.
// Usage: set -a && . /root/.env && set +a &&
//   node scripts/generate-word-audio.mjs [lang ...]
import { mkdirSync, existsSync, readFileSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VOICES = {
  en: { provider: "workers-aura", model: "@cf/deepgram/aura-2-en", speaker: "luna" },
  es: { provider: "workers-aura", model: "@cf/deepgram/aura-2-es", speaker: "aquila" },
  fr: { provider: "workers-melotts", model: "@cf/myshell-ai/melotts", lang: "fr" },
  zh: { provider: "gateway", model: "minimax/speech-2.8-turbo", speaker: "female-shaonv" },
  th: { provider: "gateway-gemini", model: "google/gemini-3.8-flash-tts", speaker: "Sulafat" },
  de: { provider: "gateway", model: "minimax/speech-2.8-turbo", speaker: "English_expressive_narrator" },
};

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) {
  console.error("missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
  process.exit(1);
}

// Thai: slug (atom key) -> script to synthesize. Parsed from the
// merged content tables; romanized display text cannot be read as
// Thai, so a word with no script mapping is a hard error.
function thaiScriptMap() {
  const path = join(root, "src/lessons/thai.ts");
  const src = readFileSync(path, "utf8");
  const map = new Map([["gam-lang", "กำลัง"], ["liking", "ชอบ"], ["wanting", "อยาก"]]);
  for (const m of src.matchAll(/^\s{2}(\w+): \{ script: "([^"]+)", latin:/gm)) {
    map.set(m[1], m[2]);
  }
  return map;
}

// Build slug -> { audioUrl, ttsText } per language from manifests.
const thScript = thaiScriptMap();
const wanted = new Map(); // lang -> Map(audioUrl -> ttsText)
for (const f of readdirSync(join(root, "scripts/manifests")).filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(readFileSync(join(root, "scripts/manifests", f), "utf8"));
  const lang = m.id.startsWith("lesson") ? "en" : m.id.split("-")[0];
  if (!VOICES[lang]) continue;
  const byUrl = wanted.get(lang) ?? new Map();
  for (const p of m.phrases) {
    for (const w of p.words ?? []) {
      if (!w.audioUrl || byUrl.has(w.audioUrl)) continue;
      let ttsText = w.chars ?? w.text;
      if (lang === "th") {
        const slug = w.audioUrl.split("/").pop().replace(/\.mp3$/, "");
        ttsText = thScript.get(slug);
        if (!ttsText) throw new Error(`no Thai script for word slug ${slug} (${w.text})`);
      }
      byUrl.set(w.audioUrl, ttsText);
    }
  }
  wanted.set(lang, byUrl);
}

async function synth(voice, text) {
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  if (voice.provider === "workers-aura") {
    // Aura reads a bare lowercase token less reliably than a
    // sentence-shaped one (isolated "hombre" came back garbled to
    // Whisper; "Hombre." transcribed cleanly), so capitalize and
    // terminate single words for Aura.
    const shaped = /^[A-ZÁÉÍÓÚÑ]/.test(text) || text.endsWith(".") ? text : `${text[0].toUpperCase()}${text.slice(1)}.`;
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${voice.model}`, {
      method: "POST", headers, body: JSON.stringify({ text: shaped, speaker: voice.speaker, encoding: "mp3" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return { bytes: new Uint8Array(await res.arrayBuffer()) };
  }
  if (voice.provider === "workers-melotts") {
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${voice.model}`, {
      method: "POST", headers, body: JSON.stringify({ prompt: text, lang: voice.lang }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const wav = Buffer.from(data?.result?.audio ?? "", "base64");
    if (wav.length < 1000) throw new Error("bad melotts payload");
    return { wav };
  }
  // Gateway providers (MiniMax, Gemini) with transient retries.
  let res = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const input = voice.provider === "gateway-gemini"
      ? { text, voice: voice.speaker }
      : { text, voice_id: voice.speaker, format: "mp3" };
    res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/ai/run`, {
      method: "POST", headers, body: JSON.stringify({ model: voice.model, input }),
    });
    if (res.ok || (res.status < 500 && res.status !== 429)) break;
    if (attempt < 4) await new Promise((r) => setTimeout(r, 3000 * attempt));
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} ${(await res.text().catch(() => "")).slice(0, 120)}`);
  const data = await res.json();
  if (voice.provider === "gateway-gemini") {
    const payload = data?.result?.audio ?? "";
    const wav = Buffer.from(payload.includes(",") ? payload.split(",").pop() : payload, "base64");
    if (wav.length < 1000) throw new Error("bad gemini payload");
    return { wav };
  }
  const url = data?.result?.audio ?? data?.result?.result?.audio;
  if (!url) throw new Error("no audio URL in gateway response");
  const audio = await fetch(url);
  if (!audio.ok) throw new Error(`audio download HTTP ${audio.status}`);
  return { bytes: new Uint8Array(await audio.arrayBuffer()) };
}

// Some voices render single words near-silent (Spanish "el" peaked
// at -32 dB and was inaudible). Peak-normalize anything under
// -10 dB up to -3 dB so every word plays at a usable level.
function normalizeClip(dest) {
  try {
    const probe = spawnSync(
      "ffmpeg", ["-i", dest, "-af", "volumedetect", "-f", "null", "-"],
      { encoding: "utf8" },
    ).stderr ?? "";
    const m = probe.match(/max_volume: (-[\d.]+) dB/);
    if (!m) return;
    const peak = Number.parseFloat(m[1]);
    if (peak >= -10) return;
    const tmp = `${dest}.tmp.mp3`;
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", dest, "-af", `volume=${(-3 - peak).toFixed(1)}dB`, "-codec:a", "libmp3lame", "-q:a", "4", tmp], { stdio: "pipe" });
    execFileSync("mv", [tmp, dest]);
  } catch { /* probe failure leaves the clip as generated */ }
}

const langs = process.argv.slice(2).length ? process.argv.slice(2) : [...wanted.keys()];
let made = 0, skipped = 0, failed = 0;
for (const lang of langs) {
  const voice = VOICES[lang];
  const byUrl = wanted.get(lang);
  if (!voice || !byUrl) { console.error(`no words for ${lang}`); continue; }
  const jobs = [...byUrl.entries()].filter(([url]) => {
    if (existsSync(join(root, "public", url))) { skipped++; return false; }
    return true;
  });
  console.log(`${lang}: ${byUrl.size} words, ${jobs.length} to generate`);
  // Modest parallelism: providers rate-limit, and failures are
  // reported at the end rather than aborting the whole run.
  const queue = [...jobs];
  async function worker() {
    while (queue.length) {
      const [url, text] = queue.shift();
      const dest = join(root, "public", url);
      mkdirSync(dirname(dest), { recursive: true });
      try {
        const out = await synth(voice, text);
        if (out.wav) {
          const tmp = join(tmpdir(), `nl-word-${process.pid}-${Math.random().toString(36).slice(2)}.wav`);
          writeFileSync(tmp, out.wav);
          execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", tmp, "-codec:a", "libmp3lame", "-q:a", "4", dest], { stdio: "pipe" });
          unlinkSync(tmp);
        } else {
          writeFileSync(dest, out.bytes);
        }
        normalizeClip(dest);
        made++;
      } catch (err) {
        failed++;
        console.error(`${lang} ${url}: ${err.message}`);
      }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
}
console.log(`done: ${made} generated, ${skipped} already existed, ${failed} failed`);
process.exit(failed ? 1 : 0);
