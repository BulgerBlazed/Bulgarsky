import { describe, expect, it } from 'vitest';
import { checkAnswer, checkTiles, editDistance, normalize, typoAllowance } from '../src/engine/answerMatch';

describe('normalize', () => {
  it('removes stress marks but keeps й and ѝ', () => {
    expect(normalize('до́бър', 'bg')).toBe('добър');
    expect(normalize('Здраве́й!', 'bg')).toBe('здравей');
    expect(normalize('ѝ', 'bg')).toBe('ѝ');
  });
  it('ignores case, punctuation and extra spaces', () => {
    expect(normalize('  Не,   благодаря.  ', 'bg')).toBe('не благодаря');
    expect(normalize('Hello, World!', 'en')).toBe('hello world');
  });
  it('maps Latin look-alikes to Cyrillic in Bulgarian answers', () => {
    // "кафе" typed with Latin a/e
    expect(normalize('кafe', 'bg')).toBe('кафе'.replace('ф', 'f'));
    expect(normalize('мама'.replace('а', 'a'), 'bg')).toBe('мама');
    expect(normalize('TAKA'.replace('K', 'К'), 'bg')).toBe('така');
  });
  it('strips Hebrew niqqud and geresh', () => {
    expect(normalize('שָׁלוֹם', 'he')).toBe('שלום');
    expect(normalize('צ׳או', 'he')).toBe('צאו');
  });
  it('expands English contractions', () => {
    expect(normalize("I'm Maria", 'en')).toBe('i am maria');
    expect(normalize('I’m Maria', 'en')).toBe('i am maria');
    expect(normalize("Where's the station?", 'en')).toBe('where is the station');
  });
});

describe('editDistance', () => {
  it('counts insertions, deletions, substitutions and transpositions', () => {
    expect(editDistance('здравей', 'здравей')).toBe(0);
    expect(editDistance('здравей', 'здравеи')).toBe(1);
    expect(editDistance('здравей', 'здрвей')).toBe(1);
    expect(editDistance('здравей', 'здарвей')).toBe(1); // transposition
    expect(editDistance('abc', 'xyz')).toBe(3);
  });
});

describe('typoAllowance', () => {
  it('scales with answer length', () => {
    expect(typoAllowance(2)).toBe(0);
    expect(typoAllowance(5)).toBe(1);
    expect(typoAllowance(12)).toBe(2);
  });
});

describe('checkAnswer', () => {
  it('accepts exact answers regardless of stress marks', () => {
    expect(checkAnswer('благодаря', ['благодаря́'], 'bg').verdict).toBe('correct');
  });
  it('accepts any of several answers', () => {
    const r = checkAnswer('thanks', ['thank you', 'thanks'], 'en');
    expect(r.verdict).toBe('correct');
    expect(r.closest).toBe('thanks');
  });
  it('tolerates one typo in a medium word', () => {
    const r = checkAnswer('благодоря', ['благодаря'], 'bg');
    expect(r.verdict).toBe('typo');
    expect(r.closest).toBe('благодаря');
  });
  it('does not tolerate typos in very short words', () => {
    // да vs до would otherwise be "1 typo"
    expect(checkAnswer('до', ['да'], 'bg').verdict).toBe('wrong');
    expect(checkAnswer('не', ['на'], 'bg').verdict).toBe('wrong');
  });
  it('rejects clearly different answers', () => {
    expect(checkAnswer('goodbye', ['hello'], 'en').verdict).toBe('wrong');
  });
  it('rejects empty input', () => {
    expect(checkAnswer('   ', ['да'], 'bg').verdict).toBe('wrong');
  });
  it('hints when Bulgarian is typed in Latin script', () => {
    const r = checkAnswer('blagodarya', ['благодаря'], 'bg');
    expect(r.verdict).toBe('wrong');
    expect(r.hint).toBe('latin-script');
  });
  it('handles Hebrew answers with and without niqqud', () => {
    expect(checkAnswer('תּוֹדָה', ['תודה'], 'he').verdict).toBe('correct');
    expect(checkAnswer('תודא', ['תודה'], 'he').verdict).toBe('typo');
  });
  it('accepts contracted and full English forms', () => {
    expect(checkAnswer("I'm Ivan", ['I am Ivan'], 'en').verdict).toBe('correct');
  });
});

describe('checkTiles', () => {
  it('matches tile sequences ignoring punctuation and stress', () => {
    expect(checkTiles(['Не,', 'благодаря́.'], ['Не, благодаря.'], 'bg')).toBe(true);
    expect(checkTiles(['благодаря', 'не'], ['Не, благодаря.'], 'bg')).toBe(false);
  });
});
