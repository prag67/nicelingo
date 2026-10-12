// One-time image generation for lesson manifests via Workers AI.
// Usage: CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/generate-images.mjs
// Re-runnable: skips files that already exist. Prints sizes only, never secrets.
// Requires: ffmpeg (PNG/JPEG normalization to .jpg).
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const MODEL = "@cf/leonardo/phoenix-1.0";
const STYLE =
  "clean simple stock photograph, single subject, plain light background, natural daylight";
const NEGATIVE =
  "multiple people, crowd, extra person, second person, text, words, watermark, logo, blurry, dark";

const IMAGES = [
  ["man-eating", "one adult man eating a meal with a spoon at a table"],
  ["man-drinking", "one adult man drinking a glass of water"],
  ["woman-eating", "one adult woman eating a meal with a spoon at a table"],
  ["woman-drinking", "one adult woman drinking a glass of water"],
  ["boy-eating", "one young boy eating a meal with a spoon at a table"],
  ["boy-drinking", "one young boy drinking a glass of water"],
  ["girl-eating", "one young girl eating a meal with a spoon at a table"],
  ["girl-drinking", "one young girl drinking a glass of water"],
];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "static", "lesson-01", "images");
mkdirSync(outDir, { recursive: true });

const token = process.env.CLOUDFLARE_API_TOKEN;
const account = process.env.CLOUDFLARE_ACCOUNT_ID;
if (!token || !account) {
  console.error("missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ACCOUNT_ID");
  process.exit(1);
}

for (const [id, subject] of IMAGES) {
  const dest = join(outDir, `${id}.jpg`);
  if (existsSync(dest)) {
    console.log(`${id}: exists, skipping`);
    continue;
  }
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `${STYLE} of ${subject}`,
        negative_prompt: NEGATIVE,
        width: 1024,
        height: 1024,
        guidance: 7,
      }),
    },
  );
  const contentType = res.headers.get("content-type") ?? "?";
  if (!res.ok) {
    console.error(`${id}: HTTP ${res.status} (${contentType})`);
    console.error((await res.text()).slice(0, 300));
    process.exit(1);
  }
  const tmp = join(tmpdir(), `nicelingo-${id}.img`);
  writeFileSync(tmp, new Uint8Array(await res.arrayBuffer()));
  execFileSync("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    tmp,
    "-q:v",
    "4",
    dest,
  ]);
  console.log(`${id}: done (${contentType} -> jpg)`);
}
console.log("done");
