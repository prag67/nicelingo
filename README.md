# Nicelingo

Photo lessons that teach a language by seeing, hearing, and saying short
phrases, with pronunciation scoring. Hono + Better Auth on Cloudflare
Workers, with D1 (SQLite) storage, Google social login, and anonymous
try-before-signup sessions for kids. Unit 1 (lessons 1–4) is free in every
language; lesson 5 and up needs Premium ($3/month or $29/year).

The homepage (`/`) is the language picker for everyone — the logo always
links there. Interface language is chosen in the account menu or the
footer ("App language"); the learning language is the course you open.

## Setup

1. Install: `npm install`
2. Copy env files and fill in secrets:
   - `cp .dev.vars.example .dev.vars`
   - `cp .env.example .env`
3. Create the D1 database and paste its id into `wrangler.toml`:
   `wrangler d1 create nicelingo-auth`
4. Generate + apply migrations:
   - `npm run db:generate`
   - `npm run db:migrate:local` (local dev) / `npm run db:migrate:remote` (prod)
5. Google OAuth: create a Web-application client in Google Cloud Console with
   redirect URI `http://localhost:8787/api/auth/callback/google` (local) and
   `https://<your-worker>/api/auth/callback/google` (prod). Put the client id
   and secret in `.dev.vars` (local) and `wrangler secret put` (prod).
6. Run: `npm run dev`

## Course content (private)

Lesson text, translations, scoring word lists, and media live in the
private `nicelingo-content` repo — this checkout ships gibberish
stand-ins so typecheck/tests run standalone. For real-content work
(audio, QA, deploys), clone it as a sibling and merge:

```
git clone <content-remote-url> ../nicelingo-content
node scripts/merge-content.mjs --local
```

See `specs/content-split.md` for the full contract. License: MIT (this
repo); content is all rights reserved.

## Endpoints

- `GET /health` — liveness probe
- `GET|POST /api/auth/*` — Better Auth (email/password, Google, anonymous, session). Unit 1 (lessons 1-4) is open to everyone; Lesson 5 and up needs a Premium subscription ($3/month or $29/year via Stripe — `/billing`, `/api/billing/checkout|portal|status|webhook` in `src/lib/stripe.ts` + `src/db/subscription-store.ts`). Registration saves progress but does not unlock paid lessons. Verification and password-reset mail goes through MailNice when `MAILNICE_API_KEY`/`EMAIL_FROM` secrets are set — see `.dev.vars.example` for the Stripe secrets to set before billing works in production.
- `GET /api/me` — current session user, 401 when signed out
- `GET /api/lessons/01` — Lesson 1 manifest (phrases, asset URLs, activities)
- `POST /api/score` — `{ phraseId, audio }` (base64) → `{ score, verdict }`
- `GET|POST /api/progress` — per-activity completion, strict order, auth required
- `POST /_nicelingo/events` — browser beacon for client events (`page_view`)
- Pages: `/` language picker (the homepage), `/:lang` course home,
  `/:lang/progress` Your progress per language plus the master
  `/progress` (same global streak, per-language summary rows,
  cross-language badge grid; both reached by tapping the streak chip;
  `noindex`), `/lesson/:lang/:lesson`
  player (public/app/player.js; parrot logo links
  home, completed stage bars replay that stage), `/billing`, `/terms`,
  `/privacy`, `/refunds`, `/contact`, `/developers`, `/robots.txt`,
  `/sitemap.xml` (registry-driven), plus `noindex` auth pages
  (`/register`, `/sign-in`, `/forgot-password`, `/reset-password`,
  `/account`)
- `GET /voice-preview` — unlisted, `noindex` page for auditioning
  candidate TTS voices before rollout; sample audio is served from R2
  through `/voice-preview/audio/:voice/:file` (fixed allowlist)
- `GET /static/*` — lesson media, served by the Worker: subscription
  gate first, then R2, then static assets as fallback (see Lesson media)

## Analytics

