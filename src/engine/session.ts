/**
 * Lesson session queue. Wrong answers are re-queued at the end of the same
 * lesson (up to MAX_REQUEUE times per exercise) so learners see them again.
 */
import type { Exercise } from '../content/schema';
import { exerciseItemIds } from '../content/validate';
import type { Verdict } from './answerMatch';

export const MAX_REQUEUE = 2;

export interface QueueEntry {
  /** Index of the exercise in the original list */
  src: number;
  ex: Exercise;
  /** 0 for the first showing, 1+ for re-queued copies */
  round: number;
}

export interface ItemTally {
  correct: number;
  typos: number;
  wrong: number;
}

export interface SessionState {
  queue: QueueEntry[];
  pos: number;
  /** First-try outcome per original exercise */
  firstTry: Record<number, boolean>;
  items: Record<string, ItemTally>;
  mistakes: number;
  /** null when hearts are disabled */
  hearts: number | null;
}

export function startSession(exercises: Exercise[], hearts: number | null = null): SessionState {
  return {
    queue: exercises.map((ex, src) => ({ src, ex, round: 0 })),
    pos: 0,
    firstTry: {},
    items: {},
    mistakes: 0,
    hearts,
  };
}

export function current(s: SessionState): QueueEntry | undefined {
  return s.queue[s.pos];
}

/**
 * Records the verdict for the current exercise. Self-assessed speaking results
 * are recorded for display only and never touch SRS (pass `itemIds: []`).
 */
export function submit(s: SessionState, verdict: Verdict, itemIds?: string[]): SessionState {
  const entry = s.queue[s.pos];
  if (!entry) return s;
  const ok = verdict !== 'wrong';
  const next: SessionState = {
    ...s,
    queue: s.queue,
    firstTry: entry.round === 0 ? { ...s.firstTry, [entry.src]: ok } : s.firstTry,
    items: { ...s.items },
    mistakes: s.mistakes + (ok ? 0 : 1),
    hearts: s.hearts !== null && !ok ? Math.max(0, s.hearts - 1) : s.hearts,
  };
  const ids = itemIds ?? exerciseItemIds(entry.ex).slice(0, entry.ex.type === 'match' ? undefined : 1);
  for (const id of ids) {
    const t = { ...(next.items[id] ?? { correct: 0, typos: 0, wrong: 0 }) };
    if (verdict === 'correct') t.correct++;
    else if (verdict === 'typo') t.typos++;
    else t.wrong++;
    next.items[id] = t;
  }
  if (!ok && entry.round < MAX_REQUEUE) {
    next.queue = [...s.queue, { ...entry, round: entry.round + 1 }];
  }
  return next;
}

export function advance(s: SessionState): SessionState {
  return { ...s, pos: s.pos + 1 };
}

export function isFinished(s: SessionState): boolean {
  return s.pos >= s.queue.length;
}

export function isOutOfHearts(s: SessionState): boolean {
  return s.hearts !== null && s.hearts <= 0;
}

/** Share of exercises answered correctly on the first try, 0–1. */
export function accuracy(s: SessionState): number {
  const vals = Object.values(s.firstTry);
  if (!vals.length) return 0;
  return vals.filter(Boolean).length / vals.length;
}

export function progress(s: SessionState): number {
  return s.queue.length ? Math.min(1, s.pos / s.queue.length) : 0;
}
