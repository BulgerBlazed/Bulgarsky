import { useEffect } from 'react';
import type { Verdict } from '../engine/answerMatch';
import type { Prompt } from '../engine/exercises';
import { BgItem, MixedText } from '../components/Bg';
import { SpeakerButton, playItem } from '../components/ui';
import { useLang } from '../i18n/i18n';

export interface Evaluation {
  verdict: Verdict;
  /** What the learner entered (for typed answers) */
  given?: string;
  /** Closest accepted answer when it was a typo */
  closest?: string;
  hint?: 'latin-script';
  /** Speaking: learner rated themselves */
  selfAssessed?: boolean;
  /** Submit immediately (match completed, speaking rated) */
  autoSubmit?: boolean;
}

export interface ExProps<R> {
  r: R;
  locked: boolean;
  onChange: (e: Evaluation | null) => void;
}

/** Number keys 1–9 pick options on desktop (ignored while typing in a field). */
export function useNumberKeys(count: number, onPick: (index: number) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const n = Number(e.key);
      if (Number.isInteger(n) && n >= 1 && n <= Math.min(9, count)) {
        e.preventDefault();
        onPick(n - 1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [count, onPick, enabled]);
}

/** Renders the question part of an exercise and auto-plays audio when relevant. */
export function PromptView({ prompt }: { prompt: Prompt }) {
  const lang = useLang();
  const { item } = prompt;
  useEffect(() => {
    if (prompt.type !== 'l1') {
      const id = setTimeout(() => void playItem(item), 250);
      return () => clearTimeout(id);
    }
  }, [prompt.type, item]);

  switch (prompt.type) {
    case 'bg':
      return (
        <div className="flex items-center gap-4">
          <SpeakerButton item={item} />
          <BgItem item={item} />
        </div>
      );
    case 'l1':
      return (
        <p className="text-2xl font-semibold text-ink">
          <MixedText text={item[lang]} />
        </p>
      );
    case 'audio':
      return (
        <div className="flex items-end justify-center gap-4 py-2">
          <SpeakerButton item={item} size="lg" />
          <SpeakerButton item={item} size="md" slow />
        </div>
      );
    case 'letter':
      return (
        <div className="flex items-center justify-center gap-6 py-2">
          <BgItem item={item} size="xl" showTranslit={false} />
          <SpeakerButton item={item} />
        </div>
      );
    case 'sound':
      return (
        <div className="flex items-center justify-center gap-4 py-2">
          <SpeakerButton item={item} size="lg" />
          <span dir="ltr" className="text-3xl font-semibold text-ink">
            /{item.translit}/
          </span>
        </div>
      );
  }
}
