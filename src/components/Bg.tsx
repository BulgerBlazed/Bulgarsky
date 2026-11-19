/**
 * Bidi-safe rendering of Bulgarian text.
 *
 * Bulgarian is always LTR. Inside a Hebrew (RTL) page every Bulgarian run is
 * isolated in <bdi dir="ltr" lang="bg"> so punctuation and word order stay
 * correct in mixed sentences.
 */
import type { ReactNode } from 'react';
import type { Item } from '../content/schema';
import { stripStress } from '../content/schema';
import { useStore } from '../state/store';
import type { StressMode } from '../state/store';

export function Bg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" lang="bg" className={className}>
      {children}
    </bdi>
  );
}

const WORD = '[\\u0400-\\u04FF][\\u0400-\\u04FF\\u0300-\\u036F]*';
/**
 * A Bulgarian run: Cyrillic words joined by spaces/punctuation, with an optional
 * leading hyphen (suffixes like "-те") and trailing ? or !. A trailing "." is
 * left outside because it usually ends the surrounding (Hebrew/English) sentence.
 */
export const BG_RUN = new RegExp(`-?${WORD}(?:[\\s,;:\\-–—]+-?${WORD}|[.!?…]+(?=\\s+${WORD}))*[?!]*`, 'g');

/** Splits text into plain and Bulgarian segments. Exported for tests. */
export function splitBg(text: string): { bg: boolean; text: string }[] {
  const clean = text.replace(/[‎‏]/g, '');
  const out: { bg: boolean; text: string }[] = [];
  let last = 0;
  for (const m of clean.matchAll(BG_RUN)) {
    const i = m.index ?? 0;
    if (i > last) out.push({ bg: false, text: clean.slice(last, i) });
    out.push({ bg: true, text: m[0] });
    last = i + m[0].length;
  }
  if (last < clean.length) out.push({ bg: false, text: clean.slice(last) });
  return out;
}

/** Text in the instruction language that may contain Bulgarian words. */
export function MixedText({ text, className }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {splitBg(text).map((seg, i) =>
        seg.bg ? (
          <Bg key={i} className="font-medium">
            {seg.text}
          </Bg>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </span>
  );
}

export function shouldShowStress(mode: StressMode, reps: number): boolean {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return reps < 3;
}

/** Display form of an item's Bulgarian text according to the stress setting. */
export function useBgText(item: Item): string {
  const mode = useStore((s) => s.settings.stressMode);
  const reps = useStore((s) => s.progress.cards[item.id]?.reps ?? 0);
  return shouldShowStress(mode, reps) ? item.stressed : item.bg;
}

/** Bulgarian text + optional transliteration lines (Latin / Hebrew letters). */
export function BgItem({
  item,
  size = 'lg',
  showTranslit,
  className = '',
}: {
  item: Item;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTranslit?: boolean;
  className?: string;
}) {
  const settings = useStore((s) => s.settings);
  const text = useBgText(item);
  const translit = showTranslit ?? settings.showTranslit;
  const sizes = { sm: 'text-base', md: 'text-xl', lg: 'text-2xl sm:text-3xl', xl: 'text-5xl sm:text-6xl' } as const;
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <Bg className={`${sizes[size]} font-semibold text-ink`}>{text}</Bg>
      {translit && (
        <span dir="ltr" lang="bg-Latn" className="text-sm text-muted">
          {item.translit}
        </span>
      )}
      {settings.showTranslitHe && item.translitHe && (
        <span dir="rtl" lang="he" className="text-sm text-muted">
          {item.translitHe}
        </span>
      )}
    </span>
  );
}

export { stripStress };
