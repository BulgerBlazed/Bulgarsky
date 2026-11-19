/**
 * Pluggable audio. Exercises call `audio.play(clip)`; which backend speaks is
 * decided here. Recorded files (item.audio) win over text-to-speech.
 */
export interface AudioClip {
  /** Bulgarian text to speak with TTS */
  text: string;
  /** Recorded file path relative to /audio/ (from item.audio) */
  src?: string;
}

export interface AudioStatus {
  available: boolean;
  /** Name of the Bulgarian voice in use, if any */
  voiceName?: string;
  reason?: 'no-speech-api' | 'no-bg-voice';
}

export interface AudioProvider {
  readonly id: string;
  init(): Promise<AudioStatus>;
  play(clip: AudioClip, opts?: { slow?: boolean }): Promise<void>;
  stop(): void;
}

/** Web Speech API, lang "bg-BG". */
export class WebSpeechProvider implements AudioProvider {
  readonly id = 'web-speech';
  private voice: SpeechSynthesisVoice | null = null;

  init(): Promise<AudioStatus> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve({ available: false, reason: 'no-speech-api' });
    }
    const pick = (): AudioStatus => {
      const voices = speechSynthesis.getVoices();
      this.voice =
        voices.find((v) => v.lang.toLowerCase() === 'bg-bg') ??
        voices.find((v) => v.lang.toLowerCase().startsWith('bg')) ??
        null;
      return this.voice
        ? { available: true, voiceName: this.voice.name }
        : { available: false, reason: 'no-bg-voice' };
    };
    const now = pick();
    if (now.available || speechSynthesis.getVoices().length > 0) return Promise.resolve(now);
    // Voices load asynchronously in Chrome/Edge.
    return new Promise((resolve) => {
      const done = () => resolve(pick());
      speechSynthesis.addEventListener('voiceschanged', done, { once: true });
      setTimeout(done, 1500);
    });
  }

  play(clip: AudioClip, opts?: { slow?: boolean }): Promise<void> {
    if (!('speechSynthesis' in window)) return Promise.resolve();
    speechSynthesis.cancel();
    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(clip.text);
      u.lang = 'bg-BG';
      if (this.voice) u.voice = this.voice;
      u.rate = opts?.slow ? 0.6 : 0.9;
      u.onend = () => resolve();
      u.onerror = () => resolve();
      speechSynthesis.speak(u);
    });
  }

  stop() {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
  }
}

/** Plays pre-recorded files from /public/audio. */
export class RecordedAudioProvider implements AudioProvider {
  readonly id = 'recorded';
  private el: HTMLAudioElement | null = null;
  constructor(private baseUrl = `${import.meta.env.BASE_URL}audio/`) {}
  init(): Promise<AudioStatus> {
    return Promise.resolve({ available: typeof Audio !== 'undefined' });
  }
  play(clip: AudioClip, opts?: { slow?: boolean }): Promise<void> {
    if (!clip.src) return Promise.reject(new Error('no recording'));
    this.stop();
    const el = new Audio(this.baseUrl + clip.src);
    el.playbackRate = opts?.slow ? 0.7 : 1;
    this.el = el;
    return new Promise((resolve, reject) => {
      el.onended = () => resolve();
      el.onerror = () => reject(new Error(`failed to load ${clip.src}`));
      el.play().catch(reject);
    });
  }
  stop() {
    this.el?.pause();
    this.el = null;
  }
}

/** Recorded audio when the clip has a file, TTS otherwise (or if the file fails). */
export class HybridAudio implements AudioProvider {
  readonly id = 'hybrid';
  constructor(private recorded: AudioProvider, private tts: AudioProvider) {}
  init() {
    void this.recorded.init();
    return this.tts.init();
  }
  async play(clip: AudioClip, opts?: { slow?: boolean }) {
    if (clip.src) {
      try {
        return await this.recorded.play(clip, opts);
      } catch {
        /* fall through to TTS */
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
