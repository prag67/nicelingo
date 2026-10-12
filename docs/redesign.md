# Nicelingo redesign brief

Goal: make Nicelingo look and behave like a product people will pay for, and feel fun to use. The page structure (language picker, then a per-language course home) is already live. This brief covers the visual redesign, the missing imagery, and a short list of bugs to fix first.

## How to use this bundle

| File | What it is |
| --- | --- |
| `redesign.md` | This brief. It decides **behavior**: routes, states, rules, acceptance checks. |
| `screens/picker.html` | Language picker, desktop, first-time visitor. |
| `screens/course-new-visitor.html` | Course home, desktop, visitor who has not started. |
| `screens/course-free-lesson-done.html` | Course home, desktop, visitor who finished the free lesson. |
| `screens/course-subscriber.html` | Course home, desktop, subscriber part-way through lesson 3. |
| `screens/picker-phone.html` | Language picker at 390px, returning learner. |
| `screens/course-phone.html` | Course home at 390px, subscriber (first two units only). |
| `logo/parrot-mark.svg` | The logo: a parrot head. Use it in the header beside the wordmark. Also as `parrot-mark-512.png` with a transparent background. |
| `logo/favicon.svg` | Simplified head for browser tabs. Also as `favicon-32.png` and `favicon-16.png`. |
| `logo/app-icon.svg` | Square app icon on the dark ink background. Also as `app-icon-512.png`, `app-icon-192.png` and `apple-touch-icon.png` (180px). |

The HTML files are static reference mockups with inline styles. They decide **appearance**: layout, spacing, color, type, component shapes. Open them in a browser to see the target.

- If this brief and a mockup disagree, the brief wins on behavior and the mockup wins on appearance.
- Do not ship the mockup markup as-is. Rebuild it in the project's own templates and stylesheet, with real data.
- For phone widths, follow the two `*-phone.html` files. The desktop files reflow when narrowed, but that reflow is rougher than the phone designs (long titles truncate, the Continue card is too tall).

## Fix first

These undermine trust and should land before or with the visual work.

1. **Root route.** `/` returned the old 240-lesson list (with the API section) while `/?change=1` returned the new picker. Confirm `/` serves the picker, or forwards a returning learner to `/{lang}`.
2. **Billing copy.** `/billing` says a subscription unlocks "English and Spanish". The picker offers five languages. Make the copy come from the language registry (below).
3. **Paywall.** `GET /api/lessons/es/050` returned the full lesson manifest with no sign-in. Confirm paid lessons (manifest, audio, images) are gated server-side, and report back what the paywall actually unlocks.
4. **Locked state has no label.** On the course home, lessons 2 to 48 read "Not started" for a non-subscriber. They must show a visible "Premium" label, not only an icon.
5. **English card duplicate.** The picker card reads "English / English". Show the English name line only when it differs from the native name.
6. **Mandarin text.** The lesson manifest puts pinyin in `text` and the characters in `scoreText`. Learners should see the characters with pinyin beneath.

## Routes

- `/` language picker. A returning visitor with a remembered language is forwarded to `/{lang}`. `/?change=1` always shows the picker.
- `/{lang}` course home for one language. `?level=N` deep-links a level.
- `/lesson/{lang}/{nnn}` and `/billing` unchanged.
- `/developers` holds the API endpoint list, linked from the footer only.

## Language registry (single source of truth)

Create one registry with, per language: native name, English name, greeting word, tile color, lesson count, levels available, status (`complete` / `partial` / `hidden`), and whether a subscription covers it.

- The picker, the page title and tagline, and the billing page all read their language lists from it. No page hard-codes language names.
- Current data: English, Español, Français, Deutsch have 240 lessons (5 levels). 中文 (Mandarin) has 48 lessons (Level 1 only) and is `partial`.
- The number of steps in a lesson comes from the lesson manifest's `activities` array, not a constant. Most lessons have four (`listen-match`, `image-phrase`, `speak-score`, `read-write`); Mandarin lessons have three (no `read-write`). Progress bars and "N of M steps" text must use the real count.

## Screen 1: language picker (`/`)

Reference: `screens/picker.html`, `screens/picker-phone.html`.

Top to bottom:

1. **Header.** Logo and wordmark left, "Sign in" right.
2. **Hero.** Left: the line "See it. Hear it. Say it.", the headline "What do you want to learn?", one sentence on how lessons work, and "Lesson 1 is free, no account needed." Right: a lesson preview card showing a real lesson photo, its phrase, and "Hear it" / "Say it" buttons. "Hear it" plays that phrase's audio. "Say it" may link to lesson 1 if a live mic demo is out of scope.
3. **Choose a language.** One card per registry language; the whole card links to `/{lang}`. Each card is a solid block in that language's tile color and shows the greeting word large, the native name, the English name (when different), and the lesson count. Partial courses carry a "Level 1 only" tag.
4. **Four steps in every lesson.** Listen, Match, Speak, Write, each with an icon and one line.
5. **Pricing band.** "Lesson 1 is free. Every lesson $3/month or $29/year." with a "See plans" button to `/billing`. Hidden for subscribers.
6. **Footer.** Premium, Terms, Privacy, Contact, Developers.

