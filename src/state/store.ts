import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { UiLang } from '../content/schema';
import { appStore } from '../storage/storage';
import { gradeSession, newCard, review } from '../engine/srs';
import type { Card } from '../engine/srs';
import { dayKey, emptyStreak, recordActivity, reconcile } from '../engine/streak';
import type { StreakState } from '../engine/streak';
import type { ItemTally } from '../engine/session';

export type StressMode = 'new' | 'always' | 'never';

export interface Settings {
  uiLang: UiLang;
  showTranslit: boolean;
  showTranslitHe: boolean;
  stressMode: StressMode;
  dailyGoalMin: 5 | 10 | 20;
  hearts: boolean;
  /** Physical Latin keys type Cyrillic (Bulgarian phonetic layout) */
  phoneticKeys: boolean;
  onboarded: boolean;
}

export interface LessonRecord {
  times: number;
  lastDone: number;
  bestAccuracy: number;
}

export interface Progress {
  cards: Record<string, Card>;
  lessons: Record<string, LessonRecord>;
  /** unit id → time passed (checkpoint or placement) */
  unitsPassed: Record<string, number>;
  xp: number;
  xpByDay: Record<string, number>;
  /** day → milliseconds of active study */
  msByDay: Record<string, number>;
  streak: StreakState;
  unitStats: Record<string, { answered: number; correct: number }>;
}

export type SessionKind = 'lesson' | 'checkpoint' | 'practice' | 'placement';

export interface SessionOutcome {
  kind: SessionKind;
  /** lesson id or unit id */
  refId?: string;
  unitId?: string;
  accuracy: number;
  firstTryAnswered: number;
  firstTryCorrect: number;
  items: Record<string, ItemTally>;
  ms: number;
  passed?: boolean;
}

export interface StoreState {
  settings: Settings;
  progress: Progress;
  setSettings: (s: Partial<Settings>) => void;
  completeSession: (o: SessionOutcome, now?: number) => { xp: number };
  passUnits: (unitIds: string[], itemIds: string[], lessonIds: string[], now?: number) => void;
  openApp: (now?: number) => void;
  resetProgress: () => void;
}

export const XP = { lesson: 10, perfectBonus: 5, checkpoint: 20, practice: 8 } as const;

const defaultSettings = (): Settings => ({
  uiLang: typeof navigator !== 'undefined' && navigator.language?.startsWith('he') ? 'he' : 'en',
  showTranslit: true,
  showTranslitHe: false,
  stressMode: 'new',
  dailyGoalMin: 10,
  hearts: false,
  phoneticKeys: true,
  onboarded: false,
});

const emptyProgress = (): Progress => ({
  cards: {},
  lessons: {},
  unitsPassed: {},
  xp: 0,
  xpByDay: {},
  msByDay: {},
  streak: emptyStreak(),
  unitStats: {},
});

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings(),
      progress: emptyProgress(),

      setSettings: (s) => set({ settings: { ...get().settings, ...s } }),

      openApp: (now = Date.now()) => {
        const p = get().progress;
        set({ progress: { ...p, streak: reconcile(p.streak, dayKey(new Date(now))) } });
      },

      completeSession: (o, now = Date.now()) => {
        const p = get().progress;
        const today = dayKey(new Date(now));
        const cards = { ...p.cards };
        // Placement results and self-assessed speaking never reach here as items.
        for (const [id, tally] of Object.entries(o.items)) {
          cards[id] = review(cards[id] ?? newCard(now), gradeSession(tally), now);
        }
        let xp = 0;
        const lessons = { ...p.lessons };
        const unitsPassed = { ...p.unitsPassed };
        if (o.kind === 'lesson' && o.refId) {
          xp = XP.lesson + (o.accuracy === 1 ? XP.perfectBonus : 0);
          const prev = lessons[o.refId];
          lessons[o.refId] = { times: (prev?.times ?? 0) + 1, lastDone: now, bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, o.accuracy) };
        } else if (o.kind === 'checkpoint') {
          xp = o.passed ? XP.checkpoint : 5;
          if (o.passed && o.unitId) unitsPassed[o.unitId] = now;
        } else if (o.kind === 'practice') {
          xp = XP.practice;
        }
        const unitStats = { ...p.unitStats };
        if (o.unitId && o.kind !== 'placement') {
          const s = unitStats[o.unitId] ?? { answered: 0, correct: 0 };
          unitStats[o.unitId] = { answered: s.answered + o.firstTryAnswered, correct: s.correct + o.firstTryCorrect };
        }
        set({
          progress: {
            ...p,
            cards,
            lessons,
            unitsPassed,
            unitStats,
            xp: p.xp + xp,
            xpByDay: { ...p.xpByDay, [today]: (p.xpByDay[today] ?? 0) + xp },
            msByDay: { ...p.msByDay, [today]: (p.msByDay[today] ?? 0) + o.ms },
            streak: o.kind === 'placement' ? p.streak : recordActivity(p.streak, today),
          },
        });
        return { xp };
      },

      passUnits: (unitIds, itemIds, lessonIds, now = Date.now()) => {
        const p = get().progress;
        const cards = { ...p.cards };
        for (const id of itemIds) if (!cards[id]) cards[id] = review(newCard(now), 4, now);
        const lessons = { ...p.lessons };
        for (const id of lessonIds) lessons[id] ??= { times: 1, lastDone: now, bestAccuracy: 1 };
        const unitsPassed = { ...p.unitsPassed };
        for (const id of unitIds) unitsPassed[id] = now;
        set({ progress: { ...p, cards, lessons, unitsPassed } });
      },

      resetProgress: () => set({ progress: emptyProgress() }),
    }),
    {
      name: 'state',
      version: 1,
      storage: createJSONStorage(() => appStore),
      partialize: (s) => ({ settings: s.settings, progress: s.progress }),
      merge: (persisted, current) => {
        const p = persisted as Partial<StoreState> | undefined;
        return {
          ...current,
          settings: { ...current.settings, ...(p?.settings ?? {}) },
          progress: { ...current.progress, ...(p?.progress ?? {}) },
        };
      },
    },
  ),
);
