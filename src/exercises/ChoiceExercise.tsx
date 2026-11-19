import { useCallback, useEffect, useState } from 'react';
import type { Item } from '../content/schema';
import type { ChoiceView, Resolved } from '../engine/exercises';
import { Bg, MixedText, useBgText } from '../components/Bg';
import { Icon } from '../components/Icon';
import { playItem } from '../components/ui';
import { useLang, useT } from '../i18n/i18n';
import { PromptView, useNumberKeys } from './common';
import type { ExProps } from './common';

type ChoiceR = Extract<Resolved, { kind: 'choice' }>;

function ChoiceLabel({ item, view }: { item: Item; view: ChoiceView }) {
  const lang = useLang();
  const bgText = useBgText(item);
  switch (view) {
    case 'l1':
      return <MixedText text={item[lang]} />;
    case 'bg':
      return <Bg className="text-xl">{bgText}</Bg>;
    case 'translit':
      return (
        <span dir="ltr" className="text-2xl">
          {item.translit}
        </span>
      );
    case 'letter':
      return <Bg className="text-3xl">{item.bg}</Bg>;
  }
}

export function ChoiceExercise({ r, locked, onChange }: ExProps<ChoiceR>) {
  const t = useT();
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => setPicked(null), [r]);

  const pick = useCallback(
    (i: number) => {
      if (locked) return;
      setPicked(i);
      const it = r.choices[i];
      if (r.view === 'bg' || r.view === 'letter') void playItem(it);
      onChange({ verdict: it.id === r.answer.id ? 'correct' : 'wrong' });
    },
    [locked, r, onChange],
  );
  useNumberKeys(r.choices.length, pick, !locked);

  return (
    <div className="flex flex-col gap-6">
      <PromptView prompt={r.prompt} />
      <div role="radiogroup" aria-label={t(r.titleKey as never)} className="grid gap-3 sm:grid-cols-2">
        {r.choices.map((it, i) => {
          const isPicked = picked === i;
          const isAnswer = it.id === r.answer.id;
          const state = locked ? (isAnswer ? 'right' : isPicked ? 'wrong' : 'idle') : isPicked ? 'picked' : 'idle';
          const cls = {
            idle: 'border-line bg-white hover:bg-surface',
            picked: 'border-sky-600 bg-sky-50 ring-2 ring-sky-600',
            right: 'border-brand bg-brand-soft',
            wrong: 'border-danger bg-danger-soft',
          }[state];
          return (
            <button
              key={it.id + i}
              type="button"
              role="radio"
              aria-checked={isPicked}
              disabled={locked && !isPicked && !isAnswer}
              onClick={() => pick(i)}
              className={`chunky flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 text-start text-lg font-medium text-ink ${cls}`}
            >
              <kbd aria-hidden className="hidden size-7 shrink-0 items-center justify-center rounded-lg border-2 border-line text-sm text-muted sm:inline-flex">
                {i + 1}
              </kbd>
              <span className="flex-1">
                <ChoiceLabel item={it} view={r.view} />
              </span>
              {state === 'right' && <Icon name="check" className="size-6 text-brand" label={t('fb.correct')} />}
              {state === 'wrong' && <Icon name="x" className="size-6 text-danger" label={t('fb.wrong')} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
