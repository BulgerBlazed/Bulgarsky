import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContentFromDisk } from '../scripts/loadContent';
import { validateCourse } from '../src/content/validate';
import type { RawContent } from '../src/content/validate';

const raw = () => loadContentFromDisk(path.resolve(import.meta.dirname, '..', 'content'));
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

describe('course content', () => {
  it('is valid', () => {
    expect(validateCourse(raw())).toEqual([]);
  });

  it('has Units 1–4 with about 20 lessons of 10–15 exercises each', () => {
    const r = raw();
    expect(r.units).toHaveLength(4);
    const lessons = Object.values(r.lessons) as { exercises: unknown[] }[];
    expect(lessons.length).toBeGreaterThanOrEqual(19);
    for (const l of lessons) {
      expect(l.exercises.length).toBeGreaterThanOrEqual(10);
      expect(l.exercises.length).toBeLessThanOrEqual(15);
    }
  });
});

describe('validation fails on malformed content', () => {
  const withUnit = (mutate: (u: any) => void): RawContent => {
    const r = clone(raw());
    mutate(r.units.find((u) => u.dir === 'u03-greetings')!.data);
    return r;
  };

  it('rejects a stressed form that does not match the plain form', () => {
    const errs = validateCourse(withUnit((u) => (u.items[0].stressed = 'здра́вей!')));
    expect(errs.join('\n')).toMatch(/does not match bg/);
  });

  it('rejects a missing Hebrew translation', () => {
    const errs = validateCourse(withUnit((u) => delete u.items[0].he));
    expect(errs.join('\n')).toMatch(/units\/u03-greetings\/unit\.json: items\.0\.he/);
  });

  it('rejects unknown item references in lessons', () => {
    const r = clone(raw());
    (r.lessons['u03-greetings/u03-l3'] as any).exercises[0].item = 'u3.nope';
    expect(validateCourse(r).join('\n')).toMatch(/unknown item "u3.nope"/);
  });

  it('rejects options that do not contain the answer', () => {
    const r = clone(raw());
    (r.lessons['u03-greetings/u03-l3'] as any).exercises[0].options = ['u3.ne', 'u3.molya'];
    expect(validateCourse(r).join('\n')).toMatch(/options must include the answer/);
  });

  it('rejects unknown exercise types and extra fields', () => {
    const r = clone(raw());
    (r.lessons['u03-greetings/u03-l3'] as any).exercises[0] = { type: 'dance', item: 'u3.da' };
    (r.lessons['u03-greetings/u03-l3'] as any).exercises[1].colour = 'red';
    const msg = validateCourse(r).join('\n');
    expect(msg).toMatch(/exercises\.0/);
    expect(msg).toMatch(/exercises\.1/);
  });

  it('rejects Bulgarian text without Cyrillic', () => {
    const errs = validateCourse(withUnit((u) => (u.items[0].bg = u.items[0].stressed = 'zdravey')));
    expect(errs.join('\n')).toMatch(/must contain Cyrillic/);
  });
});
