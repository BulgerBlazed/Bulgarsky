import { useEffect, useRef, useState } from 'react';
import type { Resolved } from '../engine/exercises';
import { BgItem } from '../components/Bg';
import { Icon } from '../components/Icon';
import { Button, SpeakerButton, playItem } from '../components/ui';
import { useLang, useT } from '../i18n/i18n';
import { MixedText } from '../components/Bg';
import type { ExProps } from './common';

type SpeakR = Extract<Resolved, { kind: 'speak' }>;

/**
 * Speaking practice: record, listen back, compare with the model, then the
 * learner rates themselves. Clearly labelled as self-assessed; results never
 * feed the spaced-repetition scheduler.
 */
export function SpeakExercise({ r, locked, onChange }: ExProps<SpeakR>) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useState<'idle' | 'recording' | 'recorded'>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const micSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  const [micError, setMicError] = useState(!micSupported);

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url);
  }, [url]);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })));
        setState('recorded');
      };
      recRef.current = rec;
      rec.start();
      setState('recording');
    } catch {
      setMicError(true);
    }
  };
  const stop = () => recRef.current?.state === 'recording' && recRef.current.stop();

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-soft px-3 py-1 text-sm font-semibold text-ink">
        <Icon name="info" className="size-4" />
        {t('speak.selfAssessed')}
      </span>
      <div className="flex items-center gap-4">
        <SpeakerButton item={r.item} />
        <BgItem item={r.item} />
      </div>
      <p className="text-muted">
        <MixedText text={r.item[lang]} />
      </p>

      {micError ? (
        <p className="max-w-sm text-muted">{t('speak.noMic')}</p>
      ) : (
        <div className="flex flex-wrap justify-center gap-3">
          {state !== 'recording' ? (
            <Button variant="danger" onClick={start} disabled={locked}>
              <Icon name="mic" />
              {t('speak.record')}
            </Button>
          ) : (
            <Button variant="danger" onClick={stop} className="animate-pulse">
              <Icon name="stop" />
              {t('speak.stop')} · {t('speak.recording')}
            </Button>
          )}
          {url && state === 'recorded' && (
            <Button variant="secondary" onClick={() => void new Audio(url).play()}>
              <Icon name="play" />
              {t('speak.playback')}
            </Button>
          )}
          <Button variant="secondary" onClick={() => void playItem(r.item)}>
            <Icon name="speaker" />
            {t('speak.listenModel')}
          </Button>
        </div>
      )}

      {(state === 'recorded' || micError) && !locked && (
        <div className="flex flex-col items-center gap-3">
          <p className="font-medium text-ink">{t('speak.howDid')}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => onChange({ verdict: 'correct', selfAssessed: true, autoSubmit: true })}>
              <Icon name="check" />
              {t('speak.gotIt')}
            </Button>
            <Button variant="secondary" onClick={() => onChange({ verdict: 'wrong', selfAssessed: true, autoSubmit: true })}>
              <Icon name="x" />
              {t('speak.notQuite')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
