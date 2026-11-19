import { useEffect, useMemo } from 'react';
import { getItem } from '../content/course';
import { useStore } from '../state/store';
import type { SessionKind, SessionOutcome } from '../state/store';
import { dayKey } from '../engine/streak';
import { useLang, useT } from '../i18n/i18n';
import { Bg, MixedText } from '../components/Bg';
import { Icon } from '../components/Icon';
import { Button, ProgressBar, SpeakerButton } from '../components/ui';

const CONFETTI_COLORS = ['#007a5a', '#c21f10', '#ffb020', '#ffffff', '#0369a1'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.6,
        dur: 1.6 + Math.random() * 1.2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
      })),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-80 overflow-hidden motion-reduce:hidden">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti absolute top-0 block h-3 w-2 rounded-sm border border-black/10"
          style={{ insetInlineStart: `${p.left}%`, background: p.color, animationDelay: `${p.delay}s`, animationDuration: `${p.dur}s`, rotate: `${p.rot}deg` }}
        />
      ))}
    </div>
  );
}

function fmtTime(ms: number) {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ResultsView({
  kind,
  outcome,
  xp,
  passPercent,
  onContinue,
  onReview,
}: {
  kind: SessionKind;
  outcome: SessionOutcome;
  xp: number;
  passPercent: number;
  onContinue: () => void;
  onReview?: (ids: string[]) => void;
}) {
  const t = useT();
  const lang = useLang();
  const progress = useStore((s) => s.progress);
  const goal = useStore((s) => s.settings.dailyGoalMin);
  const today = dayKey(new Date());
  const minutes = Math.round((progress.msByDay[today] ?? 0) / 60000);
  const pct = Math.round(outcome.accuracy * 100);
  const failed = outcome.passed === false;
  const mistakes = Object.entries(outcome.items)
    .filter(([, v]) => v.wrong > 0)
    .map(([id]) => id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onContinue();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onContinue]);

  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: dayKey(d), label: new Intl.DateTimeFormat(lang, { weekday: 'narrow' }).format(d) };
  });

  const title = { lesson: 'results.lesson', checkpoint: 'results.checkpoint', practice: 'results.practice', placement: 'results.placement' } as const;

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 px-4 py-8">
      {!failed && <Confetti />}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className={`inline-flex size-20 items-center justify-center rounded-full ${failed ? 'bg-amber-soft text-amber-dark' : 'bg-brand-soft text-brand'}`}>
          <Icon name={failed ? 'target' : 'trophy'} className="size-11" />
        </span>
        <h1 className="text-3xl font-bold text-ink">{t(title[kind])}</h1>
        {!failed && (
          <p className="text-2xl font-semibold text-brand">
            <Bg>Браво!</Bg>
          </p>
        )}
        {kind === 'checkpoint' && <p className="text-ink">{failed ? t('results.checkpointFailed', { p: passPercent }) : t('results.checkpointPassed')}</p>}
        {kind === 'placement' && <p className="text-ink">{outcome.passed ? t('results.placementPassed') : t('results.placementFailed')}</p>}
        {kind === 'lesson' && outcome.accuracy === 1 && <p className="text-ink">{t('results.perfect')}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat icon="bolt" tone="amber" label={t('results.xp')} value={`+${xp}`} />
        <Stat icon="target" tone="brand" label={t('results.accuracy')} value={`${pct}%`} />
        <Stat icon="clock" tone="sky" label={t('results.time')} value={fmtTime(outcome.ms)} />
      </div>

      {kind !== 'placement' && (
        <section className="flex flex-col gap-3 rounded-3xl border-2 border-line p-4" aria-label={t('results.streak', { n: progress.streak.current })}>
          <div className="flex items-center justify-between">
            <p className="inline-flex items-center gap-2 text-lg font-bold text-ink">
              <Icon name="flame" className="size-7 text-amber-dark" filled />
              {t('results.streak', { n: progress.streak.current })}
            </p>
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-sm text-sky-900">
              <Icon name="snow" className="size-4" />
              {t('results.freezes', { n: progress.streak.freezes })}
            </span>
          </div>
          <ol className="flex justify-between">
            {week.map((d) => {
              const v = progress.streak.calendar[d.key];
              return (
                <li key={d.key} className="flex flex-col items-center gap-1">
                  <span
                    className={`inline-flex size-9 items-center justify-center rounded-full border-2 ${v === 'done' ? 'border-amber-dark bg-amber' : v === 'freeze' ? 'border-sky-700 bg-sky-100' : 'border-line bg-white'}`}
                  >
                    {v === 'done' && <Icon name="check" className="size-5 text-ink" label={t('profile.legendDone')} />}
                    {v === 'freeze' && <Icon name="snow" className="size-5 text-sky-800" label={t('profile.legendFreeze')} />}
                  </span>
                  <span className="text-xs text-muted">{d.label}</span>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-ink">{t('results.goal')}</span>
            <span className="text-muted">{t('results.goalValue', { done: minutes, goal })}</span>
          </div>
          <ProgressBar value={minutes / goal} label={t('results.goal')} tone="amber" />
        </section>
      )}

      {mistakes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-bold text-ink">{t('results.review')}</h2>
          <ul className="flex flex-col gap-2">
            {mistakes.slice(0, 6).map((id) => {
              const it = getItem(id);
              return (
                <li key={id} className="flex items-center gap-3 rounded-2xl bg-surface px-3 py-2">
                  <SpeakerButton item={it} size="sm" />
                  <Bg className="text-lg font-semibold">{it.stressed}</Bg>
                  <span className="text-muted">
                    <MixedText text={it[lang]} />
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="mt-auto flex flex-col gap-3">
        <Button onClick={onContinue} className="w-full">
          {t('common.continue')}
        </Button>
        {mistakes.length > 0 && onReview && (
          <Button variant="ghost" onClick={() => onReview(mistakes)} className="w-full">
            {t('results.reviewMistakes')}
          </Button>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: 'amber' | 'brand' | 'sky' }) {
  const toneCls = { amber: 'border-amber bg-amber-soft text-amber-dark', brand: 'border-brand bg-brand-soft text-brand-dark', sky: 'border-sky-600 bg-sky-50 text-sky-900' }[tone];
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-center ${toneCls}`}>
      <span className="text-xs font-bold uppercase">{label}</span>
      <span className="inline-flex items-center gap-1 text-2xl font-bold text-ink">
        <Icon name={icon} className="size-5" />
        <span dir="ltr">{value}</span>
      </span>
    </div>
  );
}