Usage events go to Cloudflare Analytics Engine (dataset
`nicelingo_events`, binding `EVENTS` in `wrangler.toml`), modelled on
Blognice but aggregate-only — no visitor/user identifier, IP, raw
user-agent, audio, or transcript is recorded. Events: `page_view`,
`language_selected`, `lesson_started`, `activity_completed`,
`score_attempt` (verdict + score only), `checkout_started`, and
`subscription_changed`; schema and helpers live in
`src/lib/analytics.ts`. Writes need no token and never
fail a request. Read back with `usageReport(env, days)` from the same
module — it needs `CF_ACCOUNT_ID` (set in `wrangler.toml`) and a
`CF_ANALYTICS_TOKEN` secret with Account Analytics Read
(`wrangler secret put CF_ANALYTICS_TOKEN`). Analytics Engine retains
raw data for ~90 days and counts are sampling estimates
(`SUM(_sample_interval)`), so treat reports as directional, not exact.

Run `npm test` (Vitest) and `npm run typecheck` before pushing.

## Staff admin

A separate Worker (`src/staff.ts`, config `wrangler.staff.toml`, deploy
with `npm run deploy:staff`) sharing the same D1, modelled on
Blognice's staff backend. Cloudflare Access (Zero Trust) is the login:
Access fronts the staff Worker's URL and the Worker verifies the
`Cf-Access-Jwt-Assertion` RS256 signature, issuer, audience, and expiry
on every request, then maps the Access subject to a role via the
`staff_users` table (`read_only` / `support` / `admin`);
`STAFF_ALLOWED_EMAILS` is the bootstrap admin fallback. Unconfigured
Access fails closed. One-time setup is listed at the top of
`wrangler.staff.toml` (create the Access application, set its AUD tag
and the allowlist, apply migrations with `npm run db:migrate:remote`).
V1 is read-only: dashboard counts, user search/detail with progress and
subscription state, subscription list, Analytics Engine usage reports
(needs the `CF_ANALYTICS_TOKEN` secret on the staff Worker), and the
staff audit log (`staff_audit_events`, written by future mutation
tools via the `audit()` helper).

## Progress, streaks, and badges

