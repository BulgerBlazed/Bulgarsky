import { useState } from 'react';
import { useStore } from '../state/store';
import type { Settings } from '../state/store';
import { useT } from '../i18n/i18n';
import { audio } from '../audio/audio';
import { Icon } from '../components/Icon';
import { Button, Card, Segmented, Toggle, useAudioStatus } from '../components/ui';
import { Page, TopBar } from '../components/Shell';

export function SettingsScreen() {
  const t = useT();
  const s = useStore((st) => st.settings);
  const set = useStore((st) => st.setSettings);
  const reset = useStore((st) => st.resetProgress);
  const status = useAudioStatus();
  const [test, setTest] = useState<'idle' | 'playing' | 'ok' | 'failed'>('idle');

  return (
    <>
      <TopBar />
      <Page>
        <h1 className="mb-4 text-3xl font-bold text-ink">{t('settings.title')}</h1>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-3">
            <h2 className="font-bold text-ink">{t('settings.language')}</h2>
            <Segmented
              label={t('settings.language')}
              value={s.uiLang}
              onChange={(uiLang) => set({ uiLang })}
              options={[
                { value: 'en', label: 'English', lang: 'en' },
                { value: 'he', label: 'עברית', lang: 'he' },
              ]}
            />
          </Card>

          <Card className="flex flex-col divide-y-2 divide-line">
            <Toggle label={t('settings.translit')} checked={s.showTranslit} onChange={(v) => set({ showTranslit: v })} />
            <Toggle label={t('settings.translitHe')} note={t('settings.translitHeNote')} checked={s.showTranslitHe} onChange={(v) => set({ showTranslitHe: v })} />
            <Toggle label={t('settings.phonetic')} note={t('settings.phoneticNote')} checked={s.phoneticKeys} onChange={(v) => set({ phoneticKeys: v })} />
            <Toggle label={t('settings.hearts')} note={t('settings.heartsNote')} checked={s.hearts} onChange={(v) => set({ hearts: v })} />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-bold text-ink">{t('settings.stress')}</h2>
            <Segmented<Settings['stressMode']>
              label={t('settings.stress')}
              value={s.stressMode}
              onChange={(stressMode) => set({ stressMode })}
              options={[
                { value: 'new', label: t('settings.stressNew') },
                { value: 'always', label: t('settings.stressAlways') },
                { value: 'never', label: t('settings.stressNever') },
              ]}
            />
            <h2 className="mt-2 font-bold text-ink">{t('settings.goal')}</h2>
            <Segmented<Settings['dailyGoalMin']>
              label={t('settings.goal')}
              value={s.dailyGoalMin}
              onChange={(dailyGoalMin) => set({ dailyGoalMin })}
              options={[5, 10, 20].map((n) => ({ value: n as Settings['dailyGoalMin'], label: t('settings.goalMin', { n }) }))}
            />
          </Card>

          <Card className="flex flex-col gap-3">
            <h2 className="font-bold text-ink">{t('settings.audio')}</h2>
            {status?.available ? (
              <p className="inline-flex items-center gap-2 text-ink">
                <Icon name="check" className="size-5 text-brand" />
                {t('settings.audioOk', { name: status.voiceName ?? 'bg-BG' })}
              </p>
            ) : status ? (
              <div className="flex items-start gap-2 text-ink">
                <Icon name="mute" className="mt-0.5 size-5 shrink-0 text-amber-dark" />
                <div className="flex flex-col gap-1">
                  <p className="font-semibold">{status.reason === 'no-speech-api' ? t('audio.noApiTitle') : t('audio.noVoiceTitle')}</p>
                  <p>{status.reason === 'no-speech-api' ? t('audio.noApiBody') : t('audio.noVoiceBody')}</p>
                </div>
              </div>
            ) : null}
            {status && status.recordings > 0 && (
              <p className="inline-flex items-center gap-2 text-ink">
                <Icon name="check" className="size-5 text-brand" />
                {t('settings.audioRecordings', { n: status.recordings })}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setTest('playing');
                  audio
                    .play({ text: 'Здравей! Как си?', itemId: 'u3.zdravey' })
                    .then(() => setTest('ok'))
                    .catch(() => setTest('failed'));
                }}
              >
                <Icon name="speaker" />
                {t('settings.audioTest')}
              </Button>
              <span role="status" aria-live="polite" className="text-sm">
                {test === 'ok' && t('settings.audioTestOk')}
                {test === 'failed' && <span className="font-semibold text-danger">{t('settings.audioTestFailed')}</span>}
              </span>
            </div>
          </Card>

          <p className="text-sm text-muted">{t('settings.about')}</p>
          <Button
            variant="secondary"
            className="self-start text-danger"
            onClick={() => {
              if (window.confirm(t('settings.resetConfirm'))) reset();
            }}
          >
            {t('settings.reset')}
          </Button>
        </div>
      </Page>
    </>
  );
}
