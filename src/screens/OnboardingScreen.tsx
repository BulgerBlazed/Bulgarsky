import { useState } from 'react';
import { useStore } from '../state/store';
import { navigate } from '../router';
import { useT } from '../i18n/i18n';
import { Bg } from '../components/Bg';
import { Icon } from '../components/Icon';
import { Button } from '../components/ui';

export function OnboardingScreen() {
  const t = useT();
  const [step, setStep] = useState<'lang' | 'start'>('lang');
  const uiLang = useStore((s) => s.settings.uiLang);
  const set = useStore((s) => s.setSettings);

  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-xl flex-col gap-8 px-5 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex size-24 items-center justify-center rounded-[2rem] bg-brand text-5xl font-bold text-white shadow-lg">
          <Bg>Зд</Bg>
        </span>
        <p className="text-4xl font-bold text-brand">
          <Bg>Здраве́й!</Bg>
        </p>
        <h1 className="text-2xl font-bold text-ink">{t('onb.welcome')}</h1>
        <p className="text-muted">{t('onb.sub')}</p>
      </div>

      {step === 'lang' ? (
        <section className="flex flex-col gap-4" aria-labelledby="onb-lang">
          <h2 id="onb-lang" className="text-center text-xl font-bold text-ink">
            {t('onb.chooseLang')}
          </h2>
          {(['en', 'he'] as const).map((l) => (
            <button
              key={l}
              type="button"
              lang={l}
              dir={l === 'he' ? 'rtl' : 'ltr'}
              aria-pressed={uiLang === l}
              onClick={() => set({ uiLang: l })}
              className={`chunky flex min-h-16 items-center justify-between rounded-2xl px-5 text-xl font-semibold ${uiLang === l ? 'border-brand-dark bg-brand-soft text-brand-dark ring-2 ring-brand' : 'border-line bg-white text-ink'}`}
            >
              {l === 'en' ? 'English' : 'עברית'}
              {uiLang === l && <Icon name="check" />}
            </button>
          ))}
          <Button onClick={() => setStep('start')} className="mt-2">
            {t('onb.next')}
            <Icon name="arrow" flipRtl className="size-5" />
          </Button>
        </section>
      ) : (
        <section className="flex flex-col gap-4" aria-labelledby="onb-start">
          <h2 id="onb-start" className="text-center text-xl font-bold text-ink">
            {t('onb.placement')}
          </h2>
          <Choice
            icon="star"
            title={t('onb.zero')}
            desc={t('onb.zeroDesc')}
            onClick={() => {
              set({ onboarded: true });
              navigate({ name: 'path' }, true);
            }}
          />
          <Choice
            icon="target"
            title={t('onb.test')}
            desc={t('onb.testDesc')}
            onClick={() => {
              set({ onboarded: true });
              navigate({ name: 'placement' }, true);
            }}
          />
          <Button variant="ghost" onClick={() => setStep('lang')}>
            <Icon name="back" flipRtl className="size-5" />
            {t('common.back')}
          </Button>
        </section>
      )}
    </main>
  );
}

function Choice({ icon, title, desc, onClick }: { icon: string; title: string; desc: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="chunky flex min-h-20 items-center gap-4 rounded-2xl border-line bg-white px-5 py-4 text-start hover:bg-surface">
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
        <Icon name={icon} />
      </span>
      <span className="flex flex-col">
        <span className="text-lg font-bold text-ink">{title}</span>
        <span className="text-muted">{desc}</span>
      </span>
    </button>
  );
}
