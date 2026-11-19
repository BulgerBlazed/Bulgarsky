import { course, getItem, lessonsOf, units } from '../content/course';
import type { Lesson } from '../content/schema';
import { pickDue, retrievability, strength } from '../engine/srs';
import type { Progress } from './store';

export type NodeStatus = 'done' | 'current' | 'locked';

/** Ready units in course order. */
export const readyUnits = () => units.map((u) => u.unit);

export function isUnitUnlocked(unitId: string, p: Progress): boolean {
  const list = readyUnits();
  const i = list.findIndex((u) => u.id === unitId);
  if (i <= 0) return i === 0;
  return !!p.unitsPassed[list[i - 1].id];
}

export function lessonStatus(unitId: string, lessonIndex: number, p: Progress): NodeStatus {
  if (!isUnitUnlocked(unitId, p)) return 'locked';
  const lessons = lessonsOf(unitId);
  if (p.lessons[lessons[lessonIndex].id]) return 'done';
  const prevDone = lessonIndex === 0 || !!p.lessons[lessons[lessonIndex - 1].id];
  return prevDone ? 'current' : 'locked';
}

export function checkpointStatus(unitId: string, p: Progress): NodeStatus {
  if (p.unitsPassed[unitId]) return 'done';
  if (!isUnitUnlocked(unitId, p)) return 'locked';
  return lessonsOf(unitId).every((l) => p.lessons[l.id]) ? 'current' : 'locked';
}

/** 0–4 bars for a lesson's strength meter (decays over time). */
export function lessonBars(lesson: Lesson, p: Progress, now = Date.now()): number {
  if (!p.lessons[lesson.id]) return 0;
  const s = strength(lesson.newItems.map((id) => p.cards[id]), now);
  return Math.max(1, Math.ceil(s * 4));
}

export function dueItemIds(p: Progress, now = Date.now(), limit = 12): string[] {
  return pickDue(p.cards, now, limit).filter((id) => {
    try {
      getItem(id);
      return true;
    } catch {
      return false;
    }
  });
}

export function dueCount(p: Progress, now = Date.now()): number {
  return Object.values(p.cards).filter((c) => c.due <= now).length;
}

/** Weakest seen items by recall probability and error rate. */
export function weakestItemIds(p: Progress, now = Date.now(), limit = 8): string[] {
  return Object.entries(p.cards)
    .filter(([id, c]) => c.seen > 0 && getItemSafe(id))
    .map(([id, c]) => ({ id, score: retrievability(c, now) * 0.6 + (c.correct / Math.max(1, c.seen)) * 0.4 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)
    .map((x) => x.id);
}

function getItemSafe(id: string) {
  try {
    return getItem(id);
  } catch {
    return null;
  }
}

export function wordsLearned(p: Progress): number {
  return Object.entries(p.cards).filter(([id, c]) => c.correct > 0 && getItemSafe(id)?.kind !== 'letter').length;
}

export function unitItemIdsLearned(unitId: string, p: Progress): string[] {
  return (units.find((u) => u.unit.id === unitId)?.unit.items ?? []).filter((i) => p.cards[i.id]).map((i) => i.id);
}

/** The first lesson/checkpoint the learner should do next. */
export function nextStep(p: Progress): { kind: 'lesson'; id: string } | { kind: 'checkpoint'; unitId: string } | null {
  for (const u of readyUnits()) {
    if (!isUnitUnlocked(u.id, p)) return null;
    const lessons = lessonsOf(u.id);
    for (let i = 0; i < lessons.length; i++) if (!p.lessons[lessons[i].id]) return { kind: 'lesson', id: lessons[i].id };
    if (!p.unitsPassed[u.id]) return { kind: 'checkpoint', unitId: u.id };
  }
  return null;
}

export { course };
