import { describe, expect, it } from 'vitest';
import { emptyStreak, recordActivity, reconcile } from '../src/engine/streak';
import { accuracy, advance, current, isFinished, startSession, submit, MAX_REQUEUE } from '../src/engine/session';
import type { Exercise } from '../src/content/schema';

describe('streak', () => {
  it('starts, continues and tracks best', () => {
    let s = recordActivity(emptyStreak(), '2026-03-01');
    s = recordActivity(s, '2026-03-02');
    s = recordActivity(s, '2026-03-02'); // same day twice
    expect(s.current).toBe(2);
    expect(s.best).toBe(2);
  });

  it('resets after a missed day without freezes', () => {
    let s = recordActivity(emptyStreak(), '2026-03-01');
    s = recordActivity(s, '2026-03-03');
    expect(s.current).toBe(1);
    expect(s.best).toBe(1);
  });

  it('earns a freeze every 7 days and spends it on a missed day', () => {
    let s = emptyStreak();
    for (let d = 1; d <= 7; d++) s = recordActivity(s, `2026-03-0${d}`);
    expect(s.freezes).toBe(1);
    s = reconcile(s, '2026-03-09'); // missed the 8th
    expect(s.freezes).toBe(0);
    expect(s.calendar['2026-03-08']).toBe('freeze');
    s = recordActivity(s, '2026-03-09');
    expect(s.current).toBe(8);
  });

  it('handles month boundaries', () => {
    let s = recordActivity(emptyStreak(), '2026-02-28');
    s = recordActivity(s, '2026-03-01');
    expect(s.current).toBe(2);
  });
});

describe('lesson session', () => {
  const exs: Exercise[] = [
    { type: 'translate', item: 'a', dir: 'toL1' },
    { type: 'translate', item: 'b', dir: 'toL1' },
  ];

  it('re-queues wrong answers at the end of the lesson', () => {
    let s = startSession(exs);
    s = advance(submit(s, 'wrong'));
    expect(s.queue).toHaveLength(3);
    expect(s.queue[2].src).toBe(0);
    s = advance(submit(s, 'correct'));
    expect(current(s)?.src).toBe(0);
    s = advance(submit(s, 'correct'));
    expect(isFinished(s)).toBe(true);
    expect(accuracy(s)).toBe(0.5); // first-try accuracy
    expect(s.items.a).toEqual({ correct: 1, typos: 0, wrong: 1 });
  });

  it(`stops re-queueing after ${MAX_REQUEUE} retries`, () => {
    let s = startSession([exs[0]]);
    for (let i = 0; i < 10 && !isFinished(s); i++) s = advance(submit(s, 'wrong'));
    expect(s.queue).toHaveLength(1 + MAX_REQUEUE);
    expect(isFinished(s)).toBe(true);
  });

  it('counts typos as correct and loses hearts only when enabled', () => {
    let s = startSession(exs, 3);
    s = advance(submit(s, 'typo'));
    s = advance(submit(s, 'wrong'));
    expect(s.hearts).toBe(2);
    expect(startSession(exs).hearts).toBeNull();
  });
});
