// Validate tap-to-hear word data in the dumped manifests: every
// phrase carries words, every word has a gloss, and timed slices are
// ordered, non-overlapping, and at least 80 ms (words with their own
// audioUrl, e.g. Mandarin, need no slice). Run after dump-manifests.
// Usage: node scripts/validate-words.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

let phrases = 0;
let bad = 0;
const unglossed = new Map();
for (const f of readdirSync("scripts/manifests").filter((x) => x.endsWith(".json"))) {
  const m = JSON.parse(readFileSync(join("scripts/manifests", f), "utf8"));
  for (const p of m.phrases) {
    phrases++;
    if (!p.words?.length) {
      console.error(`NO WORDS ${p.id}`);
      bad++;
      continue;
    }
    let prevEnd = 0;
    for (const w of p.words) {
      if (!w.gloss) {
        console.error(`NO GLOSS ${p.id} "${w.text}"`);
        bad++;
      }
      if (w.gloss === w.text) unglossed.set(w.text, (unglossed.get(w.text) ?? 0) + 1);
      if (w.audioUrl) continue;
      if (w.start == null || w.end == null || w.end - w.start < 0.08) {
        console.error(`BAD SLICE ${p.id} "${w.text}" ${w.start}-${w.end}`);
        bad++;
      }
      if (w.start < prevEnd - 0.001) {
        console.error(`OVERLAP ${p.id} "${w.text}" starts ${w.start} < ${prevEnd}`);
        bad++;
      }
      prevEnd = Math.max(prevEnd, w.end ?? prevEnd);
    }
  }
}
console.log(`${phrases} phrases checked, ${bad} problems`);
if (unglossed.size) {
  console.log("words glossed as themselves (review):", [...unglossed.entries()].slice(0, 40));
}
process.exit(bad ? 1 : 0);
