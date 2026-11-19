import { describe, expect, it } from 'vitest';
import { pickBulgarianVoice } from '../src/audio/audio';
import { needsAudio, readingAlternative } from '../src/engine/exercises';

const v = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

describe('pickBulgarianVoice', () => {
  it('returns null when there is no Bulgarian voice (the silent-audio case)', () => {
    expect(pickBulgarianVoice([v('Microsoft David', 'en-US'), v('Microsoft Asaf', 'he-IL')])).toBeNull();
  });
  it('prefers natural/online voices (Edge) over local ones', () => {
    const picked = pickBulgarianVoice([v('Microsoft Ivan', 'bg-BG'), v('Microsoft Kalina Online (Natural) - Bulgarian (Bulgaria)', 'bg-BG')]);
    expect(picked?.name).toMatch(/Kalina/);
  });
  it('accepts Android-style language tags', () => {
    expect(pickBulgarianVoice([v('bg', 'bg_BG')])?.name).toBe('bg');
  });
});

describe('readingAlternative', () => {
  it('turns listening exercises into reading ones with the same item and options', () => {
    expect(readingAlternative({ type: 'listenPick', item: 'u3.da', options: ['u3.da', 'u3.ne'] })).toEqual({
      type: 'mc', item: 'u3.da', dir: 'toL1', options: ['u3.da', 'u3.ne'], explain: undefined,
    });
    expect(readingAlternative({ type: 'listenType', item: 'u3.da' })).toMatchObject({ type: 'translate', dir: 'toBg', item: 'u3.da' });
    expect(readingAlternative({ type: 'letterSound', item: 'u1.a', dir: 'soundToLetter' })).toMatchObject({ dir: 'letterToSound' });
    expect(readingAlternative({ type: 'listenPick', item: 'u1.a' })).toMatchObject({ type: 'letterSound', dir: 'letterToSound' });
  });
  it('never produces an exercise that still needs audio', () => {
    for (const ex of [
      { type: 'listenPick', item: 'u3.da' },
      { type: 'listenType', item: 'u3.da' },
      { type: 'letterSound', item: 'u1.a', dir: 'soundToLetter' },
    ] as const) {
      expect(needsAudio(readingAlternative(ex))).toBe(false);
    }
  });
});
