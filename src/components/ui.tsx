import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { AudioUnavailableError, audio } from '../audio/audio';
import type { AudioClip, AudioStatus } from '../audio/audio';
import type { Item } from '../content/schema';
import { useT } from '../i18n/i18n';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'amber';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white border-brand-dark hover:brightness-110',
  secondary: 'bg-white text-ink border-line hover:bg-surface',
  danger: 'bg-danger text-white border-danger-dark hover:brightness-110',
  amber: 'bg-amber text-ink border-amber-dark hover:brightness-105',
  ghost: 'bg-transparent text-brand border-transparent hover:bg-brand-soft',
};

export function Button({
  variant = 'primary',
  className = '',
  children,
  ...rest
}: ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`chunky inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 py-3 text-base font-semibold ${VARIANTS[variant]} disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

/** Progress bar that fills from the inline-start edge, so it flips under RTL. */
export function ProgressBar({ value, label, className = '', tone = 'brand' }: { value: number; label: string; className?: string; tone?: 'brand' | 'amber' }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className={`h-4 w-full overflow-hidden rounded-full bg-line ${className}`}
    >
      <div className={`h-full rounded-full transition-[width] duration-500 ${tone === 'amber' ? 'bg-amber' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const clipFor = (item: Item): AudioClip => ({ text: item.say ?? item.bg, itemId: item.id, src: item.audio });

export function SpeakerButton({ item, size = 'md', slow = false }: { item: Item; size?: 'sm' | 'md' | 'lg'; slow?: boolean }) {
  const t = useT();
  const status = useAudioStatus();
  const playable = !status || audio.canPlay(clipFor(item));
  const dims = { sm: 'size-10', md: 'size-12', lg: 'size-20' }[size];
  return (
    <button
      type="button"
      onClick={() => void playItem(item, slow, true)}
      className={`chunky ${dims} inline-flex items-center justify-center rounded-2xl text-white hover:brightness-110 ${playable ? 'border-sky-900 bg-sky-700' : 'border-slate-500 bg-slate-400'}`}
      aria-label={playable ? (slow ? t('ex.playSlow') : t('ex.play')) : t('audio.unavailable')}
      title={playable ? undefined : t('audio.unavailable')}
    >
      <Icon name={playable ? (slow ? 'turtle' : 'speaker') : 'mute'} className={size === 'lg' ? 'size-10' : 'size-6'} />
    </button>
  );
}

/**
 * Plays an item. When `explicit` (the learner tapped a speaker), failures are
 * reported with a visible notice; automatic playback fails quietly.
 */
export function playItem(item: Item, slow = false, explicit = false): Promise<void> {
  return audio.play(clipFor(item), { slow }).catch((e: unknown) => {
    if (explicit) showAudioNotice(e instanceof AudioUnavailableError ? e.reason : 'no-bg-voice');
  });
}

/* ---------- audio status + notices ---------- */

let initPromise: Promise<AudioStatus> | null = null;
/** Current audio status; re-renders when voices or recordings finish loading. */
export function useAudioStatus(): AudioStatus | null {
  const [status, setStatus] = useState<AudioStatus | null>(null);
  useEffect(() => {
    initPromise ??= audio.init();
    let alive = true;
    void initPromise.then(() => alive && setStatus(audio.status()));
    const unsub = audio.subscribe((s) => alive && setStatus(s));
    return () => {
      alive = false;
      unsub();
    };
  }, []);
  return status;
}

type NoticeReason = AudioUnavailableError['reason'];
const noticeListeners = new Set<(r: NoticeReason | null) => void>();
let noticeTimer: ReturnType<typeof setTimeout> | undefined;
export function showAudioNotice(reason: NoticeReason) {
  for (const fn of noticeListeners) fn(reason);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => noticeListeners.forEach((fn) => fn(null)), 6000);
}

/** Toast shown when the learner taps a speaker but no Bulgarian audio can play. */
export function AudioNotice() {
  const t = useT();
  const [reason, setReason] = useState<NoticeReason | null>(null);
  useEffect(() => {
    noticeListeners.add(setReason);
    return () => {
      noticeListeners.delete(setReason);
    };
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      {reason && (
        <div className="pointer-events-auto flex max-w-md items-start gap-3 rounded-2xl border-2 border-amber bg-amber-soft p-3 text-sm text-ink shadow-lg">
          <Icon name="mute" className="mt-0.5 size-5 shrink-0 text-amber-dark" />
          <p>{reason === 'blocked' ? t('audio.toastBlocked') : t('audio.toastNoVoice')}</p>
        </div>
      )}
    </div>
  );
}

export function Toggle({ checked, onChange, label, note }: { checked: boolean; onChange: (v: boolean) => void; label: string; note?: string }) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 py-2">
      <span className="flex flex-col">
        <span className="font-medium text-ink">{label}</span>
        {note && <span className="text-sm text-muted">{note}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        className="relative h-8 w-14 shrink-0 rounded-full bg-line transition peer-checked:bg-brand peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky-600 after:absolute after:top-1 after:start-1 after:size-6 after:rounded-full after:bg-white after:shadow after:transition-all peer-checked:after:start-7"
      />
    </label>
  );
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: ReactNode; lang?: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-2 rounded-2xl bg-surface p-1">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          lang={o.lang}
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-11 flex-1 rounded-xl px-3 font-semibold transition ${value === o.value ? 'bg-white text-brand shadow ring-2 ring-brand' : 'text-muted hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border-2 border-line bg-white p-4 ${className}`}>{children}</div>;
}