Returning learner (see the phone mockup): a "Keep going" card for the language in progress, with "N of M lessons done", a progress bar and a "Continue" button, above an "Or start another" list of the remaining languages.

## Screen 2: course home (`/{lang}`)

Reference: the three `screens/course-*.html` desktop files and `screens/course-phone.html`.

Top to bottom:

1. **Top bar.** Logo; a language chip ("Español" with a chevron) linking to `/?change=1`; then for non-subscribers a "Go Premium" button and "Sign in", or for subscribers a "Premium" badge and an account button.
2. **Continue card.** The only primary button on the page. Lesson photo on the left; on the right a small label, the lesson number and title, a line of context, the lesson's steps, and the button. Content depends on the learner state (table below).
3. **Sign-in prompt.** One quiet line for anonymous learners: "Your progress is saved on this device only. Sign in to keep it". Do not repeat "Sign in" elsewhere on the page beyond the top bar.
4. **Level tabs.** One tab per level with a completion count ("1 Beginner 2/48"). Only the selected level's units render. Default to the level containing the next lesson. Levels missing in this language are disabled and read "Coming soon". On phones the row scrolls horizontally and stays pinned under the top bar.
5. **Units.** Each unit is a numbered color badge, a heading ("Unit 2 · Daily Actions"), an "N of 4 done" count, and its four lesson cards. Four across on desktop, two across on phones. Scroll the current unit into view on load.
6. **Upgrade strip.** New visitors only, once, after Unit 1.
7. **Footer.** Manage subscription, Terms, Privacy, Contact, Developers.

### Learner states

| State | Continue card | Lesson cards | Upgrade strip |
| --- | --- | --- | --- |
| New visitor | "Start here · Free", Lesson 1, button "Start lesson 1" | Lesson 1 tagged "Free"; all others "Premium" | Shown after Unit 1 |
| Finished the free lesson | "Nice work! Next up", Lesson 2, the price, button "Unlock every lesson" to `/billing` | Lesson 1 "Done"; all others "Premium" | Hidden (the Continue card is the upgrade prompt) |
| Subscriber | "Keep going!", the next unfinished lesson, steps marked done / next, button "Resume lesson N" | Done, in progress, or not started; no locks | Hidden |

### Lesson card

The whole card is one link. It shows a photo thumbnail, the lesson number, the title, a segmented progress bar (one segment per step), and a status line.

| State | Badge on photo | Progress bar | Status line |
| --- | --- | --- | --- |
| Not started | none ("Free" on a free lesson for non-subscribers) | empty | "Not started" |
| In progress | none; the card gets an ink border | filled to the step reached | "2 of 4 steps · Resume" |
| Done | "Done" with a check | full | "Done" |
| Locked | "Premium" with a lock; photo greyed | empty | "Premium"; links to `/billing` and returns here afterwards |

Keep the lesson number prominent. Titles repeat across units ("Eating & Drinking" is lessons 1, 19, 26 and 33).

## Imagery

- **Lesson thumbnails.** Each lesson manifest lists eight phrases with an `imageUrl` (for example `/static/lesson-001/images/man-eating.jpg`). Use the first phrase's image as the lesson's thumbnail and as the Continue card photo. Crop with `object-fit: cover`. Serve a resized version for the cards.
- **Picker hero.** Use lesson 1's first photo and phrase for the selected demo language.
- **Logo.** The mascot is a blue parrot head with an orange beak; files are in `logo/`. In the header, show `parrot-mark.svg` at 44px (40px on phones) to the left of the wordmark "nicelingo", which is live text in Bricolage Grotesque 800, lowercase, letter-spacing -0.02em. Do not recolor, rotate or crop the mark. On dark backgrounds use it unchanged with a white wordmark.
- **Icons to wire up.** `favicon.svg` with the 32px and 16px PNGs as fallbacks; `apple-touch-icon.png`; and a web app manifest listing `app-icon-192.png` and `app-icon-512.png`, with `theme_color` `#1A5FEB` and `background_color` `#EEF6FF`, so the site can be added to a phone's home screen.
- **Still missing.** A social share image (`og:image`, 1200 by 630) and a meta description. For the share image, use the page background, the parrot mark, the wordmark and the line "See it. Hear it. Say it."

## Design values

The palette is called Poolside: bright blue for actions, orange for Premium, and five flat "tile" colors that give each language and unit its own identity. The aim is playful, not corporate. No gradients.

Colors:

