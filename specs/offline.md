# Nicelingo Offline — Spec

Lesson 1 must survive losing the network after first download: the method
depends on replaying local audio/images, and the target learners are often
on spotty connections.

## What works offline

- Full lesson shell, all 4 activity screens, manifest, 8 audio clips,
  8 images — served from the service-worker cache.
- Choice + write activities fully playable; completions queued locally.
- Speak activity requires the network (Whisper scoring): offline it shows
  a "needs connection" state instead of the mic. No attempts consumed.

## Sync rules

- `POST /api/progress` calls made offline are appended to a pending queue
  (localStorage). Queue flushes in order on `online` event and on boot.
- Flush stops at the first failure and retries later (server order-gating
  makes order matter; never reorder or drop).
- A small offline banner shows while `navigator.onLine` is false:
  "Offline — your progress will sync."

## Service worker

- `public/sw.js`, registered from the player. Cache name versioned
  (`nicelingo-v1`); old caches deleted on activate.
- Precache on install: page shell route (`/lesson/01`), CSS, JS modules,
  manifest JSON, all audio + image URLs from the manifest.
- Strategy: cache-first for `/static/*` and `/app/*`; network-first with
  cache fallback for `/api/lessons/01`; network-only for auth/score/progress.
- Scope: same-origin only. No cross-origin caching.

## Non-goals

- Offline scoring (needs Whisper; explicitly out).
- Background sync API (online/boot flush is enough).
- iOS standalone install prompts.

## Acceptance criteria

- [x] Airplane test: load lesson once, kill server, reload → lesson renders
  with images and plays audio from cache.
- [ ] Choice activity completable offline; progress syncs on reconnect.
  (Render + cached audio proven; tap-through needs a real browser walkthrough.
  Flush order itself is unit-tested.)
- [x] Speak screen offline shows needs-connection state, mic hidden.
- [x] Reconnect flush preserves completion order.
