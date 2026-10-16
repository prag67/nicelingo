// Closed-loop audio QA: feeds every generated clip for a lesson back through
// the live /api/score endpoint and reports green/yellow/red per clip.
// Usage: node scripts/qa-audio.mjs [NN] [baseUrl]
// Requires the dev server (or deployed worker) to be reachable.
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const lesson = process.argv[2] ?? "03";
const base = process.argv[3] ?? "http://localhost:8787";

let fails = 0;
for (const lang of ["en", "es", "de", "fr", "th", "zh"]) {
  const manifestPath = join(root, "scripts", "manifests", `${lang}-${lesson}.json`);
  if (!existsSync(manifestPath)) {
    console.error(`missing manifest ${lang}-${lesson}`);
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const check = async (id, url) => {
    const file = join(root, "public", url);
    if (!existsSync(file)) {
      console.log(`${id}: MISSING FILE`);
      fails++;
      return;
    }
    const audio = readFileSync(file).toString("base64");
    const res = await fetch(`${base}/api/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: id, audio }),
    });
    if (!res.ok) {
      console.log(`${id}: HTTP ${res.status}`);
      fails++;
      return;
    }
    const { score, transcript } = await res.json();
    const verdict = score >= 85 ? "GREEN" : score >= 60 ? "YELLOW" : "RED";
    if (score < 85) fails++;
    console.log(`${id}: ${verdict} score=${score} transcript=${JSON.stringify(transcript)}`);
  };
  for (const phrase of manifest.phrases) {
    await check(phrase.id, phrase.audioUrl);
    // Alt voices face the same green bar as the default.
    for (const [voice, url] of Object.entries(phrase.audioUrls ?? {})) {
      await check(`${phrase.id}[${voice}]`, url);
    }
  }
}
console.log(fails === 0 ? "ALL GREEN" : `${fails} CLIP(S) BELOW GREEN`);
process.exit(fails === 0 ? 0 : 1);
