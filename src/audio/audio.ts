/**
 * Pluggable audio. Exercises call `audio.play(clip)`; which backend speaks is
 * decided here.
 *
 * Order of preference for a clip:
 *   1. a recorded file (item.audio, or an entry in /audio/manifest.json)
 *   2. the browser's Bulgarian text-to-speech voice (Web Speech API, bg-BG)
 * If neither exists, play() rejects with AudioUnavailableError instead of
 * silently doing nothing, so the UI can tell the learner.
 */
export interface AudioClip {
  /** Bulgarian text to speak with TTS */
  text: string;
  /** Item id, used to look up a recorded file in the manifest */
  itemId?: string;
  /** Recorded file path relative to /audio/ (from item.audio) */
  src?: string;
}

export interface AudioStatus {
  /** A Bulgarian TTS voice is available */
  available: boolean;
  /** Name of the Bulgarian voice in use, if any */
  voiceName?: string;
  reason?: 'no-speech-api' | 'no-bg-voice';
  /** Number of recorded clips found in /audio/manifest.json */
  recordings: number;
}

export class AudioUnavailableError extends Error {
  constructor(public reason: 'no-bg-voice' | 'no-speech-api' | 'blocked') {
    super(`audio unavailable: ${reason}`);
  }
}

export interface AudioProvider {
  readonly id: string;
  init(): Promise<AudioStatus>;
  /** Current status (updates as voices load) */
  status(): AudioStatus;
  /** Subscribe to status changes; returns an unsubscribe function */
  subscribe(fn: (s: AudioStatus) => void): () => void;
  /** True if this clip can actually be heard right now */
  canPlay(clip: AudioClip): boolean;
  play(clip: AudioClip, opts?: { slow?: boolean }): Promise<void>;
  stop(): void;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const hasSpeech = () => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

/** Picks the best Bulgarian voice: natural/online voices first, then any bg voice. */
export function pickBulgarianVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const bg = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith('bg'));
  if (!bg.length) return null;
  const score = (v: SpeechSynthesisVoice) => (/natural|neural|online/i.test(v.name) ? 2 : 0) + (v.lang.toLowerCase().replace('_', '-') === 'bg-bg' ? 1 : 0);
  return [...bg].sort((a, b) => score(b) - score(a))[0];
}

/** Web Speech API, lang "bg-BG". */
export class WebSpeechProvider implements AudioProvider {
  readonly id = 'web-speech';
  private voice: SpeechSynthesisVoice | null = null;
  private voicesSeen = 0;
  private listeners = new Set<(s: AudioStatus) => void>();
  private initPromise: Promise<AudioStatus> | null = null;
  /** Keep a reference so Chrome doesn't garbage-collect a playing utterance. */
  private current: SpeechSynthesisUtterance | null = null;

  status(): AudioStatus {
    if (!hasSpeech()) return { available: false, reason: 'no-speech-api', recordings: 0 };
    return this.voice
      ? { available: true, voiceName: this.voice.name, recordings: 0 }
      : { available: false, reason: 'no-bg-voice', recordings: 0 };
  }

  subscribe(fn: (s: AudioStatus) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private refresh = () => {
    const voices = speechSynthesis.getVoices();
    this.voicesSeen = voices.length;
    const before = this.voice?.name;
    this.voice = pickBulgarianVoice(voices);
    if (this.voice?.name !== before) for (const fn of this.listeners) fn(this.status());
  };

  init(): Promise<AudioStatus> {
    if (this.initPromise) return this.initPromise;
    if (!hasSpeech()) return (this.initPromise = Promise.resolve(this.status()));
    // Voices load asynchronously, and Edge adds its online (natural) voices
    // in a later batch — keep listening for the whole session.
    speechSynthesis.addEventListener('voiceschanged', this.refresh);
    this.refresh();
    this.initPromise = (async () => {
      for (let waited = 0; !this.voice && waited < 2500; waited += 250) {
        await sleep(250);
        this.refresh();
      }
      return this.status();
    })();
    return this.initPromise;
  }

  canPlay(): boolean {
    // If the browser reports no voices at all (some Android builds), we can't
    // know — let it try with lang="bg-BG".
    return hasSpeech() && (!!this.voice || this.voicesSeen === 0);
  }

  async play(clip: AudioClip, opts?: { slow?: boolean }): Promise<void> {
    if (!hasSpeech()) throw new AudioUnavailableError('no-speech-api');
    if (!this.canPlay()) throw new AudioUnavailableError('no-bg-voice');
    // Chrome drops an utterance queued right after cancel(); give it a moment.
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
      await sleep(80);
    }
    // Chrome can get stuck "paused" after the tab was in the background.
    speechSynthesis.resume();
    await new Promise<void>((resolve, reject) => {
      const u = new SpeechSynthesisUtterance(clip.text);
      u.lang = this.voice?.lang ?? 'bg-BG';
      if (this.voice) u.voice = this.voice;
      u.rate = opts?.slow ? 0.6 : 0.9;
      let done = false;
      const finish = (err?: Error) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        if (this.current === u) this.current = null;
        if (err) reject(err);
        else resolve();
      };
      // Safety net: some engines never fire onend.
      const timer = setTimeout(() => finish(), 4000 + clip.text.length * 250);
      u.onend = () => finish();
      u.onerror = (e) => {
        const kind = (e as SpeechSynthesisErrorEvent).error;
        if (kind === 'interrupted' || kind === 'canceled') finish();
        else finish(new AudioUnavailableError(kind === 'not-allowed' ? 'blocked' : 'no-bg-voice'));
      };
      this.current = u;
      speechSynthesis.speak(u);
    });
  }

  stop() {
    if (hasSpeech()) speechSynthesis.cancel();
  }
}

