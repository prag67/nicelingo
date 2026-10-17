// Merge private course content over this checkout (see
// specs/content-split.md). The content repo mirrors code-tree paths, so
// the merge is a plain copy; owned test files (e.g. tests/score.test.ts)
// are OVERWRITTEN — restore with `git checkout -- <file>` afterwards.
// Usage:
//   node scripts/merge-content.mjs [--source <dir>] [--local] [--no-gates]
// --local uses the ../nicelingo-content sibling checkout; otherwise the
// content repo is cloned/pulled into .content/ (CONTENT_REMOTE env or SSH
// default). .content/ is gitignored. Never commits.
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OWNED = [
  "src/lessons/curriculum.ts",
  "src/lessons/thai.ts",
  "src/lessons/chinese.ts",
  "src/lessons/aliases.ts",
  "src/lessons/word-timings.ts",
  "src/lessons/names.ts",
  "content/tts-overrides.mjs",
  "public/static",
  "specs/vocal-only-languages.md",
  "specs/spanish.md",
  "specs/lesson-02.md",
  "tests/curriculum.test.ts",
  "tests/lesson-002.test.ts",
  "tests/lesson-es-01.test.ts",
  "tests/lesson-th-001.test.ts",
  "tests/lesson-zh-001.test.ts",
  "tests/score.test.ts",
  "tests/scoring-unspaced.test.ts",
  "tests/player-mandarin.test.ts",
  "tests/player-thai.test.ts",
  "tests/content-smoke.test.ts",
];

const REMOTE =
  process.env.CONTENT_REMOTE ?? "git@github.com:pragmaticonline/nicelingo-content.git";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const gates = !args.includes("--no-gates");
const sourceFlag = args.indexOf("--source");
const source =
  sourceFlag >= 0
    ? args[sourceFlag + 1]
    : args.includes("--local")
      ? join(root, "..", "nicelingo-content")
      : join(root, ".content");

if (!existsSync(join(source, "src/lessons/curriculum.ts"))) {
  if (sourceFlag >= 0 || args.includes("--local")) {
    console.error(`content checkout missing at ${source}`);
    process.exit(1);
  }
  mkdirSync(source, { recursive: true });
  if (existsSync(join(source, ".git"))) {
    execFileSync("git", ["-C", source, "pull", "--ff-only"], { stdio: "pipe" });
  } else {
    execFileSync("git", ["clone", "--depth", "1", REMOTE, source], { stdio: "pipe" });
  }
}

for (const p of OWNED) {
  const from = join(source, p);
  if (!existsSync(from)) {
    console.error(`content file missing: ${p}`);
    process.exit(1);
  }
  cpSync(from, join(root, p), { recursive: true });
  console.log(`merged ${p}`);
}
console.log("merge complete (owned test files overwritten; restore with git checkout)");

if (gates) {
  // Merged-tree gates: tsc plus the CONTENT-owned tests only. Public
  // tests assert the fake curriculum, so they run exclusively in the
  // code repo (unmerged); running them here would fail by design.
  try {
    execFileSync("npx", ["tsc", "--noEmit"], { cwd: root, stdio: "inherit" });
    execFileSync(
      "npx",
      ["vitest", "run", ...OWNED.filter((p) => p.startsWith("tests/"))],
      { cwd: root, stdio: "inherit" },
    );
  } catch {
    console.error("merged-tree gates FAILED");
    process.exit(1);
  }
}
