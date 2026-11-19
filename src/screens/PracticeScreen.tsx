import { units } from '../content/course';
import { useStore } from '../state/store';
import { dueCount, dueItemIds, unitItemIdsLearned, weakestItemIds } from '../state/selectors';
import { navigate } from '../router';
import { useLang, useT } from '../i18n/i18n';
import { MixedText } from '../components/Bg';
import { Icon } from '../components/Icon';
import { Button, Card } from '../components/ui';
import { Page, TopBar } from '../components/Shell';

export function PracticeScreen() {
  const t = useT();
  const lang = useLang();
  const progress = useStore((s) => s.progress);
  const due = dueCount(progress);
  const hasCards = Object.keys(progress.cards).length > 0;

  const start = () => {
    const ids = due > 0 ? dueItemIds(progress) : weakestItemIds(progress, Date.now(), 10);
    navigate({ name: 'practiceRun', ids });
  };

  return (
    <>
      <TopBar />
      <Page>
        <h1 className="mb-4 text-3xl font-bold text-ink">{t('practice.title')}</h1>
        <Card className="flex flex-col items-center gap-4 text-center">
          <span className="inline-flex size-20 items-center justify-center rounded-full bg-danger-soft text-danger">
            <Icon name="dumbbell" className="size-10" />
          </span>
          {hasCards ? (
            <>
              <p className="text-xl font-bold text-ink">{due > 0 ? t('practice.due', { n: due }) : t('practice.none')}</p>
              <Button onClick={start} className="w-full sm:w-auto">
                {t('practice.start')}
              </Button>
            </>
          ) : (
            <p className="text-lg text-muted">{t('practice.empty')}</p>
          )}
        </Card>

        {hasCards && (
          <section className="mt-8">
            <h2 className="mb-3 text-xl font-bold text-ink">{t('practice.byUnit')}</h2>
            <ul className="flex flex-col gap-3">
              {units.map(({ unit }) => {
                const ids = unitItemIdsLearned(unit.id, progress);
                if (!ids.length) return null;
                return (
                  <li key={unit.id}>
                    <button
                      type="button"
                      onClick={() => navigate({ name: 'practiceRun', unitId: unit.id })}
                      className="chunky flex min-h-16 w-full items-center gap-3 rounded-2xl border-line bg-white px-4 py-3 text-start hover:bg-surface"
                    >
                      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand-soft font-bold text-brand-dark">{unit.number}</span>
                      <span className="flex-1 font-semibold text-ink">
                        <MixedText text={unit.title[lang]} />
                      </span>
                      <Icon name="arrow" flipRtl className="size-5 text-muted" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
      </Page>
    </>
  );
}
