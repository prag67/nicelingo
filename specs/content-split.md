# Content Split: public code + private content repos

Status: spec (awaiting approval to execute). All examples below use a
FAKE curriculum — no real lesson sentence may ever appear in this file.

## Why

Lesson sentences live in `src/lessons/*.ts` and media in `public/static/`.
Open-sourcing the code as-is open-sources the whole corpus. The split
keeps code public while curriculum, translations, and media stay in a
private repo. Runtime behavior and the deploy process stay identical:
the two trees merge on disk before typecheck, test, and deploy.

## Repos

- `nicelingo` (public): all code, machinery, derivations, fake content
  stand-ins, content-agnostic tests. License: MIT.
- `nicelingo-content` (private): curriculum tables, frames, builders,
  media, override data, sentence-bearing specs, content-coupled tests.
  License: all rights reserved (see `LICENSE-content`).

(Names assume the `prag67` GitHub account; rename freely — only the
merge script's remote URL and CI secrets change.)

## Seam: whole-file overlay, paths as contract

The import graph funnels all content through `src/lessons/curriculum.ts`
and `src/lessons/languages.ts`, so no framework or DI is needed. The
content repo owns whole files at fixed paths; the merge copies them over
the code tree. The code repo ships small fake stand-ins at those same
paths so public typecheck/tests run standalone. Shared types live in the
code repo; the merged-tree typecheck enforces the interface both ways.

### Files moving to `nicelingo-content` (exact manifest)

Curriculum source (whole files):

- `src/lessons/curriculum.ts` — NOUNS/VERBS tables, CURRICULUM
  sequencing rows, verbLabel/opinionLabel/sentence frames,
  manifestFor, lessons assembly.
- `src/lessons/thai.ts`, `src/lessons/chinese.ts` — dual-label tables
  + vocal-only builders.
- `src/lessons/aliases.ts` (new) — TRANSCRIPT_ALIASES /
  TRANSCRIPT_EXPANSIONS maps, extracted from `src/lib/scoring.ts`,
  which keeps only the scoring mechanism and imports the maps.
- `src/lessons/names.ts` (new) — registry NAMES (display names,
  own names, greetings, tile colors), extracted from
  `src/lessons/languages.ts`, which keeps only derivation logic
  (`info`, `pickerLanguages`, `coverageLine`).

Media:

- `public/static/**` — all lesson audio/images (~377MB, ~10.6k files).

Data:

- `content/tts-overrides.mjs` (new) — TEXT_OVERRIDES (real prompt
  sentences + QA comments), extracted from
  `scripts/generate-audio.mjs`, which imports it. A data module (not
  JSON) so the QA evidence comments survive. VOICE_OVERRIDES entries
  stay in the script (speaker IDs only, no sentences); their
  non-English QA comments were generalized.

Specs (sentence-bearing only):

- `specs/vocal-only-languages.md`, `specs/spanish.md`,
  `specs/lesson-02.md`.

Tests (content-coupled only — anything asserting real words/counts):

- `tests/curriculum.test.ts`, `tests/lesson-002.test.ts`,
  `tests/lesson-es-01.test.ts`, `tests/lesson-th-001.test.ts`,
  `tests/lesson-zh-001.test.ts`, `tests/score.test.ts` (overwrites the
  public mechanism-only version on merge),
  `tests/scoring-unspaced.test.ts`, `tests/player-mandarin.test.ts`,
  `tests/player-thai.test.ts` (real-script display fixtures), and
  `tests/content-smoke.test.ts` (real-data registry/route/gating
  integration). They run in the merged tree only.

### Files staying in `nicelingo` (code)

- `src/lessons/build.ts` — types + `buildManifest` (delete dead
  unreferenced `EN_NOUNS`/`ES_NOUNS`), `src/lessons/index.ts`,
  `src/lessons/languages.ts` (logic only), `src/lessons/curriculum.ts`
  — REPLACED by the fake stand-in (below); the real file comes from
  the merge. Same for `thai.ts`/`chinese.ts`/`aliases.ts`/`names.ts`:
  fake stand-ins at identical paths, identical export shapes.
- All of `src/routes/`, `src/lib/` (mechanism only),
  `src/db/`, `src/index.ts`.
- All of `scripts/` (generic machinery; overrides loaded from JSON).
- All of `public/` except `public/static/` (player, CSS, SW, logos,
  fonts), `wrangler.toml`, `package.json`, configs, `.dev.vars.example`.
- Specs without sentences: `specs/lesson-01.md`,
  `specs/lesson-player.md`, `specs/offline.md`, this file.
- `docs/screens/` mockups stay public: they contain single example
  words, not the corpus, and are required design context.
- `CONTEXT.md`, `README.md` (sentence-free, verified).

## Fake curriculum (code repo)

`src/lessons/curriculum.ts` (fake) provides the same exports with a
tiny invented corpus that exercises every code path the public tests
need:

- Languages: `en` + `xx` (2 fake "languages" with gibberish labels —
  e.g. noun "wug", verb "zorp"), `yy` partial (Unit 1 only),
  exercising complete/partial/hidden + coverage line.
- Shape: 8 lessons (`001`-`008`), UNITS[0] = `001`-`004` so free-Unit-1
  gating, paywall 401s, and `?return=` flows all behave identically.
- One vocal-only-shaped language entry is NOT needed publicly: the
  player tests inject their own stub manifests (already self-contained).
- `aliases.ts` (fake): 2-3 invented alias pairs exercising the
  mechanism. `names.ts` (fake): invented names/greetings/colors.

Rule: fake words must be obvious gibberish (`wug`, `zorp`) so a leak
of real content into the code repo is instantly visible.

## Test split

- Public tests run on fake content and must be content-agnostic: assert
  derivation, shapes, gating, patterns — never literal sentences or
  real counts. Route-hit tests
  (`home/course/billing/paywall/progress/lesson-flow/lesson-page`)
  are rewritten to fake words/counts; `score.test.ts` keeps a
  gibberish mechanism-only version publicly.
- Private tests keep every literal assertion (real sentences, 240/48
  counts, real scoring fixtures, audio QA expectations) and run only
  in the merged tree — including `content-smoke.test.ts`, which
  re-proves the registry, picker, courses, billing, and paywall
  against real data.
- The two suites are mutually exclusive by tree: public tests fail on
  real content BY DESIGN (they assert gibberish) and content tests
  fail on fake. The merge script's gates run tsc + content tests
  only; code CI runs tsc + the public suite. Never run the full
  suite on a merged tree.
- Leak test (runs in public CI and pre-push): grep the code repo for a
  sample of real sentences across all six languages → must be empty.
  (Sample list lives in the content repo so the words never appear in
  public CI config; the public job fetches it post-merge... no —
  simpler: the public leak job greps for a *structural* tell that real
  content always carries and fake never does: `/static/lesson-` paths
  outside the merge tooling, plus `scripts/manifests/*.json`
  presence. Real-sentence grep runs in private CI where the words are
  allowed.)

## Merge script (`scripts/merge-content.mjs`, code repo)

1. Clone or pull `nicelingo-content` into `.content/` (git, SSH).
2. Copy owned paths over the working tree (exact manifest above).
3. Run `npx tsc --noEmit && npx vitest run`.
4. Exit non-zero on any failure; never commit.

`.content/` is gitignored. The script is the ONLY writer of content
paths; all other tooling treats merged files as read-only input.

## CI

- Public (`nicelingo/.github/workflows/ci.yml`): checkout, `npm ci`,
  typecheck, tests (fake), leak test (structural). No secrets.
- Private (`nicelingo-content/.github/workflows/ci.yml`): checkout
  code repo + content repo, merge script, full gates, real-sentence
  leak grep on the code checkout. Needs no deploy secrets.
- Deploys stay manual (`wrangler deploy` from a merged tree, behind
  the existing `ship` approval) — CI never deploys.

## Local setup (two clones, documented in code README)

1. Clone both repos as siblings: `nicelingo/`, `nicelingo-content/`.
2. `cd nicelingo && node scripts/merge-content.mjs --local
...[truncated 1065 chars]