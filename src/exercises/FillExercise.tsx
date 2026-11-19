import { useCallback, useEffect, useState } from 'react';
import type { Resolved } from '../engine/exercises';
import { Bg, MixedText } from '../components/Bg';
import { useLang, useT } from '../i18n/i18n';
import { useNumberKeys } from './common';
import type { ExProps } from './common';

type FillR = Extract<Resolved, { kind: 'fill' }>;

export function FillExercise({ r, locked, onChange }: ExProps<FillR>) {
  const t = useT();
  const lang = useLang();
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [r]);

  const pick = useCallback(
    (i: number) => {
      if (locked) return;
      setPicked(i);
      onChange({ verdict: r.options[i] === r.answer ? 'correct' : 'wrong', given: r.options[i] });
    },
    [locked, r, onChange],
  );
  useNumberKeys(r.options.length, pick, !locked);

  const filled = picked !== null ? r.options[picked] : null;
  return (
    <div className="flex flex-col gap-6">
      <p className="text-2xl font-semibold leading-relaxed text-ink">
        <Bg>
          {r.before}
          <span className={`mx-1 inline-block min-w-20 border-b-4 px-2 text-center ${filled ? 'border-sky-600 text-sky-800' : 'border-muted text-transparent'}`}>
            {filled ?? '___'}
            {!filled && <span className="sr-only">{t('ex.blank')}</span>}
          </span>
          {r.after}
        </Bg>
      </p>
      <p className="text-muted">
        <MixedText text={t('ex.translation', { t: r.translation[lang] })} />
      </p>
      <div role="radiogroup" aria-label={t('ex.fillBlank')} className="flex flex-wrap justify-center gap-3">
        {r.options.map((o, i) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={picked === i}
            onClick={() => pick(i)}
            disabled={locked}
            className={`chunky min-h-14 min-w-24 rounded-2xl px-4 text-xl font-medium text-ink ${picked === i ? 'border-sky-600 bg-sky-50 ring-2 ring-sky-600' : 'border-line bg-white hover:bg-surface'}`}
          >
            <Bg>{o}</Bg>
          </button>
        ))}
      </div>
    </div>
  );
}
