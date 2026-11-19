/**
 * Content schema for the course. Every JSON file under /content is validated
 * against these schemas at build time (see scripts/contentPlugin.ts) and the
 * build fails on any malformed entry.
 */
import { z } from 'zod';

export const UI_LANGS = ['en', 'he'] as const;
export type UiLang = (typeof UI_LANGS)[number];

/** U+0301 COMBINING ACUTE ACCENT — the only character used to mark stress. */
export const STRESS_MARK = '́';

/** Removes stress marks only (keeps ѝ, й etc. intact). */
export function stripStress(s: string): string {
  return s.normalize('NFD').replace(/́/g, '').normalize('NFC');
}

const CYRILLIC = /[Ѐ-ӿ]/;

export const IdSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/, 'ids use lowercase a-z, 0-9, separated by "." or "-"');

/** A string written natively in every instruction language. */
export const L10nSchema = z.object({ en: z.string().min(1), he: z.string().min(1) }).strict();
export type L10n = z.infer<typeof L10nSchema>;

const nonEmpty = z.array(z.string().min(1)).min(1);

export const ItemSchema = z
  .object({
    id: IdSchema,
    /** letter = alphabet card; word/phrase/sentence = vocabulary. */
    kind: z.enum(['letter', 'word', 'phrase', 'sentence']),
    /** Plain Cyrillic, no stress marks. */
    bg: z.string().min(1).refine((s) => CYRILLIC.test(s), 'bg must contain Cyrillic'),
    /** Same text with U+0301 on the stressed vowel of every multi-syllable word. */
    stressed: z.string().min(1),
    /** Latin transliteration (Streamlined System, with stress shown as á). */
    translit: z.string().min(1),
    /** Optional Hebrew-letter transliteration (off by default in the UI). */
    translitHe: z.string().min(1).optional(),
    en: z.string().min(1),
    he: z.string().min(1),
    /** Accepted answers when translating INTO each language. */
    accept: z
      .object({ en: nonEmpty, he: nonEmpty, bg: nonEmpty.optional() })
      .strict(),
    /** Short usage note shown in feedback and the cheat sheet. */
    note: L10nSchema.optional(),
    /** Text sent to text-to-speech instead of `bg` (e.g. "бъ" for the letter Б). */
    say: z.string().min(1).optional(),
    /** Recorded audio file under /public/audio (overrides text-to-speech). */
    audio: z.string().optional(),
  })
  .strict()
  .superRefine((it, ctx) => {
    if (stripStress(it.stressed) !== it.bg.normalize('NFC')) {
      ctx.addIssue({
        code: 'custom',
        path: ['stressed'],
        message: `stressed form "${it.stressed}" does not match bg "${it.bg}" once stress marks are removed`,
      });
    }
  });
export type Item = z.infer<typeof ItemSchema>;

export const TipSchema = z
  .object({
    id: IdSchema,
    title: L10nSchema,
    /** Paragraphs, written natively per language (not machine-translated). */
    body: z.object({ en: nonEmpty, he: nonEmpty }).strict(),
    examples: z.array(IdSchema).optional(),
  })
  .strict();
export type Tip = z.infer<typeof TipSchema>;

const Dir = z.enum(['toL1', 'toBg']);
const explain = L10nSchema.optional();
const options = z.array(IdSchema).min(2).max(4).optional();

export const ExerciseSchema = z.discriminatedUnion('type', [
  /** Multiple choice between Bulgarian and the instruction language. */
  z.object({ type: z.literal('mc'), item: IdSchema, dir: Dir, options, explain }).strict(),
  /** Hear Bulgarian, pick the matching text. */
  z.object({ type: z.literal('listenPick'), item: IdSchema, options, explain }).strict(),
  /** Hear Bulgarian, type it in Cyrillic. */
  z.object({ type: z.literal('listenType'), item: IdSchema, explain }).strict(),
  /** Free-typed translation (typo tolerant). */
  z.object({ type: z.literal('translate'), item: IdSchema, dir: Dir, explain }).strict(),
  /** Build a sentence from tiles. */
  z
    .object({
      type: z.literal('wordBank'),
      item: IdSchema,
      dir: Dir,
      distractors: z
        .object({ bg: z.array(z.string()).optional(), en: z.array(z.string()).optional(), he: z.array(z.string()).optional() })
        .strict()
        .optional(),
      explain,
    })
    .strict(),
  /** Tap matching pairs. */
  z.object({ type: z.literal('match'), items: z.array(IdSchema).min(3).max(5), explain }).strict(),
  /** Letter ↔ sound recognition. */
  z
    .object({
      type: z.literal('letterSound'),
      item: IdSchema,
      dir: z.enum(['letterToSound', 'soundToLetter']),
      options,
      explain,
    })
    .strict(),
  /** Choose the word that fills the gap: `before` + answer + `after`. */
  z
    .object({
      type: z.literal('fillBlank'),
      before: z.string(),
      after: z.string(),
      answer: z.string().min(1),
      options: z.array(z.string().min(1)).min(2).max(4),
      translation: L10nSchema,
      explain: L10nSchema,
    })
    .strict(),
  /** Record yourself and self-assess. */
  z.object({ type: z.literal('speak'), item: IdSchema, explain }).strict(),
]);
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseType = Exercise['type'];

export const LessonSchema = z
  .object({
    id: IdSchema,
    title: L10nSchema,
    /** Grammar tip cards shown before the lesson starts. */
    tips: z.array(IdSchema).optional(),
    /** Items introduced in this lesson (feed SRS + strength meter). */
    newItems: z.array(IdSchema).min(1),
    exercises: z.array(ExerciseSchema).min(10).max(15),
  })
  .strict();
export type Lesson = z.infer<typeof LessonSchema>;

export const UnitSchema = z
  .object({
    id: IdSchema,
    number: z.number().int().min(1),
    title: L10nSchema,
    description: L10nSchema,
    /** True for the alphabet units the placement test can skip. */
    alphabet: z.boolean().optional(),
    items: z.array(ItemSchema),
    tips: z.array(TipSchema),
    /** Lesson ids in order; each maps to `<unit dir>/<lesson id>.json`. */
    lessons: z.array(IdSchema).min(1).max(6),
    checkpoint: z
      .object({ count: z.number().int().min(8).max(20), passPercent: z.number().min(50).max(100) })
      .strict(),
  })
  .strict();
export type Unit = z.infer<typeof UnitSchema>;

export const CourseSchema = z
  .object({
    id: IdSchema,
    units: z.array(
      z
        .object({
          dir: z.string().min(1),
          number: z.number().int().min(1),
          title: L10nSchema,
          /** "planned" units appear on the path as "coming soon". */
          status: z.enum(['ready', 'planned']),
        })
        .strict(),
    ),
  })
  .strict();
export type Course = z.infer<typeof CourseSchema>;
