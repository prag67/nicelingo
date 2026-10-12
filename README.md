# Nicelingo — auth skeleton

Hono + Better Auth on Cloudflare Workers, with D1 (SQLite) storage, Google
social login, and anonymous try-before-signup sessions for kids.

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
- `GET|POST /api/auth/*` — Better Auth (Google, anonymous, session)
- `GET /api/me` — current session user, 401 when signed out
- `GET /api/lessons/01` — Lesson 1 manifest (phrases, asset URLs, activities)
- `POST /api/score` — `{ phraseId, audio }` (base64) → `{ score, verdict }`
- `GET|POST /api/progress` — per-activity completion, strict order, auth required

Run `npm test` (Vitest) and `npm run typecheck` before pushing.

## Lesson audio

Clips are generated once with Workers AI and served as static files from
`public/` — English `@cf/deepgram/aura-2-en` speaker `luna`, Spanish
`@cf/deepgram/aura-2-es` speaker `aquila`:

`CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... node scripts/generate-audio.mjs [en|es] [01|02]`

The script skips existing files; delete a clip to re-take it. Every clip
should score green when fed back through `POST /api/score` — a clip Whisper
mishears will unfairly penalize learners.

## Lesson images

Images are generated once with Muse Image 1.0 (`muse-image-1.0`) and served
as static files from `public/`:

`MODEL_API_KEY=... node scripts/generate-images-muse.mjs [01|02]`

(Cloudflare Phoenix script kept as `scripts/generate-images.mjs` fallback.)
The script skips existing files; delete an image to re-take it. Every image
must show exactly one person performing the labeled action — inspect each
one before deploying.

## Anonymous flow

`POST /api/auth/sign-in/anonymous` creates a guest user + session cookie with
no PII. The client can later link Google via the normal social sign-in, which
attaches the OAuth account to the same user.
