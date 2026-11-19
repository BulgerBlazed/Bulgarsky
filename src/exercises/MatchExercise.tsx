import { useEffect, useMemo, useState } from 'react';
import type { Resolved } from '../engine/exercises';
import { shuffle } from '../engine/exercises';
import { Bg, MixedText, useBgText } from '../components/Bg';
import type { Item } from '../content/schema';
import { Icon } from '../components/Icon';
import { playItem } from '../components/ui';
import { useLang, useT } from '../i18n/i18n';
import type { ExProps } from './common';

type MatchR = Extract<Resolved, { kind: 'match' }>;

function LeftLabel({ item }: { item: Item }) {
  const text = useBgText(item);
  return <Bg>{text}</Bg>;
}

export function MatchExercise({ r, locked, onChange }: ExProps<MatchR>) {
  const t = useT();
  const lang = useLang();
  const left = useMemo(() => shuffle(r.items), [r]);
  const right = useMemo(() => shuffle(r.items), [r]);
  const [sel, setSel] = useState<{ side: 'l' | 'r'; id: string } | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [miss, setMiss] = useState<string | null>(null);
  const [live, setLive] = useState('');

  useEffect(() => {
    setSel(null);
    setDone([]);
  }, [r]);

  const tap = (side: 'l' | 'r', it: Item) => {
    if (locked || done.includes(it.id)) return;
    if (side === 'l') void playItem(it);
    if (!sel || sel.side === side) return setSel({ side, id: it.id });
    if (sel.id === it.id) {
      const next = [...done, it.id];
      setDone(next);
      setSel(null);
      setLive(`${it.bg} — ${t('ex.matched')}`);
      if (next.length === r.items.length) onChange({ verdict: 'correct', autoSubmit: true });
    } else {
      setMiss(it.id + side);
      setLive(t('fb.wrong'));
      setTimeout(() => setMiss(null), 500);
      setSel(null);
    }
  };

  const cls = (side: 'l' | 'r', it: Item) => {
    if (done.includes(it.id)) return 'border-brand bg-brand-soft text-brand opacity-70';
    if (miss === it.id + side) return 'border-danger bg-danger-soft animate-shake';
    if (sel?.side === side && sel.id === it.id) return 'border-sky-600 bg-sky-50 ring-2 ring-sky-600';
    return 'border-line bg-white hover:bg-surface';
  };

  const column = (side: 'l' | 'r', list: Item[]) => (
    <div role="group" aria-label={side === 'l' ? t('ex.matchLeft') : t('ex.matchRight')} className="flex flex-col gap-3">
      {list.map((it) => (
        <button
          key={it.id}
          type="button"
          onClick={() => tap(side, it)}
          disabled={done.includes(it.id)}
          aria-pressed={sel?.side === side && sel.id === it.id}
          className={`chunky flex min-h-14 items-center justify-center gap-2 rounded-2xl px-3 py-2 text-lg font-medium text-ink ${cls(side, it)}`}
        >
          {done.includes(it.id) && <Icon name="check" className="size-5" label={t('ex.matched')} />}
          {side === 'l' ? <LeftLabel item={it} /> : r.rightView === 'translit' ? <span dir="ltr">{it.translit}</span> : <MixedText text={it[lang]} />}
        </button>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-2 gap-3">
      {column('l', left)}
      {column('r', right)}
      <p className="sr-only" aria-live="polite">
        {live}
      </p>
    </div>
  );
}
