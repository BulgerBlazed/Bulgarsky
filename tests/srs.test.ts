import { describe, expect, it } from 'vitest';
import { DAY_MS, gradeSession, isDue, newCard, pickDue, retrievability, review, strength } from '../src/engine/srs';

const T0 = Date.UTC(2026, 0, 1);

describe('SM-2 review', () => {
  it('starts new cards due immediately with EF 2.5', () => {
    const c = newCard(T0);
    expect(c.ef).toBe(2.5);
    expect(isDue(c, T0)).toBe(true);
  });

  it('follows the 1 → 6 → interval×EF progression on good answers', () => {
    let c = newCard(T0);
    c = review(c, 5, T0);
    expect(c.interval).toBe(1);
    expect(c.reps).toBe(1);
    c = review(c, 5, T0 + DAY_MS);
    expect(c.interval).toBe(6);
    const efBefore = c.ef;
    c = review(c, 5, T0 + 7 * DAY_MS);
    expect(c.interval).toBe(Math.round(6 * efBefore));
    expect(c.due).toBe(T0 + 7 * DAY_MS + c.interval * DAY_MS);
  });

  it('raises EF on perfect answers and lowers it on hard ones', () => {
    expect(review(newCard(T0), 5, T0).ef).toBeCloseTo(2.6);
    expect(review(newCard(T0), 4, T0).ef).toBeCloseTo(2.5);
    expect(review(newCard(T0), 3, T0).ef).toBeCloseTo(2.36);
  });

  it('never lets EF drop below 1.3', () => {
    let c = newCard(T0);
    for (let i = 0; i < 20; i++) c = review(c, 0, T0 + i * DAY_MS);
    expect(c.ef).toBe(1.3);
  });

  it('resets repetitions and counts a lapse on a failed review', () => {
    let c = newCard(T0);
    c = review(c, 5, T0);
    c = review(c, 5, T0 + DAY_MS);
    c = review(c, 2, T0 + 7 * DAY_MS);
    expect(c.reps).toBe(0);
    expect(c.interval).toBe(1);
    expect(c.lapses).toBe(1);
    expect(c.due).toBe(T0 + 8 * DAY_MS);
  });

  it('tracks lifetime seen/correct counts', () => {
    let c = newCard(T0);
    c = review(c, 5, T0);
    c = review(c, 1, T0);
    expect(c.seen).toBe(2);
    expect(c.correct).toBe(1);
  });
});

describe('gradeSession', () => {
  it('maps in-lesson outcomes to SM-2 grades', () => {
    expect(gradeSession({ correct: 2, typos: 0, wrong: 0 })).toBe(5);
    expect(gradeSession({ correct: 1, typos: 1, wrong: 0 })).toBe(4);
    expect(gradeSession({ correct: 1, typos: 0, wrong: 1 })).toBe(2);
  });
});

describe('retrievability and strength', () => {
  it('is 0 for unseen items and 1 right after review', () => {
    expect(retrievability(undefined, T0)).toBe(0);
    const c = review(newCard(T0), 5, T0);
    expect(retrievability(c, T0)).toBe(1);
  });

  it('decays over time, slower for longer intervals', () => {
    const short = review(newCard(T0), 5, T0); // interval 1
    const long = { ...short, interval: 20 };
    const later = T0 + 5 * DAY_MS;
    expect(retrievability(short, later)).toBeLessThan(retrievability(long, later));
    expect(retrievability(short, later)).toBeCloseTo(Math.pow(0.9, 5));
  });

  it('averages lesson strength over items', () => {
    const c = review(newCard(T0), 5, T0);
    expect(strength([c, undefined], T0)).toBeCloseTo(0.5);
    expect(strength([], T0)).toBe(0);
  });
});

describe('pickDue', () => {
  it('returns only due cards, weakest first, up to the limit', () => {
    const fresh = review(newCard(T0), 5, T0); // due T0+1d
    const old = { ...review(newCard(T0), 5, T0 - 10 * DAY_MS) }; // overdue
    const older = { ...review(newCard(T0), 5, T0 - 30 * DAY_MS) };
    const ids = pickDue({ fresh, old, older }, T0 + 0.5 * DAY_MS, 5);
    expect(ids).toEqual(['older', 'old']);
    expect(pickDue({ fresh, old, older }, T0 + 0.5 * DAY_MS, 1)).toEqual(['older']);
  });
});