/** Plays pre-recorded files from /public/audio (see scripts/generate-audio.ts). */
export class RecordedAudioProvider implements AudioProvider {
  readonly id = 'recorded';
  private el: HTMLAudioElement | null = null;
  private manifest = new Map<string, string>();
  private loaded: Promise<AudioStatus> | null = null;
  private listeners = new Set<(s: AudioStatus) => void>();
  constructor(private baseUrl = `${import.meta.env.BASE_URL}audio/`) {}

  status(): AudioStatus {
    return { available: false, recordings: this.manifest.size };
  }
  subscribe(fn: (s: AudioStatus) => void) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  init(): Promise<AudioStatus> {
    this.loaded ??= (async () => {
      try {
        const res = await fetch(`${this.baseUrl}manifest.json`, { cache: 'no-cache' });
        if (res.ok) {
          const data = (await res.json()) as Record<string, string>;
          for (const [id, file] of Object.entries(data)) this.manifest.set(id, file);
          for (const fn of this.listeners) fn(this.status());
        }
      } catch {
        /* no recordings shipped */
      }
      return this.status();
    })();
    return this.loaded;
  }

  srcFor(clip: AudioClip): string | undefined {
    return clip.src ?? (clip.itemId ? this.manifest.get(clip.itemId) : undefined);
  }

  canPlay(clip: AudioClip): boolean {
    return typeof Audio !== 'undefined' && !!this.srcFor(clip);
  }

  play(clip: AudioClip, opts?: { slow?: boolean }): Promise<void> {
    const src = this.srcFor(clip);
    if (!src) return Promise.reject(new AudioUnavailableError('no-bg-voice'));
    this.stop();
    const el = new Audio(this.baseUrl + src);
    el.playbackRate = opts?.slow ? 0.7 : 1;
    el.preservesPitch = true;
    this.el = el;
    return new Promise((resolve, reject) => {
      el.onended = () => resolve();
      el.onerror = () => reject(new Error(`failed to load ${src}`));
      el.play().catch((e: Error) => reject(e.name === 'NotAllowedError' ? new AudioUnavailableError('blocked') : e));
    });
  }

  stop() {
    this.el?.pause();
    this.el = null;
  }
}

/** Recorded audio when a file exists, TTS otherwise (or if the file fails). */
export class HybridAudio implements AudioProvider {
  readonly id = 'hybrid';
  private initPromise: Promise<AudioStatus> | null = null;
  constructor(private recorded: RecordedAudioProvider, private tts: AudioProvider) {}

  status(): AudioStatus {
    return { ...this.tts.status(), recordings: this.recorded.status().recordings };
  }
  subscribe(fn: (s: AudioStatus) => void) {
    const a = this.tts.subscribe(() => fn(this.status()));
    const b = this.recorded.subscribe(() => fn(this.status()));
    return () => {
      a();
      b();
    };
  }
  init() {
    this.initPromise ??= Promise.all([this.recorded.init(), this.tts.init()]).then(() => this.status());
    return this.initPromise;
  }
  canPlay(clip: AudioClip) {
    return this.recorded.canPlay(clip) || this.tts.canPlay(clip);
  }
  async play(clip: AudioClip, opts?: { slow?: boolean }) {
    if (this.recorded.canPlay(clip)) {
      try {
        return await this.recorded.play(clip, opts);
      } catch (e) {
        if (e instanceof AudioUnavailableError && e.reason === 'blocked') throw e;
        /* broken file: fall through to TTS */
      }
    }
    return this.tts.play(clip, opts);
  }
  stop() {
    this.recorded.stop();
    this.tts.stop();
  }
}

export const audio: AudioProvider = new HybridAudio(new RecordedAudioProvider(), new WebSpeechProvider());