| Use | Value |
| --- | --- |
| Page background | `#EEF6FF` |
| Card surface | `#FFFFFF` |
| Ink: text, strong borders, dark band, selected tab | `#0E1B3D` |
| Secondary text | `#4C5873` (body copy on white: `#2A3757`) |
| Light border and empty progress | `#D3E2F5` |
| Blue: primary buttons, progress fill, the parrot | `#1A5FEB` with `#FFFFFF` text; button bottom edge `#0F3FAE` |
| Dark blue: links and small labels | `#1247B8` (hover `#0C3287`) |
| Orange: Premium button and lock badge | `#FF8A1F` with ink text; button bottom edge `#C96200` |
| Yellow: "Free" tag, done step chips, check marks, count on the selected tab | `#FFE066` with ink text |
| Tile colors, in order | sky `#8CC8FF`, orange `#FFB061`, mint `#7FE3C4`, yellow `#FFE066`, pink `#FF9DB5`; always with ink text |
| Secondary text on the dark band | `#C9D8F2` |
| Locked photo wash | `#E4EBF3` |

Where the tile colors go:

- **Languages.** English sky, Español orange, Français mint, Deutsch yellow, 中文 pink. Store the color in the language registry. Use it for the language's picker card and its row in the phone list.
- **Units.** Each unit heading has a small numbered badge; badges cycle through the five tile colors in order.
- **Four-steps icons.** Listen sky, Match mint, Speak orange, Write yellow.

Type:

- Headings and the wordmark: Bricolage Grotesque, weight 800, letter-spacing -0.01em to -0.03em.
- Everything else: Figtree, weights 400 to 800 (labels, buttons and lesson titles are 700 to 800). Base 16px, line-height 1.5.
- Sizes (desktop / phone): page headline 64 / 34; Continue card title 32 / 22; section headings 28; unit headings 22 / 20; lesson title 16 / 14; small labels 12 to 14.

Shape and spacing:

- Content column: max-width 1120px, 24px side padding on desktop, 16px on phones.
- Borders are 2px. Light (`#D3E2F5`) on ordinary cards and unselected tabs; ink on the hero card, the Continue card, the language chip, outline buttons, and the lesson currently in progress.
- Buttons look pressable: 52px tall (56px full-width on phones, 44px in the top bar), 16px radius, and a 4px solid bottom edge in the darker shade. On press, drop the edge to 2px and shift the button down 2px.
- Corner radius: 24px hero card, Continue card and dark band; 20px language cards; 18px lesson and step cards (16px on phones); fully rounded chips and badges.
- Every tap target at least 44px.
- Gaps: 16px between cards (12px on phones), 40px between units, 56px between page sections.
- Lesson thumbnail height: 132px desktop, 96px phone. Progress segments 8px tall, 4px radius, 4px apart.
- One soft shadow, on the hero card and Continue card only: `0 18px 40px -24px rgba(14, 27, 61, 0.5)`. Other cards have no shadow.

## Placeholders in the mockups (do not copy literally)

- **Photo blocks.** Flat pastel boxes labelled "Lesson N photo" stand in for real lesson images. The four pastels only suggest variety; they are not part of the palette.
- **Logo drawing.** The parrot is the chosen direction and is usable as-is, but it is a first drawing built from simple shapes. Keep it in one shared component so a refined version can replace it later without touching the pages.
- **Step descriptions.** The one-line explanations of Listen, Match, Speak and Write are inferred from the activity names. Check them against how each activity works and correct the copy.
- **Footer links.** Terms, Privacy and Contact pages do not exist yet. Create them or leave the links out until they do.
- **Progress numbers.** "2 of 240", "2/48" and the lesson 3 state are sample data.

## Rules

- Server-render both screens so they work without JavaScript, as the current home page does.
- Design phone-first. No horizontal page scroll at 390px.
- Never signal state by color alone. Every badge and progress bar has a text label, and each progress bar has an accessible name such as "2 of 4 steps complete".
- Use real `<a>` and `<button>` elements; icon-only buttons get an `aria-label`.
- Text contrast at least 4.5:1 (3:1 for text 24px and larger).
- Language and level availability come from data, never hard-coded lists.
- Existing lesson URLs keep working.

## Done when

- `/` shows the picker (or forwards a returning learner) and never the old lesson list.
- The course home shows no language codes except the top-bar chip, and renders at most one level (48 lessons) at a time.
- A returning learner reaches their next lesson in one tap from `/`.
- Every lesson card shows a real photo, and each of the four card states is distinguishable without color.
- A non-subscriber sees a "Premium" label on every locked lesson, and paid lesson content is not retrievable without a subscription.
- The picker, tagline and billing page list the same languages, all from the registry.
- Both screens match the mockups at 1280px and 390px wide.
- The parrot logo appears in every page header, and the favicon, app icons, share image, meta description and web app manifest are present.

## Open questions for the owner

1. Which languages does a subscription cover? (Billing says two; the picker sells five.)
2. Keep only Lesson 1 free, or make all of Unit 1 free? The mockups assume Lesson 1 only.
3. Is Mandarin staying at Level 1? If it will not grow, consider hiding it.
4. Will the site move to its own domain before taking payments? A `workers.dev` address weakens trust at checkout.
5. Unit names such as "More People" and four lessons titled "Eating & Drinking" read as filler. Rename by what the learner can say afterwards?
