/**
 * Turns authored exercise JSON into render-ready models (choices, tiles,
 * accepted answers), and generates sessions for practice, checkpoints and
 * the placement test.
 */
import type { Exercise, Item, UiLang, L10n } from '../content/schema';
import { allItems, findItem, getItem, itemsKnownBy, lessonsOf, unitOfItem, units } from '../content/course';

export type Rng = () => number;

export function shuffle<T>(arr: T[], rng: Rng = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** What is shown as the question. */
export type Prompt =
  | { type: 'bg'; item: Item } // Bulgarian text (with speaker)
  | { type: 'l1'; item: Item } // instruction-language text
  | { type: 'audio'; item: Item } // audio only
  | { type: 'letter'; item: Item } // a big Cyrillic letter (with speaker)
  | { type: 'sound'; item: Item }; // a sound (audio + transliteration)

/** How each option is shown. */
export type ChoiceView = 'bg' | 'l1' | 'translit' | 'letter';

export type Resolved =
  | { kind: 'choice'; ex: Exercise; prompt: Prompt; view: ChoiceView; choices: Item[]; answer: Item; titleKey: string }
  | { kind: 'text'; ex: Exercise; prompt: Prompt; lang: 'bg' | UiLang; accepted: string[]; answer: Item; titleKey: string }
  | { kind: 'tiles'; ex: Exercise; prompt: Prompt; lang: 'bg' | UiLang; tiles: string[]; accepted: string[]; answer: Item; titleKey: string }
  | { kind: 'match'; ex: Exercise; items: Item[]; rightView: 'l1' | 'translit'; titleKey: string }
  | { kind: 'fill'; ex: Exercise; before: string; after: string; options: string[]; answer: string; translation: L10n; titleKey: string }
  | { kind: 'speak'; ex: Exercise; item: Item; titleKey: string };

const isLetter = (it: Item) => it.kind === 'letter';

/** Primary display text in the instruction language. */
export const l1Text = (it: Item, lang: UiLang) => it[lang];

function pickDistractors(item: Item, lang: UiLang, contextLessonId: string | undefined, n: number, rng: Rng): Item[] {
  const sameGroup = (c: Item) => isLetter(c) === isLetter(item) && c.id !== item.id && c.bg !== item.bg && c[lang] !== item[lang];
  const known = contextLessonId ? itemsKnownBy(contextLessonId).filter(sameGroup) : [];
  const unit = unitOfItem(item.id);
  const unitPool = (unit?.items ?? []).filter(sameGroup);
  const knownInUnit = known.filter((k) => unitPool.includes(k));
  const anyPool = allItems().filter(sameGroup);
  const chosen: Item[] = [];
  // Same-unit items the learner has already met make the most useful distractors.
  for (const pool of [knownInUnit, known, unitPool, anyPool]) {
    for (const c of shuffle(pool, rng)) {
      if (chosen.length >= n) break;
      if (!chosen.some((x) => x.id === c.id || x[lang] === c[lang] || x.bg === c.bg)) chosen.push(c);
    }
    if (chosen.length >= n) break;
  }
  return chosen;
}

function choiceSet(ex: { item: string; options?: string[] }, lang: UiLang, lessonId: string | undefined, rng: Rng): Item[] {
  const answer = getItem(ex.item);
  const items = ex.options ? ex.options.map(getItem) : [answer, ...pickDistractors(answer, lang, lessonId, 2, rng)];
  return shuffle(items, rng);
}

const tokens = (s: string) => s.trim().split(/\s+/).filter(Boolean);

/** Tiles carry no punctuation, so commas or full stops can't give the order away. */
const tileTokens = (s: string) => tokens(s.replace(/[.,!?;:„“"«»…]/g, ' '));

let stressLookup: Map<string, string> | null = null;
/**
 * Distractor tiles get the same stress marking as answer tiles (otherwise a
 * missing accent would reveal which tiles are fake). Looks the word up in the
 * course vocabulary; unknown words are returned unchanged.
 */
export function stressWord(word: string): string {
  if (!stressLookup) {
    stressLookup = new Map();
    for (const it of allItems()) {
      const plain = tokens(it.bg);
      const stressed = tokens(it.stressed);
      plain.forEach((w, i) => {
        const key = w.toLowerCase().replace(/[.,!?;:]/g, '');
        if (!stressLookup!.has(key) && stressed[i]) stressLookup!.set(key, stressed[i].replace(/[.,!?;:]/g, ''));
      });
    }
  }
  if (/́/.test(word)) return word;
  const hit = stressLookup.get(word.toLowerCase());
  if (!hit) return word;
  return word[0] === word[0].toUpperCase() ? hit[0].toUpperCase() + hit.slice(1) : hit.toLowerCase();
}

export function resolve(ex: Exercise, lang: UiLang, lessonId?: string, rng: Rng = Math.random): Resolved {
  switch (ex.type) {
    case 'mc': {
      const answer = getItem(ex.item);
      return ex.dir === 'toL1'
        ? { kind: 'choice', ex, prompt: { type: 'bg', item: answer }, view: 'l1', choices: choiceSet(ex, lang, lessonId, rng), answer, titleKey: 'ex.mc.toL1' }
        : { kind: 'choice', ex, prompt: { type: 'l1', item: answer }, view: 'bg', choices: choiceSet(ex, lang, lessonId, rng), answer, titleKey: 'ex.mc.toBg' };
    }
    case 'listenPick': {
      const answer = getItem(ex.item);
      return { kind: 'choice', ex, prompt: { type: 'audio', item: answer }, view: isLetter(answer) ? 'letter' : 'bg', choices: choiceSet(ex, lang, lessonId, rng), answer, titleKey: 'ex.listenPick' };
    }
    case 'letterSound': {
      const answer = getItem(ex.item);
      return ex.dir === 'letterToSound'
        ? { kind: 'choice', ex, prompt: { type: 'letter', item: answer }, view: 'translit', choices: choiceSet(ex, lang, lessonId, rng), answer, titleKey: 'ex.letterToSound' }
        : { kind: 'choice', ex, prompt: { type: 'sound', item: answer }, view: 'letter', choices: choiceSet(ex, lang, lessonId, rng), answer, titleKey: 'ex.soundToLetter' };
    }
    case 'translate': {
      const answer = getItem(ex.item);
      return ex.dir === 'toL1'
        ? { kind: 'text', ex, prompt: { type: 'bg', item: answer }, lang, accepted: answer.accept[lang], answer, titleKey: 'ex.translate.toL1' }
        : { kind: 'text', ex, prompt: { type: 'l1', item: answer }, lang: 'bg', accepted: answer.accept.bg ?? [answer.bg], answer, titleKey: 'ex.translate.toBg' };
    }
    case 'listenType': {
      const answer = getItem(ex.item);
      return { kind: 'text', ex, prompt: { type: 'audio', item: answer }, lang: 'bg', accepted: answer.accept.bg ?? [answer.bg], answer, titleKey: 'ex.listenType' };
    }
    case 'wordBank': {
      const answer = getItem(ex.item);
      if (ex.dir === 'toBg') {
        const own = tileTokens(answer.stressed);
        const extra = (ex.distractors?.bg ?? autoTileDistractors(answer, (it) => it.stressed, own, rng)).map(stressWord);
        return { kind: 'tiles', ex, prompt: { type: 'l1', item: answer }, lang: 'bg', tiles: shuffle([...own, ...extra], rng), accepted: answer.accept.bg ?? [answer.bg], answer, titleKey: 'ex.wordBank.toBg' };
      }
      const own = tileTokens(answer.accept[lang][0]);
      const extra = ex.distractors?.[lang] ?? autoTileDistractors(answer, (it) => it.accept[lang][0], own, rng);
      return { kind: 'tiles', ex, prompt: { type: 'bg', item: answer }, lang, tiles: shuffle([...own, ...extra], rng), accepted: answer.accept[lang], answer, titleKey: 'ex.wordBank.toL1' };
    }
    case 'match': {
      const items = ex.items.map(getItem);
      return { kind: 'match', ex, items, rightView: items.every(isLetter) ? 'translit' : 'l1', titleKey: 'ex.match' };
    }
    case 'fillBlank':
      return { kind: 'fill', ex, before: ex.before, after: ex.after, options: shuffle(ex.options, rng), answer: ex.answer, translation: ex.translation, titleKey: 'ex.fillBlank' };
    case 'speak':
      return { kind: 'speak', ex, item: getItem(ex.item), titleKey: 'ex.speak' };
  }
}

/** Two words from other phrases of the same unit, used when no distractors are authored. */
function autoTileDistractors(answer: Item, text: (it: Item) => string, own: string[], rng: Rng): string[] {
  const lower = new Set(own.map((w) => w.toLowerCase()));
  const pool = (unitOfItem(answer.id)?.items ?? [])
    .filter((it) => it.id !== answer.id && it.kind !== 'letter')
    .flatMap((it) => tileTokens(text(it)))
    .filter((w) => !lower.has(w.toLowerCase()));
  return [...new Set(shuffle(pool, rng))].slice(0, 2);
}

/** True for exercises that cannot be done without audio. */
export function needsAudio(ex: Exercise): boolean {
  return ex.type === 'listenPick' || ex.type === 'listenType' || (ex.type === 'letterSound' && ex.dir === 'soundToLetter');
}

/** Generates a practice session (10–15 exercises) from item ids. */
export function generatePractice(itemIds: string[], rng: Rng = Math.random): Exercise[] {
  const items = itemIds.map(findItem).filter((x): x is Item => !!x);
  if (!items.length) return [];
  const out: Exercise[] = [];
  const words = items.filter((i) => !isLetter(i));
  if (words.length >= 4) out.push({ type: 'match', items: shuffle(words, rng).slice(0, 4).map((i) => i.id) });
  let i = 0;
  while (out.length < Math.min(15, Math.max(10, items.length + 1)) && i < 60) {
    const it = items[i % items.length];
    out.push(exerciseFor(it, Math.floor(rng() * 6)));
    i++;
  }
  return shuffle(out, rng).slice(0, 15);
}

function exerciseFor(it: Item, k: number): Exercise {
  if (it.kind === 'letter') {
    return k % 3 === 0
      ? { type: 'letterSound', item: it.id, dir: 'soundToLetter' }
      : k % 3 === 1
        ? { type: 'letterSound', item: it.id, dir: 'letterToSound' }
        : { type: 'listenPick', item: it.id };
  }
  const multiWord = tokens(it.bg).length >= 2;
  const options: Exercise[] = [
    { type: 'mc', item: it.id, dir: 'toL1' },
    { type: 'mc', item: it.id, dir: 'toBg' },
    { type: 'listenPick', item: it.id },
    { type: 'translate', item: it.id, dir: 'toL1' },
    multiWord ? { type: 'wordBank', item: it.id, dir: 'toBg' } : { type: 'listenType', item: it.id },
    multiWord ? { type: 'wordBank', item: it.id, dir: 'toL1' } : { type: 'translate', item: it.id, dir: 'toBg' },
  ];
  return options[k % options.length];
}

/** Random sample of a unit's authored exercises (no speaking) for its checkpoint. */
export function buildCheckpoint(unitId: string, count: number, rng: Rng = Math.random): Exercise[] {
  const pool = lessonsOf(unitId).flatMap((l) => l.exercises.filter((e) => e.type !== 'speak'));
  return shuffle(pool, rng).slice(0, count);
}

/** Placement test: covers all alphabet units. */
export function buildPlacement(rng: Rng = Math.random): Exercise[] {
  const alpha = units.filter((u) => u.unit.alphabet);
  const per = Math.ceil(20 / Math.max(1, alpha.length));
  return shuffle(alpha.flatMap((u) => buildCheckpoint(u.unit.id, per, rng)), rng);
}
