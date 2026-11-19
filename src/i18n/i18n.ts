/**
 * UI strings. Each UI language has its own JSON file; add a language by adding
 * a file here and to UI_LANGS in content/schema.ts (see README).
 */
import en from './en.json';
import he from './he.json';
import type { UiLang } from '../content/schema';
import { useStore } from '../state/store';

export type StringKey = keyof typeof en;
export const STRINGS: Record<UiLang, Record<StringKey, string>> = { en, he };
export const DIR: Record<UiLang, 'ltr' | 'rtl'> = { en: 'ltr', he: 'rtl' };

/**
 * Looks up a string. When vars.n === 1 and a "<key>.one" entry exists, that
 * singular form is used (e.g. "1-day streak" / "רצף של יום אחד").
 */
export function translate(lang: UiLang, key: StringKey, vars?: Record<string, string | number>): string {
  const table = STRINGS[lang] as Record<string, string>;
  const singular = vars?.n === 1 ? table[`${key}.one`] : undefined;
  let s = singular ?? STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

export function useT() {
  const lang = useStore((s) => s.settings.uiLang);
  return (key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars);
}

export function useLang(): UiLang {
  return useStore((s) => s.settings.uiLang);
}
