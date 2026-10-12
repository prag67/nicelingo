# Brief: split Nicelingo's home into a language picker and a per-language course page

Status: APPROVED — build it. Handoff notes at the bottom resolve the two open
items and one routing conflict with the earlier `/course/:lang` plan.

## Context

Today `/` is one long list of all 240 lessons (5 levels × 12 units × 4 lessons).
Each row carries up to 5 language links (EN, ES, FR, DE, ZH) and 20 progress
dots. The page ends with a list of API endpoints. A learner studies one
language at a time, so language should be chosen once, one level up, and
everything below scoped to it.

## Routes

- `/` is the language picker.
- `/{lang}` is the course home for one language (e.g. `/es`), with `?level=N`
  to deep-link a level.
- `/lesson/{lang}/{nnn}` and `/billing` are unchanged.
- `/developers` holds the API endpoint list, linked from the footer only.

Remember the last chosen language (on the account if signed in, otherwise a
cookie). A returning visitor to `/` is forwarded to `/{lang}`; `/?change=1`
always shows the picker.

## Screen 1: language picker (`/`)

- **Header:** wordmark on the left, sign in / account on the right.
- **Headline:** "What do you want to learn?" with the existing "see it, hear
  it, say it" line beneath.
- **Language cards:** a grid with one card per language, and the whole card is
  a link to `/{lang}`.
  - Show the language's own name large (Español) with the English name small
    beneath. No flags.
  - Show the lesson count, and a "Level 1 only" tag when the course is
    partial.
  - If the learner has started, show "12 of 240 done" and mark the card
    "Continue".
- **Pricing line:** one line under the grid, linking to `/billing`: "Lesson 1
  is free. Every lesson $3/month or $29/year."

## Screen 2: course home (`/{lang}`)

From top to bottom:

1. **Top bar:** wordmark, a language chip ("Español ▾") linking to
   `/?change=1`, a Premium button (or a "Premium" badge for subscribers), and
   account.
2. **Continue card:** the only primary button on the page. It shows the next
   unfinished lesson with its number, title, unit, and four-step progress. For
   a new learner it reads "Start Lesson 1 · Eating & Drinking · Free".
3. **Level tabs:** five tabs, "1 Beginner" to "5 Advanced", each with a
   completion count such as "8/48".
   - Only the selected level's units render.
   - Default to the level containing the next lesson.
   - Levels that don't exist in this language are disabled and labeled
     "Coming soon".
4. **Units:** each unit is a section with a header ("Unit 2 · Daily Actions",
   "1 of 4 done") and its four lesson cards in a row. Scroll the current unit
   into view on load.
5. **Upgrade strip:** for non-subscribers, one slim strip after Unit 1. Do not
   repeat it.
6. **Footer:** manage subscription, developers, sign in.

## Lesson card

The whole card is a single link showing the lesson number, title, and one
four-segment progress bar in place of the dots. Keep the number prominent,
because titles repeat across units ("Eating & Drinking" is lessons 1, 19, 26
and 33).

States:

- **Not started:** empty bar.
- **In progress:** partly filled bar, "Resume".
- **Done:** check mark, dimmed.
- **Locked:** lock icon for any lesson a non-subscriber can't open; it links
  to `/billing` and returns to this page afterwards.

## Rules

- Server-render both screens so they work without JavaScript, as the current
  home page does.
- Drive language and level availability from lesson data, not hard-coded
  lists.
- Use the lesson page's teal (`#0e7c6b`) as the single accent color.
- Design mobile first: single column, lesson cards stacked two by two, level
  tabs horizontally scrollable and sticky.
- Never signal progress by color alone; give each bar a text label ("2 of 4
  steps complete").
- For anonymous learners, show a quiet "Sign in to keep your progress" prompt
  near the Continue card.
- Create a single language registry (name, lesson count, status: complete /
  partial / hidden, covered by subscription: yes / no). The tagline, language
  picker, and billing page must all derive their language lists from it; no
  page may hard-code language names. Before changing billing copy, confirm
  which languages the paywall actually unlocks and report back if it differs
  from the registry.

## Done when

- No language codes appear on the course home except the top-bar chip.
- A returning learner reaches their next lesson in one tap from `/`.
- The course home renders at most 48 lessons at a time.
- Existing lesson URLs still work.

---

## Handoff notes (resolved before build)

### 1. Progress dots = lesson activities (confirmed from code)

Each dot tracks one activity in `manifest.activities`. Full languages have 4
(`listen-match`, `image-phrase`, `speak-score`, `read-write`); Mandarin has 3
(no `read-write`, since it splits on spaces and Chinese has none). So the
"four-segment progress bar" must be data-driven: render N segments for N
activities, with the text label using the real count ("2 of 3 steps complete"
for Mandarin). Same for the Continue card's step progress and the picker card
counts (Mandarin: "12 of 48 done", not 240).

Progress storage: `GET /api/progress/all` returns per-lesson completed
activity ids (see `public/app/player.js` `readLocalCompleted` / `api.progress`
and `lesson-flow.js` `nextIncomplete`). The course home needs the same data
server-side for SSR — check what `home.ts`/`index.ts` can reuse before
inventing a new endpoint.

### 2. Language list and copy (decision)

Data truth as of handoff:

- EN / ES / FR / DE: full 240-lesson courses with audio.
- ZH: Level 1 only (001–048) with audio; manifests exist for L1 only
  (`lessons[n].zh` absent past 048).
- TH: curriculum wired but no audio; hidden everywhere until audio lands.

Decisions:

- Picker shows EN, ES, FR, DE (full) + ZH with the "Level 1 only" tag. TH
  stays hidden with a coming-soon code comment (same as the current `n <= 48`
  ZH conditional in `home.ts`); the Mandarin/Thai session will signal when TH
  audio lands.
- Tagline keeps "see it, hear it, say it". Language names in prose copy list
  the four full languages (English, Spanish, French, German); do not name
  Chinese in the tagline while it is partial — the picker card's "Level 1
  only" tag covers it.
- `/billing` copy ("unlocks English and Spanish") is stale: update it to say
  the subscription unlocks every language on the picker, naming the four full
  ones. Keep Lesson 1 free in every language (existing behavior).
- `/{lang}` for unknown langs (e.g. `/th` today) 404s via the existing
  data-driven route guard pattern.

### 3. Route decision: `/{lang}` (overrides `/course/:lang`)

This brief specifies `/{lang}`, not the `/course/:lang` from the earlier
scope. Implement `/{lang}`.

Routing caution: `/:lang` is a single-segment route on a router that already
serves `/billing`, `/health`, `/developers` (new), and `/lesson/...`. Either
register it AFTER all specific single-segment routes, or constrain the param
(e.g. `:lang{[a-z]{2}}` — all language codes are 2 letters, none of the fixed
routes are). Keep `/lesson/:lang/:lesson` and legacy `/lesson/01|02`
untouched; add regression coverage that `/billing` and `/health` still resolve
(the existing suite has route tests — extend, don't replace).

### 4. Tests to update

`tests/home.test.ts` asserts the OLD homepage (per-row `/lesson/de/...` links,
no `/lesson/zh/049`). It must be rewritten for the picker: language cards,
counts, ZH "Level 1 only", no per-lesson rows. Add course-home tests per
"Done when" (one-tap continue, ≤48 lessons rendered, deep-linkable `?level=`).
