/**
 * Daily streak with streak freezes. Dates are local calendar days "YYYY-MM-DD".
 */
export interface StreakState {
  current: number;
  best: number;
  freezes: number;
  /** Last day a lesson/practice was completed */
  lastActive: string | null;
  /** day → how it counted */
  calendar: Record<string, 'done' | 'freeze'>;
}

export const MAX_FREEZES = 2;
/** A freeze is earned every N streak days. */
export const FREEZE_EVERY = 7;

export function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

function addDays(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d + n));
}

export function emptyStreak(): StreakState {
  return { current: 0, best: 0, freezes: 0, lastActive: null, calendar: {} };
}

/**
 * Called on app open: spends freezes on missed days, or resets the streak if
 * there are not enough freezes. Never changes anything for "today".
 */
export function reconcile(s: StreakState, today: string): StreakState {
  if (!s.lastActive) return s;
  const gap = daysBetween(s.lastActive, today);
  if (gap <= 1) return s;
  const missed = gap - 1;
  if (missed <= s.freezes) {
    const calendar = { ...s.calendar };
    for (let i = 1; i <= missed; i++) calendar[addDays(s.lastActive, i)] = 'freeze';
    // Freeze days keep the streak alive; treat the last frozen day as "active".
    return { ...s, freezes: s.freezes - missed, calendar, lastActive: addDays(s.lastActive, missed) };
  }
  return { ...s, current: 0 };
}

/** Called when the learner completes a lesson or practice session. */
export function recordActivity(s0: StreakState, today: string): StreakState {
  const s = reconcile(s0, today);
  if (s.lastActive === today) return s;
  const continues = s.lastActive !== null && daysBetween(s.lastActive, today) === 1;
  const current = continues ? s.current + 1 : 1;
  const earned = current > 0 && current % FREEZE_EVERY === 0 ? 1 : 0;
  return {
    current,
    best: Math.max(s.best, current),
    freezes: Math.min(MAX_FREEZES, s.freezes + earned),
    lastActive: today,
    calendar: { ...s.calendar, [today]: 'done' },
  };
}
