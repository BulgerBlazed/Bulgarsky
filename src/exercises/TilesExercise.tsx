import { useCallback, useEffect, useState } from 'react';
import type { Resolved } from '../engine/exercises';
import { checkTiles } from '../engine/answerMatch';
import { shouldShowStress, stripStress } from '../components/Bg';
import { useStore } from '../state/store';
import { DIR, useLang, useT } from '../i18n/i18n';
import { PromptView, useNumberKeys } from './common';
import type { ExProps } from './common';

type TilesR = Extract<Resolved, { kind: 'tiles' }>;

/**
 * Word-bank sentence building. Bulgarian tiles always flow LTR; tiles in the
 * instruction language follow the UI direction (RTL for Hebrew).
 */
export function TilesExercise({ r, locked, onChange }: ExProps<TilesR>) {
  const t = useT();
  const uiLang = useLang();
  const mode = useStore((s) => s.settings.stressMode);
  const reps = useStore((s) => s.progress.cards[r.answer.id]?.reps ?? 0);
  const [chosen, setChosen] = useState<number[]>([]);
  useEffect(() => setChosen([]), [r]);

  const isBg = r.lang === 'bg';
  const dir = isBg ? 'ltr' : DIR[uiLang];
  const label = (s: string) => (isBg && !shouldShowStress(mode, reps) ? stripStress(s) : s);

  const commit = useCallback(
    (next: number[]) => {
      setChosen(next);
      if (!next.length) return onChange(null);
      const words = next.map((i) => r.tiles[i]);
      onChange({ verdict: checkTiles(words, r.accepted, r.lang) ? 'correct' : 'wrong', given: words.join(' ') });
    },
    [r, onChange],
  );
  const add = useCallback((i: number) => !locked && !chosen.includes(i) && commit([...chosen, i]), [locked, chosen, commit]);
  const remove = (i: number) => !locked && commit(chosen.filter((x) => x !== i));
  useNumberKeys(r.tiles.length, add, !locked);

  useEffect(() => {
    if (locked) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Backspace' && chosen.length && (e.target as HTMLElement)?.tagName !== 'INPUT') {
        e.preventDefault();
        commit(chosen.slice(0, -1));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, chosen, commit]);

  const tileCls = 'chunky min-h-12 rounded-xl border-line bg-white px-3 py-2 text-lg font-medium text-ink hover:bg-surface';

  return (
    <div className="flex flex-col gap-6">
      <PromptView prompt={r.prompt} />
      <div
        dir={dir}
        lang={isBg ? 'bg' : uiLang}
        aria-label={t('ex.tilesAnswer')}
        role="group"
        className="flex min-h-16 flex-wrap content-start gap-2 border-b-2 border-line pb-3"
        data-testid="tiles-answer"
      >
        {chosen.map((i) => (
          <button key={i} type="button" className={tileCls} onClick={() => remove(i)} aria-label={t('ex.removeTile', { w: r.tiles[i] })} disabled={locked}>
            {label(r.tiles[i])}
          </button>
        ))}
      </div>
      <div dir={dir} lang={isBg ? 'bg' : uiLang} role="group" aria-label={t('ex.tilesBank')} className="flex flex-wrap justify-center gap-2" data-testid="tiles-bank">
        {r.tiles.map((w, i) =>
          chosen.includes(i) ? (
            <span key={i} aria-hidden className="min-h-12 rounded-xl bg-line px-3 py-2 text-lg text-transparent">
              {label(w)}
            </span>
          ) : (
            <button key={i} type="button" className={tileCls} onClick={() => add(i)} aria-label={t('ex.addTile', { w })} disabled={locked}>
              {label(w)}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
