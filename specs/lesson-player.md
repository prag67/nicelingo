# Nicelingo Lesson Player — Spec

Playable Lesson 1 in the browser. Single page, no framework, vanilla JS.
Anonymous session by default; registers nothing.

## Route

- `GET /lesson/01` → HTML page + `lesson.js` (static JS).

## Flow (mirrors lesson-01.md activity order)

1. On load: fetch manifest, ensure session (`POST /api/auth/sign-in/anonymous`
   if `/api/me` is 401), fetch progress, resume at first incomplete activity.
2. **listen-match**: play phrase audio, show 4 images, tap the match.
   Wrong tap replays and retries. 4 rounds covering all 8 phrases.
3. **image-phrase**: show image, show 4 written phrases, tap the match.
   4 rounds. Retry on miss.
4. **speak-score**: show image + phrase, big mic button records one attempt,
   posts audio to `/api/score`, shows red/yellow/green. Green advances;
   after 3 attempts advances anyway (flagged). 4 rounds.
5. **read-write**: play phrase, text input for the missing word
   (`The boy is ______.`). 2 rounds. Retry on miss.
6. On each activity completion: `POST /api/progress`. Lesson complete screen
   at the end.

## Rules

- No translation or grammar text anywhere on screen.
- All choices must be tappable on a small phone screen (min 48px targets).
- Recording errors (no mic, denied permission) show a retry message, never
  a dead button.
- Audio recorded as MediaRecorder default (webm/opus), base64 to `/api/score`.

## Visual design bar

Kid-friendly Duolingo-grade polish, not a wireframe: warm color system,
rounded chunky controls, clear activity progress, celebratory completion
moments, smooth state transitions honoring `prefers-reduced-motion`.
Big touch targets (min 56px for primary actions). Must look intentional
on a 360px phone and a desktop.

## Non-goals (this slice)

- Service worker / offline mode (spec wants it later; flagged as next).
- Other lessons, milestones, adaptive difficulty.

## Acceptance criteria

- [ ] Full lesson completable end to end in a desktop browser.
- [ ] Refresh mid-lesson resumes at the first incomplete activity.
- [ ] No-mic and denied-mic states show a retry message.
