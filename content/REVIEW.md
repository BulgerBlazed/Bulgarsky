# Content review — AI-generated draft

> **Status: DRAFT. Everything in `/content` (Bulgarian, English and Hebrew) was
> written by an AI model and has not yet been checked by native speakers.**
> Do not treat it as authoritative until each checklist below is signed off.

Scope of this review: `course.json` and Units 1–4
(`units/u01-cyrillic-1`, `u02-cyrillic-2`, `u03-greetings`, `u04-introductions`),
plus the UI strings in `src/i18n/en.json` and `src/i18n/he.json`.

Review the three languages **separately** — ideally three different people.
Tick items as you go, and record your name and date at the bottom of each section.
To find text quickly, search the JSON for the item `id` (for example `u3.molya`).

---

## 1. Bulgarian (native Bulgarian speaker)

### Words, phrases and sentences
- [ ] Every `bg` is natural, current, high-frequency Bulgarian (no Russianisms, no calques).
- [ ] Spelling, capitalisation and punctuation follow the official orthography (Правописен речник на БАН).
- [ ] Register is right: informal ти vs polite Вие forms are labelled correctly (`u3.zdravey` / `u3.zdraveyte`, `u3.kak-si` / `u3.kak-ste`, `u4.kak-se-kazvash` / `u4.kak-se-kazvate`).
- [ ] `здра́сти`, `ча́о`, `ме́рси` are acceptable as colloquial forms and are labelled as casual.
- [ ] `accept.bg` lists contain every common correct alternative (e.g. word-order variants like *Мария съм.*, *От Израел съм.*) and nothing incorrect.

### Stress (`stressed` field — U+0301 on the stressed vowel)
- [ ] Stress is correct on every multi-syllable word, especially: здраве́й, добро́ у́тро, до́бър ве́чер, дови́ждане, благодаря́, извине́те, съжаля́вам, ня́ма пробле́м, наздра́ве, ка́зваш, Прия́тно, Откъде́, Изра́ел, Аме́рика, А́нглия, Бълга́рия, Со́фия, студе́нтка, шофьо́р, я́бълка, любо́в, си́рене.
- [ ] Monosyllables carry no mark (да, не, ден, нощ, аз, ти, той, тя, от, път, хляб…).
- [ ] The stress-minimal-pair example in `tip.stress` (въ́лна "wave" / вълна́ "wool") is correct.

### Transliteration (`translit`)
- [ ] Consistent scheme: Streamlined System, except ъ → **ă** (learner-friendly) and stress shown with an acute (á, é…).
- [ ] щ → sht, ж → zh, ц → ts, ч → ch, ш → sh, ю → yu, я → ya, й → y, ьо → yo.

### Grammar tips (Bulgarian examples inside)
- [ ] `tip.headshake` — the description of the nod/shake reversal and of current usage is accurate.
- [ ] `tip.to-be` — "pronoun can drop, verb can't" is stated correctly; examples are natural.
- [ ] `tip.no-cases` — explanation of lost case system; ми in *Приятно ми е* described correctly.
- [ ] `tip.postfixed-article` — endings -ът/-а, -та, -то, -те described correctly for a preview.
- [ ] `tip.kazvam-se`, `tip.gender-ka`, `tip.false-friends`, `tip.greek-letters`, `tip.hushing`, `tip.er-golyam`, `tip.italic-t` — Bulgarian facts are correct.

### Exercises
- [ ] Every `fillBlank` has exactly one correct option (the deliberately wrong "Russian-looking" endings *Бълга́рии / Бълга́рию* in `u04-l5` are clearly wrong for Bulgarian).
- [ ] `wordBank` distractors cannot also form a correct sentence.
- [ ] Letter descriptions and `say` strings (used for text-to-speech of single letters, e.g. "бъ", "ай", "ьо") produce sensible audio.

Reviewer: ____________________  Date: __________

---

## 2. English (native English speaker)

- [ ] Every `en` translation is natural and accurately reflects the Bulgarian (including register notes like "(to a friend)", "(polite)").
- [ ] `accept.en` lists include the common correct answers learners will type (contractions are handled automatically: *I'm* = *I am*).
- [ ] No accepted answer is actually wrong or misleading.
- [ ] Grammar tips (`body.en`) are clear, friendly and short; no machine-translation feel.
- [ ] `explain.en` one-liners on exercises are accurate and understandable to a beginner.
- [ ] UI strings in `src/i18n/en.json` are consistent in tone and terminology.

Reviewer: ____________________  Date: __________

---

## 3. Hebrew (native Hebrew speaker)

- [ ] Every `he` translation is natural Israeli Hebrew and matches the Bulgarian meaning and register.
- [ ] Gendered translations show both forms where needed (אתה / את, מצטער / מצטערת, סטודנט / סטודנטית).
- [ ] `accept.he` lists cover common correct answers (with and without ניקוד, with or without final punctuation) and both genders where relevant.
- [ ] Grammar tips (`body.he`) read as written natively in Hebrew, not translated. Check especially the Hebrew–Bulgarian contrasts:
  - [ ] Definite article: Hebrew ה־ is a prefix, Bulgarian -та/-то/-ът is a suffix (`tip.postfixed-article`).
  - [ ] No cases in Bulgarian — like Hebrew (`tip.no-cases`).
  - [ ] "To be" can't be dropped in the Bulgarian present, unlike Hebrew *אני מריה* (`tip.to-be`, `tip.how-are-you`).
- [ ] Optional Hebrew-letter transliterations (`translitHe`) are readable and consistent. Conventions used: в→ו, б→בּ, ж→ז׳, ч→צ׳, ц→צ, х→ח, ш→ש, щ→שט, ъ→שווא (approximation — Hebrew has no exact equivalent).
- [ ] UI strings in `src/i18n/he.json` use consistent plural/imperative forms (currently plural imperative: "הקלידו", "בחרו") and gender-inclusive wording where needed.
- [ ] Mixed Hebrew + Cyrillic text renders correctly in the app (no flipped punctuation or word order) — check tip cards, feedback lines and the cheat sheet in the Hebrew UI.

Reviewer: ____________________  Date: __________

---

## After review

1. Fix issues directly in the JSON files (run `npm run validate` after each edit — the build fails on malformed entries).
2. Update this file: tick boxes, add reviewer names and dates.
3. When all three sections are signed off, change the status line at the top to **REVIEWED** and remove the "AI-generated draft" note in `settings.about` (both UI languages).
