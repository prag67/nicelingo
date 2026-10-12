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
  for (const phrase of manifest.phrases) {
    const file = join(root, "public", phrase.audioUrl);
    if (!existsSync(file)) {
      console.log(`${phrase.id}: MISSING FILE`);
      fails++;
      continue;
    }
    const audio = readFileSync(file).toString("base64");
    const res = await fetch(`${base}/api/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: phrase.id, audio }),
    });
    if (!res.ok) {
      console.log(`${phrase.id}: HTTP ${res.status}`);
      fails++;
      continue;
    }
    const { score, transcript } = await res.json();
    const verdict = score >= 85 ? "GREEN" : score >= 60 ? "YELLOW" : "RED";
    if (score < 85) fails++;
    console.log(`${phrase.id}: ${verdict} score=${score} transcript=${JSON.stringify(transcript)}`);
  }
}
console.log(fails === 0 ? "ALL GREEN" : `${fails} CLIP(S) BELOW GREEN`);
process.exit(fails === 0 ? 0 : 1);
