// Generate one thumbnail per lesson (first phrase's image, 480px wide)
// for course cards and the Continue card. Idempotent: skips thumbs that
// already exist. Usage: node scripts/generate-thumbs.mjs
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const ROOT = new URL("..", import.meta.url).pathname;

let made = 0;
let skipped = 0;
for (let i = 1; i <= 240; i++) {
  const n = String(i).padStart(3, "0");
  const dump = `${ROOT}scripts/manifests/en-${n}.json`;
  const dest = `${ROOT}public/static/lesson-${n}/images/thumb.jpg`;
  if (existsSync(dest)) {
    skipped++;
    continue;
  }
  let first;
  try {
    const manifest = JSON.parse(await readFile(dump, "utf8"));
    first = manifest.phrases[0]?.imageUrl;
  } catch {
    console.error(`no manifest dump for lesson ${n}, skipping`);
    skipped++;
    continue;
  }
  const src = `${ROOT}public${first}`;
  if (!existsSync(src)) {
    console.error(`missing source ${first}, skipping`);
    skipped++;
    continue;
  }
  await sharp(src).resize({ width: 480 }).jpeg({ quality: 70 }).toFile(dest);
  made++;
}
console.log(`thumbs: ${made} made, ${skipped} skipped`);
