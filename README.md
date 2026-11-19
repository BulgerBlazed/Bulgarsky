# Zdravei — Bulgarian from zero

A Duolingo-style PWA for learning Bulgarian from absolute zero (CEFR A1 → early A2),
with instructions in **English** or **Hebrew (עברית, RTL)**. No backend and no login:
progress is stored on the device.

> ⚠️ All lesson content is an **AI-generated draft** awaiting native-speaker review.
> See [`content/REVIEW.md`](content/REVIEW.md).

## Features

- Learning path of 12 units. **Units 1–4 are populated** (20 lessons plus 4 checkpoints); Units 5–12 appear as "coming soon" and the schema is ready for them.
- Units unlock in order, each ending in a checkpoint test (pass mark set per unit). A placement test lets learners skip the alphabet units.
- Ten exercise types: multiple choice (BG↔EN/HE), listen-and-pick, listen-and-type, typed translation (typo-tolerant), word bank, matching pairs, letter↔sound, fill-in-the-blank, and speaking (record + **self-assessed**).
- On-screen Cyrillic keyboard, plus optional phonetic typing on a Latin keyboard (a→а, w→в, y→ъ, q→я…).
- Grammar tip cards before lessons that introduce a rule. Stress marks on new words (до́бър). Latin transliteration toggle, plus an optional Hebrew-letter transliteration (off by default).
- SM-2 spaced repetition per word, wrong answers re-queued in the same lesson, a Practice session built from due words, and a per-lesson strength meter that decays over time.
- XP, daily streak with streak freezes, daily goal (5/10/20 min). The hearts (mistake limit) toggle is **off by default**.
- Progress screen: words learned, accuracy per unit, streak calendar, weakest words. A cheat sheet with audio for each unit.
- Full i18n with separate string files. Hebrew flips the whole layout (`dir="rtl"`) while Bulgarian text is always isolated as LTR.
- Accessible: WCAG-AA colour contrast, visible focus, screen-reader labels, feedback that never relies on colour alone, keyboard shortcuts.

**Keyboard shortcuts (desktop):** `Enter` = check / continue · `1`–`9` = pick an option or tile · `Backspace` = remove the last tile.

## Setup

Requires Node.js 20+ (developed with Node 26).

```powershell
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests (Vitest)
npm run validate   # validate /content only
npm run build      # type-check + validate content + production build (dist/)
npm run preview    # serve the production build
```

`npm run dev` and `npm run build` both validate every file in `/content` first.
**A malformed entry fails the build** and the error message names the file, the path and the problem.

## Project structure

```
content/                    ← all course content (JSON), separate from UI code
  course.json               unit order, titles, ready/planned status
  units/<dir>/unit.json     items (vocabulary), grammar tips, lesson order, checkpoint
  units/<dir>/<lesson>.json one lesson: tips, newItems, 10–15 exercises
  REVIEW.md                 native-speaker review checklist
src/
  content/schema.ts         Zod schema (the single source of truth for the JSON)
  content/validate.ts       schema + cross-reference validation (used at build time)
  content/course.ts         runtime loader / lookups
  engine/srs.ts             SM-2 scheduler, recall probability, strength
  engine/answerMatch.ts     normalisation + typo-tolerant answer matching
  engine/session.ts         lesson queue (re-queue wrong answers, hearts, accuracy)
  engine/streak.ts          streak + freezes
  engine/exercises.ts       resolves exercises, auto-distractors, practice/checkpoint/placement
  audio/audio.ts            pluggable audio (Web Speech + recorded files)
  storage/storage.ts        KeyValueStore interface (localStorage implementation)
  state/store.ts            Zustand store (settings + progress), persisted via the storage interface
  i18n/en.json, he.json     UI strings, one file per language
  exercises/                one component per exercise type
  screens/                  path, session, results, practice, profile, settings, cheat sheet, onboarding
scripts/                    content validation plugin, icon generator
tests/                      Vitest tests
```

## Content model

Each **item** stores the Cyrillic form, a stress-marked form, English and Hebrew translations,
a Latin transliteration, an optional Hebrew-letter transliteration, and accepted answers for
each language:

```json
{
  "id": "u3.ne-blagodarya",
  "kind": "sentence",
  "bg": "Не, благодаря.",
  "stressed": "Не, благодаря́.",
  "translit": "Ne, blagodaryá.",
  "translitHe": "נֶה, בְּלַגוֹדַרְיָה.",
  "en": "No, thank you.",
  "he": "לא, תודה.",
  "accept": {
    "en": ["No, thank you.", "No, thanks."],
    "he": ["לא, תודה."],
    "bg": ["Не, благодаря.", "Не, мерси."]
  }
}
```

Stress is marked with **U+0301 COMBINING ACUTE ACCENT** after the stressed vowel. The validator
checks that `stressed` with the marks removed equals `bg` exactly.

Optional item fields: `note` ({en, he} usage note), `say` (text sent to TTS instead of `bg`; used
for single letters, e.g. `"бъ"`), and `audio` (a recorded file, see below).

### Exercise types (in lesson JSON)

