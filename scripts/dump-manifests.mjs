// Dumps scripts/manifests/{en,es,de,fr}-{NN}.json from the TS curriculum source.
// Transpiles with the project's own typescript install, so no dev server,
// session, or subscription is needed (paid lessons gate over HTTP).
// Usage: node scripts/dump-manifests.mjs [NN ...]  (default: all lessons)
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = mkdtempSync(join(tmpdir(), "nicelingo-curriculum-"));
execFileSync(
  "npx",
  [
    "tsc",
    "src/lessons/curriculum.ts",
    "--outDir",
    tmp,
    "--module",
    "commonjs",
    "--target",
    "es2022",
    "--skipLibCheck",
  ],
  { cwd: root, stdio: "pipe" },
);
const { lessons } = createRequire(import.meta.url)(join(tmp, "curriculum.js"));

const want = process.argv.slice(2);
const numbers = Object.keys(lessons)
  .sort()
  .filter((n) => want.length === 0 || want.includes(n));
const outDir = join(root, "scripts", "manifests");
mkdirSync(outDir, { recursive: true });
for (const n of numbers) {
  for (const lang of ["en", "es", "de", "fr", "th", "zh"]) {
    // Vocal-only languages cover Level 1 so far; later levels 404.
    if (!lessons[n][lang]) continue;
    writeFileSync(
      join(outDir, `${lang}-${n}.json`),
      JSON.stringify(lessons[n][lang]),
    );
    console.log(`${lang}-${n}: ${lessons[n][lang].phrases[0].text}`);
  }
}
console.log("done");
