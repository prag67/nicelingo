// Bulk-upload lesson media to R2 (bucket nicelingo-media).
// Maps every file under the content repo's public/static to its R2 key
// (same transform as src/lib/media-keys.ts r2KeyForMedia — keep in sync)
// and prints a TSV of key, local path, content type for the uploader.
// Usage: node scripts/upload-media.mjs [/abs/path/to/public/static]
// Prints "UNMAPPED <path>" for anything outside lesson media and exits 1.
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2] ?? "/root/nicelingo-content/public/static";

function keyFor(rel) {
  let m = /^lesson-(\d{3})\/audio\/([a-z]{2})\/([^/]+)\/([^/]+\.mp3)$/.exec(rel);
  if (m) return `voice/${m[2]}/${m[1]}/${m[3]}/${m[4]}`;
  m = /^lesson-(\d{3})\/audio\/([a-z]{2})\/([^/]+\.mp3)$/.exec(rel);
  if (m) return `voice/${m[2]}/${m[1]}/${m[3]}`;
  m = /^lesson-(\d{3})\/audio\/([^/]+\.mp3)$/.exec(rel);
  if (m) return `voice/en/${m[1]}/${m[2]}`;
  m = /^lesson-(\d{3})\/images\/(.+)$/.exec(rel);
  if (m) return `images/${m[1]}/${m[2]}`;
  return null;
}

function walk(dir, out) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
}

const files = [];
walk(root, files);
files.sort();
let bad = 0;
for (const p of files) {
  const rel = p.slice(root.length + 1);
  const key = keyFor(rel);
  if (!key) {
    console.log(`UNMAPPED ${rel}`);
    bad++;
    continue;
  }
  const ct = rel.endsWith(".mp3")
    ? "audio/mpeg"
    : rel.endsWith(".jpg") || rel.endsWith(".jpeg")
      ? "image/jpeg"
      : rel.endsWith(".png")
        ? "image/png"
        : "application/octet-stream";
  console.log(`${key}\t${p}\t${ct}`);
}
if (bad > 0) process.exit(1);
