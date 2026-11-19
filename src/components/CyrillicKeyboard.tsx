/**
 * On-screen Bulgarian keyboard (phonetic layout) + physical-key phonetic mapping.
 * The keyboard is always laid out LTR, even in the Hebrew UI.
 */
import { useState } from 'react';
import type { RefObject } from 'react';
import { useT } from '../i18n/i18n';
import { Icon } from './Icon';

export const KEY_ROWS = [
  ['я', 'в', 'е', 'р', 'т', 'ъ', 'у', 'и', 'о', 'п', 'ш', 'щ'],
  ['а', 'с', 'д', 'ф', 'г', 'х', 'й', 'к', 'л', 'ю', 'ч'],
  ['з', 'ь', 'ц', 'ж', 'б', 'н', 'м', 'ѝ'],
];

/** Traditional Bulgarian phonetic layout: Latin key → Cyrillic letter. */
export const PHONETIC: Record<string, string> = {
  q: 'я', w: 'в', e: 'е', r: 'р', t: 'т', y: 'ъ', u: 'у', i: 'и', o: 'о', p: 'п', '[': 'ш', ']': 'щ',
  a: 'а', s: 'с', d: 'д', f: 'ф', g: 'г', h: 'х', j: 'й', k: 'к', l: 'л', '\\': 'ю', '`': 'ч',
  z: 'з', x: 'ь', c: 'ц', v: 'ж', b: 'б', n: 'н', m: 'м',
};

export function phoneticChar(key: string): string | null {
  const lower = key.toLowerCase();
  const ch = PHONETIC[lower];
  if (!ch) return null;
  return key !== lower ? ch.toUpperCase() : ch;
}

/** Inserts text at the caret of a controlled input and returns the new value. */
export function insertAt(el: HTMLInputElement | null, value: string, text: string): { value: string; caret: number } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  return { value: value.slice(0, start) + text + value.slice(end), caret: start + text.length };
}

export function deleteBefore(el: HTMLInputElement | null, value: string): { value: string; caret: number } {
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? value.length;
  if (start !== end) return { value: value.slice(0, start) + value.slice(end), caret: start };
  if (start === 0) return { value, caret: 0 };
  // Remove a whole grapheme (letter + combining stress mark) if present.
  const cut = /[̀-ͯ]/.test(value[start - 1]) && start > 1 ? 2 : 1;
  return { value: value.slice(0, start - cut) + value.slice(end), caret: start - cut };
}

export function CyrillicKeyboard({
  inputRef,
  value,
  onChange,
  disabled,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const [shift, setShift] = useState(false);

  const apply = (r: { value: string; caret: number }) => {
    onChange(r.value);
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus({ preventScroll: true });
        el.setSelectionRange(r.caret, r.caret);
      }
    });
  };
  const type = (ch: string) => {
    apply(insertAt(inputRef.current, value, shift ? ch.toUpperCase() : ch));
    setShift(false);
  };

  const keyCls =
    'min-h-11 min-w-0 flex-1 rounded-lg border-b-4 border-line bg-white text-lg font-medium text-ink shadow-sm active:translate-y-0.5 active:border-b-2 disabled:opacity-50';

  return (
    <div dir="ltr" lang="bg" role="group" aria-label={t('ex.keyboard')} className="mx-auto mt-3 flex w-full max-w-xl flex-col gap-1.5 rounded-2xl bg-surface p-2 select-none">
      {KEY_ROWS.map((row, i) => (
        <div key={i} className="flex gap-1">
          {i === 2 && (
            <button
              type="button"
              className={`${keyCls} flex-[1.4] ${shift ? 'bg-brand-soft' : ''}`}
              aria-pressed={shift}
              aria-label={t('ex.shift')}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setShift((s) => !s)}
            >
              <Icon name="shift" className="mx-auto size-5" />
            </button>
          )}
          {row.map((ch) => (
            <button key={ch} type="button" className={keyCls} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={() => type(ch)}>
              {shift ? ch.toUpperCase() : ch}
            </button>
          ))}
          {i === 2 && (
            <button
              type="button"
              className={`${keyCls} flex-[1.4]`}
              aria-label={t('ex.backspace')}
              disabled={disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => apply(deleteBefore(inputRef.current, value))}
            >
              <Icon name="backspace" className="mx-auto size-5" />
            </button>
          )}
        </div>
      ))}
      <div className="flex gap-1">
        <button
          type="button"
          className={`${keyCls} flex-[6] text-sm text-muted`}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => type(' ')}
        >
          {t('ex.space')}
        </button>
      </div>
    </div>
  );
}
