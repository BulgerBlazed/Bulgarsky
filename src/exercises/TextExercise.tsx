import { useEffect, useRef, useState } from 'react';
import type { Resolved } from '../engine/exercises';
import { checkAnswer } from '../engine/answerMatch';
import { CyrillicKeyboard, phoneticChar, insertAt } from '../components/CyrillicKeyboard';
import { Icon } from '../components/Icon';
import { useStore } from '../state/store';
import { useT } from '../i18n/i18n';
import { PromptView } from './common';
import type { ExProps } from './common';

type TextR = Extract<Resolved, { kind: 'text' }>;

export function TextExercise({ r, locked, onChange }: ExProps<TextR>) {
  const t = useT();
  const phonetic = useStore((s) => s.settings.phoneticKeys);
  const [value, setValue] = useState('');
  const [showKb, setShowKb] = useState(true);
  const ref = useRef<HTMLInputElement>(null);
  const isBg = r.lang === 'bg';

  useEffect(() => {
    setValue('');
    ref.current?.focus({ preventScroll: true });
  }, [r]);

  const update = (v: string) => {
    setValue(v);
    if (!v.trim()) return onChange(null);
    const res = checkAnswer(v, r.accepted, r.lang);
    onChange({ verdict: res.verdict, given: v, closest: res.closest, hint: res.hint });
  };

  return (
    <div className="flex flex-col gap-5">
      <PromptView prompt={r.prompt} />
      <label className="sr-only" htmlFor="answer">
        {isBg ? t('ex.typeHereBg') : t('ex.typeHere')}
      </label>
      <input
        id="answer"
        ref={ref}
        value={value}
        readOnly={locked}
        onChange={(e) => update(e.target.value)}
        onKeyDown={(e) => {
          if (!isBg || !phonetic || locked || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
          const ch = phoneticChar(e.key);
          if (!ch) return;
          e.preventDefault();
          const res = insertAt(ref.current, value, ch);
          update(res.value);
          requestAnimationFrame(() => ref.current?.setSelectionRange(res.caret, res.caret));
        }}
        dir={isBg ? 'ltr' : 'auto'}
        lang={isBg ? 'bg' : r.lang}
        placeholder={isBg ? t('ex.typeHereBg') : t('ex.typeHere')}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="done"
        className="min-h-14 w-full rounded-2xl border-2 border-line bg-white px-4 text-xl text-ink placeholder:text-muted focus:border-sky-600 focus:outline-none"
      />
      {isBg && (
        <>
          <button type="button" onClick={() => setShowKb((s) => !s)} className="inline-flex items-center gap-2 self-start rounded-xl px-2 py-1 text-sm font-semibold text-brand hover:bg-brand-soft" aria-expanded={showKb}>
            <Icon name="keyboard" className="size-5" />
            {showKb ? t('ex.keyboardHide') : t('ex.keyboardShow')}
          </button>
          {showKb && <CyrillicKeyboard inputRef={ref} value={value} onChange={update} disabled={locked} />}
        </>
      )}
    </div>
  );
}
