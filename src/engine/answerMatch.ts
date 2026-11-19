/**
 * Answer matching: normalisation + typo tolerance for typed answers.
 *
 * - Stress marks (U+0301) are ignored; ѝ/й are kept as real letters.
 * - Case, punctuation and extra spaces are ignored.
 * - Hebrew niqqud and cantillation marks are ignored.
 * - Latin letters that look identical to Cyrillic ones (a, e, o, p, c, x, y, k, m, t…)
 *   are mapped to Cyrillic when checking Bulgarian, so a mixed keyboard still matches.
 * - Small typos are accepted with verdict "typo" (Damerau–Levenshtein, length-scaled).
 */
export type AnswerLang = 'bg' | 'en' | 'he';

export type Verdict = 'correct' | 'typo' | 'wrong';
export interface MatchResult {
  verdict: Verdict;
  /** The accepted answer closest to the input. */
  closest: string;
  distance: number;
  /** Set when a Bulgarian answer was typed in Latin letters. */
  hint?: 'latin-script';
}

const LATIN_TO_CYRILLIC_HOMOGLYPHS: Record<string, string> = {
  a: 'а', e: 'е', o: 'о', p: 'р', c: 'с', x: 'х', y: 'у', k: 'к', m: 'м', t: 'т', h: 'н', b: 'в',
};

const EN_CONTRACTIONS: [RegExp, string][] = [
  [/\bi'm\b/g, 'i am'],
  [/\byou're\b/g, 'you are'],
  [/\bwe're\b/g, 'we are'],
  [/\bthey're\b/g, 'they are'],
  [/\b(he|she|it|what|where|who|that|how)'s\b/g, '$1 is'],
  [/\b(do|does|is|are|was|were|have|has)n't\b/g, '$1 not'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\b(i|you|we|they|he|she)'ll\b/g, '$1 will'],
];

export function normalize(input: string, lang: AnswerLang): string {
  let s = input.normalize('NFD').replace(/́/g, ''); // stress marks
  if (lang === 'he') s = s.replace(/[֑-ֽֿ-ׇ]/g, '').replace(/־/g, ' '); // niqqud; maqaf → space
  s = s.normalize('NFC').toLocaleLowerCase(lang === 'bg' ? 'bg' : lang);
  s = s.replace(/[’‘`´]/g, "'");
  if (lang === 'en') for (const [re, rep] of EN_CONTRACTIONS) s = s.replace(re, rep);
  s = s.replace(/'/g, '').replace(/[״׳"]/g, '');
  s = s.replace(/[\p{P}\p{S}]/gu, ' ').replace(/\s+/g, ' ').trim();
  if (lang === 'bg' && /[Ѐ-ӿ]/.test(s)) {
    s = s.replace(/[a-z]/g, (ch) => LATIN_TO_CYRILLIC_HOMOGLYPHS[ch] ?? ch);
  }
  return s;
}

/** Optimal-string-alignment Damerau–Levenshtein distance. */
export function editDistance(a: string, b: string): number {
  const A = [...a];
  const B = [...b];
  const d: number[][] = Array.from({ length: A.length + 1 }, (_, i) => [i, ...Array(B.length).fill(0)]);
  for (let j = 0; j <= B.length; j++) d[0][j] = j;
  for (let i = 1; i <= A.length; i++) {
    for (let j = 1; j <= B.length; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && A[i - 1] === B[j - 2] && A[i - 2] === B[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[A.length][B.length];
}

/** How many edits we forgive for an answer of this length. */
export function typoAllowance(length: number): number {
  if (length <= 3) return 0;
  if (length <= 7) return 1;
  return 2;
}

export function checkAnswer(input: string, accepted: string[], lang: AnswerLang): MatchResult {
  const given = normalize(input, lang);
  let best: MatchResult = { verdict: 'wrong', closest: accepted[0] ?? '', distance: Infinity };
  if (!given) return best;
  for (const candidate of accepted) {
    const target = normalize(candidate, lang);
    if (given === target) return { verdict: 'correct', closest: candidate, distance: 0 };
    const dist = editDistance(given, target);
    if (dist < best.distance) best = { verdict: 'wrong', closest: candidate, distance: dist };
  }
  const target = normalize(best.closest, lang);
  if (best.distance <= typoAllowance([...target].length)) best.verdict = 'typo';
  if (best.verdict === 'wrong' && lang === 'bg' && /[a-z]/.test(given) && !/[Ѐ-ӿ]/.test(given)) {
    best.hint = 'latin-script';
  }
  return best;
}

/** Word-bank answers: compare tile sequences, ignoring punctuation/case/stress. */
export function checkTiles(chosen: string[], accepted: string[], lang: AnswerLang): boolean {
  const given = normalize(chosen.join(' '), lang);
  return accepted.some((a) => normalize(a, lang) === given);
}