Rewards follow learning only — never purchases — and are identical for
free and Premium learners. A streak day is any local calendar day with
at least one completed activity (`src/lib/streaks.ts`, derived from
activity days, no extra state). Unit badges (`src/lib/badges.ts`) award
tiers at 1/3/5/10/20/30/40/50/60 completed units. Both live on Your
progress (`/{lang}/progress`, `src/routes/progress.ts`): streak hero
with a 7-day strip and an encouragement/warning line, the badge grid
(earned in colour, locked grey with how-to-earn text, plus the "Next
badge after N more unit(s)" line that used to sit on the course page),
and counts of lessons finished and phrases learned. The streak itself
is master (activity days are per user across languages); only badges
and counts are per language. The master page (`/progress`) shows that
same streak with a summary row per started language and a
cross-language badge grid. Both pages carry a Share your progress
block: the message is built from real numbers ("I can say {phrases}
phrases in {lang} — {streak}-day streak on Nicelingo!") and shared
via the native share sheet where available, a Copy link button,
plus X, WhatsApp, LINE, Telegram, and Facebook intent links. The
lesson-complete screen carries the same targets as an icon-only
row (44px round buttons) with a just-finished-lesson message. Tapping the streak chip is the door: to
`/progress` from the picker, to `/{lang}/progress` from a course.
Anonymous learners with a streak
get a "Sign in so you don't lose your streak" nudge there. Leaving a
lesson stage mid-way (parrot logo or a completed stage bar) asks first
via an "Exit current stage?" dialog. Later slices: daily-goal ring,
streak freeze, words-you-know gallery, step badges, parrot outfits.

## Unit checkpoints, phrase stats, and milestones

Every answer in any lesson, checkpoint, or challenge posts to
`POST /api/attempts` and updates `phrase_stats` (attempts, correct,
best speak score, weak flag: weak after a wrong answer or a speak
score under 70, cleared after two correct in a row; server-first,
kept on the device when the POST fails). Finished checkpoints post
to `POST /api/milestones`; the server enforces the pass mark itself.
Tables: `phrase_stats`, `milestones` (migration 0006).

A unit checkpoint (`/{lang}/checkpoint/{level}/{unit}`, player
checkpoint mode) is a 10-question mixed review built server-side by
`GET /api/checkpoint/:lang/:level/:unit` from the unit's 32 phrases
(at least 2 per lesson; 3 listen, 3 image, 2 speak, 2 write —
languages without read-write give those slots to listen/image).
Pass is 8 of 10; it earns the unit badge (course-page unit number
turns into a check, badge appears on the progress page) but never
blocks the next unit. Free learners get the Unit 1 checkpoint;
subscribers get all units; the unit's four lessons must be finished
to unlock it. Result screens offer Continue, Try again, and
Practise these (a mini review of the missed phrases).

## Tap-to-hear words and slow playback

Every phrase in every language carries a `words` array (text, gloss,
start/end in seconds) composed at manifest build time from the same
noun/verb atoms as the sentence, so glosses are correct by
construction. Timings split the real default-voice clip duration —
measured by `scripts/build-words.mjs` into the content repo's
`src/lessons/word-timings.ts` — across words by length, with an 80 ms
floor and no overlaps; `scripts/validate-words.mjs` fails the build
if any phrase misses words, a gloss, or a valid slice (8,448 phrases
pass). In the player, phrase text renders as dotted-underline chips:
a tap plays just that word (30 ms pad, 10 ms fades, default voice for
slices since timings were measured on it) and opens its meaning
popup; only one sound plays at a time. Chips appear in phrase cards,
on the speak result, and — never before the answer — as an
after-answer reveal in choice questions; the write prompt chips every
word except the blanked one. A tortoise button replays the phrase at
70% speed, pitch preserved. Mandarin words play their own isolated
recordings (`/static/lesson-001/audio/zh/words/{word}.mp3`) because
tones shift in context, and show characters over pinyin. The progress
page's Words you know gallery replays the same chips from finished
lessons.

## Lesson media (R2)

Audio and images live in the private R2 bucket `nicelingo-media`
(binding `MEDIA`), not in git. Public URLs stay stable
(`/static/lesson-001/audio/...`); the Worker gates paid lessons, then
serves from R2 (edge-cached, `Cache-Control: immutable`), falling back
to static assets during migration. Key scheme
(`src/lib/media-keys.ts`): `voice/{lang}/{lesson}/{file}.mp3`, extra
voices nested as `voice/{lang}/{lesson}/{voice}/{file}.mp3`, images as
`images/{lesson}/{file}.jpg`. Bulk upload:

`node scripts/upload-media.mjs [/path/to/public/static]` (prints the
key/path/content-type list for the uploader)

## Lesson audio

Clips are generated once (see `scripts/generate-audio.mjs` for the
per-language providers; English `@cf/deepgram/aura-2-en` speaker
`luna`, Spanish `@cf/deepgram/aura-2-es`), then uploaded to R2:

`CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/generate-audio.mjs [en|es|de|fr|th|zh] [NNN]`

The script skips existing files; delete a clip to re-take it. Every clip
should score green when fed back through `POST /api/score`
(`scripts/qa-audio.mjs`) — a clip the scorer mishears will unfairly
penalize learners. Residual sub-green clips are documented in the
content repo's `content/tts-overrides.mjs` when the default voice
scores the same on that phrase (sentence-level cap, not a voice defect).

Spanish has three voices, played at random per listen, never the same
clip twice in a row when a choice exists: `aquila` (male, default),
plus `diana` and `celeste` (both female, rolled out 2026-10-16
replacing `alvaro`). Diana and Celeste were generated at 85% speed:
the provider silently ignores its `speed` parameter, so a
pitch-preserving `ffmpeg -filter:a atempo=0.85` stretch is baked into
each file. Audition candidate voices before rollout on the unlisted
`/voice-preview` page.

## Lesson images

Images are generated once with Muse Image 1.0 (`muse-image-1.0`) and
uploaded to R2 with the rest of the lesson media:

`MODEL_API_KEY=... node scripts/generate-images-muse.mjs [01|02]`

(Cloudflare Phoenix script kept as `scripts/generate-images.mjs` fallback.)
The script skips existing files; delete an image to re-take it. Every image
must show exactly one person performing the labeled action — inspect each
one before deploying.

## Anonymous flow

`POST /api/auth/sign-in/anonymous` creates a guest user + session cookie with
no PII. The client can later link Google via the normal social sign-in, which
attaches the OAuth account to the same user.
