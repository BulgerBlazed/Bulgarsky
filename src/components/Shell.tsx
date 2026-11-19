import { useState } from 'react';
import type { ReactNode } from 'react';
import { useStore } from '../state/store';
import { dayKey } from '../engine/streak';
import { href } from '../router';
import type { Route } from '../router';
import { useT } from '../i18n/i18n';
import { Icon } from './Icon';
import { useAudioStatus } from './ui';

export function TopBar() {
  const t = useT();
  const streak = useStore((s) => s.progress.streak.current);
  const xp = useStore((s) => s.progress.xp);
  const goal = useStore((s) => s.settings.dailyGoalMin);
  const ms = useStore((s) => s.progress.msByDay[dayKey(new Date())] ?? 0);
  const done = Math.min(goal, Math.round(ms / 60000));
  const frac = done / goal;
  const C = 2 * Math.PI * 16;
  return (
    <header className="sticky top-0 z-20 border-b-2 border-line bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl items-center gap-1.5 px-3 py-2 sm:gap-2 sm:px-4">
        <span className="inline-flex min-h-10 items-center gap-1 rounded-full bg-amber-soft px-3 font-bold text-ink" title={t('header.streak', { n: streak })}>
          <Icon name="flame" className="size-5 text-amber-dark" filled />
          <span aria-hidden>{streak}</span>
          <span className="sr-only">{t('header.streak', { n: streak })}</span>
        </span>
        <span className="inline-flex min-h-10 items-center gap-1 rounded-full bg-sky-50 px-3 font-bold whitespace-nowrap text-ink">
          <Icon name="bolt" className="size-5 text-sky-700" filled />
          {t('header.xp', { n: xp })}
        </span>
        <span className="ms-auto inline-flex items-center gap-2" role="img" aria-label={t('header.goal', { done, goal })}>
          <svg viewBox="0 0 40 40" className="size-10 -rotate-90 rtl:-scale-y-100" aria-hidden>
            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-line)" strokeWidth="5" />
            <circle cx="20" cy="20" r="16" fill="none" stroke="var(--color-brand)" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${C * frac} ${C}`} />
          </svg>
          <span className="hidden text-sm font-semibold text-muted sm:inline" dir="ltr">
            {done}/{goal}′
          </span>
        </span>
        <a href={href({ name: 'settings' })} className="rounded-xl p-2 text-muted hover:bg-surface" aria-label={t('header.settings')}>
          <Icon name="gear" />
        </a>
      </div>
    </header>
  );
}

export function BottomNav({ active }: { active: Route['name'] }) {
  const t = useT();
  const tabs: { route: Route; icon: string; label: string; match: Route['name'][] }[] = [
    { route: { name: 'path' }, icon: 'path', label: t('nav.learn'), match: ['path', 'cheat'] },
    { route: { name: 'practice' }, icon: 'dumbbell', label: t('nav.practice'), match: ['practice'] },
    { route: { name: 'profile' }, icon: 'user', label: t('nav.profile'), match: ['profile', 'settings'] },
  ];
  return (
    <nav aria-label={t('nav.main')} className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-line bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {tabs.map((tab) => {
          const on = tab.match.includes(active);
          return (
            <li key={tab.label} className="flex-1">
              <a
                href={href(tab.route)}
                aria-current={on ? 'page' : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold tracking-wide uppercase ${on ? 'text-brand' : 'text-muted hover:text-ink'}`}
              >
                <Icon name={tab.icon} className="size-7" />
                {tab.label}
                {on && <span className="sr-only">(current)</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Clear warning when no Bulgarian TTS voice is installed. */
export function AudioWarning() {
  const t = useT();
  const status = useAudioStatus();
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('zdravei:audio-warning') === '1';
    } catch {
      return false;
    }
  });
  if (!status || status.available || hidden) return null;
  const noApi = status.reason === 'no-speech-api';
  return (
    <div role="alert" className="mx-4 mt-3 flex gap-3 rounded-2xl border-2 border-amber bg-amber-soft p-3 text-sm text-ink">
      <Icon name="speaker" className="size-6 shrink-0 text-amber-dark" />
      <div className="flex-1">
        <p className="font-bold">{noApi ? t('audio.noApiTitle') : t('audio.noVoiceTitle')}</p>
        <p>{noApi ? t('audio.noApiBody') : t('audio.noVoiceBody')}</p>
      </div>
      <button
        type="button"
        className="self-start rounded-lg p-1 hover:bg-white"
        aria-label={t('audio.dismiss')}
        onClick={() => {
          setHidden(true);
          try {
            sessionStorage.setItem('zdravei:audio-warning', '1');
          } catch {
            /* ignore */
          }
        }}
      >
        <Icon name="close" className="size-5" />
      </button>
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <main id="main" tabIndex={-1} className="mx-auto w-full max-w-2xl px-4 pt-4 pb-28 focus:outline-none">
      {children}
    </main>
  );
}
