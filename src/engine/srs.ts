/**
 * Spaced-repetition scheduler (SM-2) with a recall-probability estimate used
 * for the decaying lesson strength meter.
 */
export const DAY_MS = 24 * 60 * 60 * 1000;

export interface Card {
  /** Easiness factor (SM-2), ≥ 1.3 */
  ef: number;
  /** Current interval in days */
  interval: number;
  /** Consecutive successful reviews */
  reps: number;
  /** Next due time (epoch ms) */
  due: number;
  lapses: number;
  lastReview: number;
  /** Lifetime counters for the progress screen */
  seen: number;
  correct: number;
}

/** SM-2 quality: 0–5. ≥3 counts as a successful recall. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export function newCard(now: number): Card {
  return { ef: 2.5, interval: 0, reps: 0, due: now, lapses: 0, lastReview: now, seen: 0, correct: 0 };
}

export function review(card: Card, q: Quality, now: number): Card {
  const next: Card = { ...card, lastReview: now, seen: card.seen + 1, correct: card.correct + (q >= 3 ? 1 : 0) };
  if (q < 3) {
    next.reps = 0;
    next.interval = 1;
    next.lapses = card.lapses + 1;
  } else {
    next.reps = card.reps + 1;
    if (next.reps === 1) next.interval = 1;
    else if (next.reps === 2) next.interval = 6;
    else next.interval = Math.round(card.interval * card.ef);
  }
  next.ef = Math.max(1.3, card.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  next.due = now + next.interval * DAY_MS;
  return next;
}

export function isDue(card: Card, now: number): boolean {
  return card.due <= now;
}

/**
 * Turns what happened to an item during one session into a single SM-2 grade.
 * Wrong at least once → lapse (2). Only typos → 4. Clean → 5.
 */
export function gradeSession(r: { wrong: number; typos: number; correct: number }): Quality {
  if (r.wrong > 0) return 2;
  if (r.typos > 0) return 4;
  return 5;
}

/**
 * Estimated probability of recall now, 0–1. Uses the interval as the
 * point where recall drops to 90% and decays exponentially after that.
 */
export function retrievability(card: Card | undefined, now: number): number {
  if (!card || card.seen === 0) return 0;
  const elapsedDays = Math.max(0, now - card.lastReview) / DAY_MS;
  const stability = Math.max(card.interval, 1);
  return Math.pow(0.9, elapsedDays / stability);
}

/** Lesson strength 0–1 = mean recall probability of its items. */
export function strength(cards: (Card | undefined)[], now: number): number {
  if (!cards.length) return 0;
  return cards.reduce((sum, c) => sum + retrievability(c, now), 0) / cards.length;
}

/** Items to practise: overdue first, then weakest, capped. */
export function pickDue(cards: Record<string, Card>, now: number, limit: number): string[] {
  return Object.entries(cards)
    .filter(([, c]) => isDue(c, now))
    .sort(([, a], [, b]) => retrievability(a, now) - retrievability(b, now) || a.due - b.due)
    .slice(0, limit)
    .map(([id]) => id);
}
