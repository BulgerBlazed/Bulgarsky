import { getUnit } from '../content/course';
import { href } from '../router';
import { useLang, useT } from '../i18n/i18n';
import { Bg, MixedText } from '../components/Bg';
import { Icon } from '../components/Icon';
import { Card, SpeakerButton } from '../components/ui';
import { Page, TopBar } from '../components/Shell';
import { useStore } from '../state/store';

export function CheatSheetScreen({ unitId }: { unitId: string }) {
  const t = useT();
  const lang = useLang();
  const showHe = useStore((s) => s.settings.showTranslitHe);
  const unit = getUnit(unitId);
  if (!unit) return null;
  const letters = unit.items.filter((i) => i.kind === 'letter');
  const words = unit.items.filter((i) => i.kind !== 'letter');

  return (
    <>
      <TopBar />
      <Page>
        <a href={href({ name: 'path' })} className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-2 font-semibold text-brand hover:bg-brand-soft">
          <Icon name="back" flipRtl className="size-5" />
          {t('common.back')}
        </a>
        <h1 className="text-3xl font-bold text-ink">
          {t('cheat.title')} · {t('path.unit', { n: unit.number })}
        </h1>
        <p className="mb-6 text-lg text-muted">
          <MixedText text={unit.title[lang]} />
        </p>

        {letters.length > 0 && (
          <section className="mb-8" aria-labelledby="cs-letters">
            <h2 id="cs-letters" className="mb-3 text-xl font-bold text-ink">
              {t('cheat.letters')}
            </h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {letters.map((it) => (
                <li key={it.id}>
                  <Card className="flex items-center gap-3">
                    <SpeakerButton item={it} size="sm" />
                    <div className="flex flex-col">
                      <Bg className="text-2xl font-bold text-ink">{it.bg}</Bg>
                      <span className="text-sm text-muted">
                        <MixedText text={it[lang]} />
                      </span>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        )}

        {words.length > 0 && (
          <section className="mb-8" aria-labelledby="cs-words">
            <h2 id="cs-words" className="mb-3 text-xl font-bold text-ink">
              {t('cheat.words')}
            </h2>
            <ul className="flex flex-col divide-y-2 divide-line rounded-3xl border-2 border-line bg-white">
              {words.map((it) => (
                <li key={it.id} className="flex items-center gap-3 px-3 py-3">
                  <SpeakerButton item={it} size="sm" />
                  <span className="flex min-w-0 flex-col">
                    <Bg className="text-lg font-semibold text-ink">{it.stressed}</Bg>
                    <span dir="ltr" className="text-sm text-muted">
                      {it.translit}
                    </span>
                    {showHe && it.translitHe && (
                      <span dir="rtl" lang="he" className="text-sm text-muted">
                        {it.translitHe}
                      </span>
                    )}
                  </span>
                  <span className="ms-auto text-end text-ink">
                    <MixedText text={it[lang]} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {unit.tips.length > 0 && (
          <section aria-labelledby="cs-tips">
            <h2 id="cs-tips" className="mb-3 text-xl font-bold text-ink">
              {t('cheat.tips')}
            </h2>
            <div className="flex flex-col gap-3">
              {unit.tips.map((tip) => (
                <details key={tip.id} className="rounded-2xl border-2 border-amber bg-amber-soft p-4">
                  <summary className="cursor-pointer text-lg font-bold text-ink">
                    <MixedText text={tip.title[lang]} />
                  </summary>
                  {tip.body[lang].map((para, i) => (
                    <p key={i} className="mt-2 text-ink">
                      <MixedText text={para} />
                    </p>
                  ))}
                </details>
              ))}
            </div>
          </section>
        )}
      </Page>
    </>
  );
}
