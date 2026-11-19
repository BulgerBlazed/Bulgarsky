// @vitest-environment jsdom
/**
 * Explicit bidi tests: Bulgarian must always render LTR and isolated inside
 * Hebrew (RTL) text, and word-bank tiles must use the right direction.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Bg, MixedText, splitBg } from '../src/components/Bg';
import { TilesExercise } from '../src/exercises/TilesExercise';
import { resolve } from '../src/engine/exercises';
import { useStore } from '../src/state/store';

afterEach(cleanup);

describe('splitBg', () => {
  it('isolates Cyrillic runs inside Hebrew text', () => {
    const segs = splitBg('אומרים здраве́й לחבר');
    expect(segs).toEqual([
      { bg: false, text: 'אומרים ' },
      { bg: true, text: 'здраве́й' },
      { bg: false, text: ' לחבר' },
    ]);
  });

  it('keeps comma-separated Bulgarian phrases in ONE run so word order is not flipped', () => {
    const segs = splitBg('הסירוב „Не, благодаря́“ הוא מנומס');
    expect(segs.filter((s) => s.bg).map((s) => s.text)).toEqual(['Не, благодаря́']);
  });

  it('keeps a Bulgarian question mark with the Bulgarian text', () => {
    const segs = splitBg('שאלה: Как си? ותשובה');
    expect(segs.filter((s) => s.bg).map((s) => s.text)).toEqual(['Как си?']);
  });

  it('keeps multi-sentence Bulgarian together', () => {
    const segs = splitBg('Добре́, благодаря́. А ти?');
    expect(segs).toEqual([{ bg: true, text: 'Добре́, благодаря́. А ти?' }]);
  });

  it('leaves a sentence-final period outside the Bulgarian run', () => {
    const segs = splitBg('המילה היא ма́ма.');
    expect(segs.at(-1)).toEqual({ bg: false, text: '.' });
  });

  it('includes a leading hyphen for suffixes like -те', () => {
    const segs = splitBg('הסיומת ‎-те‎ מנומסת');
    expect(segs.filter((s) => s.bg).map((s) => s.text)).toEqual(['-те']);
  });

  it('returns plain text untouched', () => {
    expect(splitBg('Hello world')).toEqual([{ bg: false, text: 'Hello world' }]);
  });
});

describe('rendering', () => {
  it('<Bg> is an LTR bdi tagged as Bulgarian', () => {
    const { container } = render(<Bg>до́бър</Bg>);
    const bdi = container.querySelector('bdi')!;
    expect(bdi.getAttribute('dir')).toBe('ltr');
    expect(bdi.getAttribute('lang')).toBe('bg');
  });

  it('<MixedText> wraps every Bulgarian run in a dir=ltr bdi inside an RTL page', () => {
    document.documentElement.dir = 'rtl';
    const { container } = render(
      <p dir="rtl" lang="he">
        <MixedText text="בעברית אומרים „אני מריה“, ובבולגרית Аз съм Мари́я. גם Мари́я съм נכון." />
      </p>,
    );
    const runs = [...container.querySelectorAll('bdi')];
    expect(runs.map((b) => b.textContent)).toEqual(['Аз съм Мари́я', 'Мари́я съм']);
    for (const b of runs) {
      expect(b.getAttribute('dir')).toBe('ltr');
      expect(b.getAttribute('lang')).toBe('bg');
    }
    // Hebrew text itself is not wrapped.
    expect(container.textContent).toContain('בעברית אומרים');
  });
});

describe('word bank direction', () => {
  beforeEach(() => {
    useStore.setState((s) => ({ settings: { ...s.settings, uiLang: 'he' } }));
  });

  it('Bulgarian tiles are LTR even in the Hebrew UI', () => {
    const r = resolve({ type: 'wordBank', item: 'u3.ne-blagodarya', dir: 'toBg' }, 'he');
    if (r.kind !== 'tiles') throw new Error('expected tiles');
    const { getByTestId } = render(<TilesExercise r={r} locked={false} onChange={() => {}} />);
    expect(getByTestId('tiles-answer').getAttribute('dir')).toBe('ltr');
    expect(getByTestId('tiles-bank').getAttribute('dir')).toBe('ltr');
    expect(getByTestId('tiles-bank').getAttribute('lang')).toBe('bg');
  });

  it('Hebrew tiles flow RTL', () => {
    const r = resolve({ type: 'wordBank', item: 'u3.ne-blagodarya', dir: 'toL1' }, 'he');
    if (r.kind !== 'tiles') throw new Error('expected tiles');
    const { getByTestId } = render(<TilesExercise r={r} locked={false} onChange={() => {}} />);
    expect(getByTestId('tiles-answer').getAttribute('dir')).toBe('rtl');
    expect(getByTestId('tiles-bank').getAttribute('dir')).toBe('rtl');
    expect(r.tiles).toEqual(expect.arrayContaining(['לא', 'תודה']));
  });

  it('tiles carry no punctuation and distractors get stress marks like real tiles', () => {
    const r = resolve({ type: 'wordBank', item: 'u3.ne-blagodarya', dir: 'toBg', distractors: { bg: ['да', 'моля'] } }, 'he');
    if (r.kind !== 'tiles') throw new Error('expected tiles');
    expect([...r.tiles].sort()).toEqual(['Не', 'благодаря́', 'да', 'мо́ля'].sort());
  });
});
