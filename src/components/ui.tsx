import type { ComponentProps, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { audio } from '../audio/audio';
import type { AudioStatus } from '../audio/audio';
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

export function SpeakerButton({ item, size = 'md', slow = false }: { item: Item; size?: 'sm' | 'md' | 'lg'; slow?: boolean }) {
  const t = useT();
  const dims = { sm: 'size-10', md: 'size-12', lg: 'size-20' }[size];
  return (
    <button
      type="button"
      onClick={() => void audio.play({ text: item.say ?? item.bg, src: item.audio }, { slow })}
      className={`chunky ${dims} inline-flex items-center justify-center rounded-2xl border-sky-900 bg-sky-700 text-white hover:brightness-110`}
      aria-label={slow ? t('ex.playSlow') : t('ex.play')}
    >
      <Icon name={slow ? 'turtle' : 'speaker'} className={size === 'lg' ? 'size-10' : 'size-6'} />
    </button>
  );
}

export function playItem(item: Item, slow = false) {
  return audio.play({ text: item.say ?? item.bg, src: item.audio }, { slow });
}

let statusPromise: Promise<AudioStatus> | null = null;
export function useAudioStatus(): AudioStatus | null {
  const [status, setStatus] = useState<AudioStatus | null>(null);
  useEffect(() => {
    statusPromise ??= audio.init();
    let alive = true;
    void statusPromise.then((s) => alive && setStatus(s));
    return () => {
      alive = false;
    };
  }, []);
  return status;
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
