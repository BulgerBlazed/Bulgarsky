import { describe, expect, it } from 'vitest';
import en from '../src/i18n/en.json';
import he from '../src/i18n/he.json';

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe('UI strings', () => {
  it('Hebrew has exactly the same keys as English', () => {
    expect(Object.keys(he).sort()).toEqual(Object.keys(en).sort());
  });
  it('every translation keeps the same {placeholders}', () => {
    for (const [k, v] of Object.entries(en)) {
      if (k.endsWith('.one')) continue; // singular forms may spell out "one" instead of {n}
      expect(placeholders((he as Record<string, string>)[k]), k).toEqual(placeholders(v));
    }
  });
  it('no empty strings', () => {
    for (const [k, v] of [...Object.entries(en), ...Object.entries(he)]) expect(v.trim(), k).not.toBe('');
  });
});