| type | fields | notes |
|---|---|---|
| `mc` | `item`, `dir: toL1 \| toBg`, `options?` | options are item ids; auto-picked if omitted |
| `listenPick` | `item`, `options?` | hear Bulgarian, pick the text |
| `listenType` | `item` | type what you hear (Cyrillic) |
| `translate` | `item`, `dir` | free typing, typo tolerant |
| `wordBank` | `item`, `dir`, `distractors?: {bg?, en?, he?}` | multi-word items only |
| `match` | `items` (3–5) | letters match to their sound |
| `letterSound` | `item`, `dir: letterToSound \| soundToLetter`, `options?` | letter items only |
| `fillBlank` | `before`, `after`, `answer`, `options`, `translation`, `explain` | `explain` is shown on mistakes |
| `speak` | `item` | record + self-assess; never affects SRS |

Any exercise can carry `explain: {en, he}`, a one-line explanation shown when the answer is wrong.

## How to add a lesson

1. Add the vocabulary to the unit's `unit.json` → `items` (all required fields; ids are `u<unit>.<slug>`).
2. Create `content/units/<unit dir>/<lesson id>.json`:
   ```json
   {
     "id": "u03-l6",
     "title": { "en": "…", "he": "…" },
     "tips": ["tip.some-rule"],
     "newItems": ["u3.new-word"],
     "exercises": [ /* 10–15 exercises */ ]
   }
   ```
3. Add the lesson id to `lessons` in `unit.json` (a unit holds 4–6 lessons; order = path order).
4. If the lesson introduces a rule, add a tip to the unit's `tips` (with `body.en` and `body.he`
   paragraphs written natively in each language) and reference it in the lesson's `tips`.
5. Run `npm run validate`. It reports unknown ids, missing translations, bad stress forms,
   answers missing from `options`, items never introduced, and similar problems.

**To add a whole unit:** create `content/units/<dir>/unit.json` and its lessons, then set the
unit's `status` to `"ready"` in `content/course.json`.

## How to swap in recorded audio

Audio goes through the `AudioProvider` interface in `src/audio/audio.ts`. The default `HybridAudio`
plays a recorded file when the item has one and falls back to Web Speech TTS (`bg-BG`) otherwise.

1. Put the files in `public/audio/`, for example `public/audio/u3/blagodarya.mp3`.
2. Reference them from the item: `"audio": "u3/blagodarya.mp3"`.
3. That's it: the file is played everywhere the item is spoken (prompts, speaker buttons, cheat sheet),
   and it is cached for offline use by the service worker.

To replace TTS entirely (for example with a cloud TTS or an audio sprite), implement `AudioProvider`
(`init`, `play`, `stop`) and export it as `audio` from `src/audio/audio.ts`.

If the browser has no Bulgarian voice, the app shows a clear warning and the listening exercises
offer "Can't listen now". Microsoft Edge ships online Bulgarian voices. On Windows you can add one
under *Settings → Time & language → Speech*.

## How to add a UI language

1. Copy `src/i18n/en.json` to `src/i18n/<code>.json` and translate every value (keep the `{placeholders}`;
   optional `*.one` keys hold singular forms).
2. Register it in `src/i18n/i18n.ts` (`STRINGS` and `DIR`: `'ltr'` or `'rtl'`).
3. Add the code to `UI_LANGS` in `src/content/schema.ts`. The schema then **requires** that language in
   every `L10nSchema` field (titles, tips, explanations), every item, and every `accept` list, so
   `npm run validate` lists everything that still needs translating.
4. Add the language option to `src/screens/SettingsScreen.tsx` and `OnboardingScreen.tsx`.
5. `tests/i18n.test.ts` checks that every key exists in every language.

## Storage

All state goes through `KeyValueStore` (`src/storage/storage.ts`); the current implementation uses
`localStorage` (prefix `zdravei:`). To move to IndexedDB, implement the same three methods
(`getItem`/`setItem`/`removeItem`, sync or async) and export it as `appStore`.

## Bidirectional text

- `<html dir>` follows the UI language. Layout uses logical properties (`ms-`/`me-`/`start-`/`end-`),
  so progress bars, arrows, the path zig-zag and tile order flip automatically.
- **Bulgarian is always LTR.** `<Bg>` renders `<bdi dir="ltr" lang="bg">`, and `<MixedText>` finds Cyrillic
  runs inside Hebrew or English text and isolates them. Comma-separated phrases and a trailing `?`/`!`
  stay inside one run, so «Не, благодаря́» never flips.
- Covered by `tests/bidi.test.tsx`.

## Tests

`npm test` runs:

- `tests/srs.test.ts`: SM-2 intervals, EF bounds, lapses, recall decay, due picking
- `tests/answerMatch.test.ts`: normalisation (stress, case, punctuation, niqqud, Latin look-alikes), typo tolerance, contractions, word-bank matching
- `tests/streakSession.test.ts`: streak + freezes, in-lesson re-queue, hearts, accuracy
- `tests/content.test.ts`: the real content is valid, and malformed content is rejected
- `tests/i18n.test.ts`: the string files have the same keys and placeholders
- `tests/bidi.test.tsx`: Cyrillic isolation in RTL text, word-bank tile direction

## Design

The main screens (path, lesson, results, profile) were designed first in Google Stitch
(project "Bulgarian Learning App (Zdravei)") with the *Zdravei Playful* design system: Rubik (covers
Latin, Cyrillic and Hebrew) and Bulgarian-flag green/red with an amber accent. The colours were
darkened slightly in `src/index.css` to meet WCAG-AA contrast.
