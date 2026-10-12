# Nicelingo Lesson 01 — Spec

First lesson of Level 1. Rosetta-style Dynamic Immersion: no translation,
meaning through images and audio only. L1-agnostic by design — works for any
learner regardless of first language.

## Learner

- Absolute beginner, child-friendly but usable by adults.
- No account required: anonymous session is enough to complete the lesson.
- Offline-first: all lesson assets are static files playable with no network
  after first download.

## Vocabulary (fixed set)

- Nouns: man, woman, boy, girl
- Verbs (present continuous): eating, drinking
- Pattern: `The {noun} is {verb}.` → 8 phrases total.

No other words appear in this lesson. No grammar explanation anywhere.

## Assets (pre-generated, stored as static files)

- 8 audio clips (one per phrase), native-speaker TTS, MP3.
- 8 images (one per noun×verb combination), sourced photography, consistent
  style. One image shows exactly one combination, no extra people.
- `lesson-01.json` manifest: phrase list, asset URLs, content hashes.

Generation is a one-time build cost. Replays are plain file downloads.

## Activity sequence (fixed order, must complete in order)

1. **Listen & match.** Hear a phrase, pick the matching image from 4 options.
   4 rounds, all 8 phrases covered across rounds. Pass: 4/4 (retry on miss).
2. **Image → phrase.** See an image, pick the matching written phrase from
   4 options. 4 rounds. Pass: 4/4 (retry on miss).
3. **Speak & score.** See an image + phrase, say the phrase aloud, get a
   red / yellow / green verdict per attempt. 4 rounds (one per noun, verbs
   alternating). Advance per round: green, or 3 attempts (flagged for
   remedial in a later lesson).
4. **Read & write.** Hear a phrase, type the missing word
   (`The boy is ______.`). 2 rounds. Pass: 2/2 (retry on miss).

Lesson complete when all 4 activities are done. Progress stored per user
(anonymous or registered).

## Scoring contract

- Each speaking attempt returns a score 0–100 plus the verdict:
  - green: score ≥ 85
  - yellow: 60–84
  - red: < 60
- Pronunciation is judged by Clef (`clef-omni`, `src/lib/judge.ts`) from
  the learner audio directly: correct → 100/green, minor slip (or
  low-confidence correct) → 70/yellow, wrong → 0/red. Whisper
  transcript scoring is the fallback when Clef is unavailable or fails.
- Clef verdicts are model judgments, not deterministic string compares;
  the score bands above remain the product contract.

## API surface (this lesson only)

- `GET /api/lessons/01` → manifest (phrases, asset URLs, activity order).
- `POST /api/score` → `{ phraseId, audio }` → `{ score, verdict }`.
- `GET/POST /api/progress` → read/record per-activity completion.

## Non-goals (this lesson)

- No adaptive difficulty, no remedial engine (rounds just flag retries).
- No free conversation or LLM layer.
- No generated images at request time; no per-user inference except scoring.
- No grammar notes, no translations, no L1-specific content.

## Acceptance criteria

- [x] Manifest serves all 8 phrases with working audio + image URLs.
- [ ] Activities unlock strictly in order; completion recorded per user.
- [ ] Speaking attempt returns score + correct verdict per thresholds.
- [ ] Same audio input always yields the same verdict.
- [ ] Full lesson completable in an anonymous session, offline after download.
