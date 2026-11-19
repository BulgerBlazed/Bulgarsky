import { course, getItem, units } from '../content/course';
import { useStore } from '../state/store';
import { weakestItemIds, wordsLearned } from '../state/selectors';
import { dayKey } from '../engine/streak';
import { href, navigate } from '../router';
import { useLang, useT } from '../i18n/i18n';
import { Bg, MixedText } from '../components/Bg';
import { Icon } from '../components/Icon';
import { Button, Card, SpeakerButton } from '../components/ui';
import { Page, TopBar } from '../components/Shell';

export function ProfileScreen() {
  const t = useT();
  const lang = useLang();
  const p = useStore((s) => s.progress);
  const weakest = weakestItemIds(p);

  return (
    <>
      <TopBar />
      <Page>
        <div className="mb-6 flex items-center gap-4">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-brand text-white">
            <Icon name="user" className="size-9" />
          </span>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-ink">{t('profile.title')}</h1>
            <p className="text-muted">{t('profile.learner')}</p>
          </div>
          <a href={href({ name: 'settings' })} aria-label={t('settings.title')} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-semibold text-brand hover:bg-brand-soft">
            <Icon name="gear" className="size-5" />
            <span className="hidden sm:inline">{t('settings.title')}</span>
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Stat icon="book" label={t('profile.words')} value={String(wordsLearned(p))} />
          <Stat icon="bolt" label={t('profile.xp')} value={String(p.xp)} />
          <Stat icon="flame" label={t('profile.streak')} value={t('profile.days', { n: p.streak.current })} />
          <Stat icon="trophy" label={t('profile.best')} value={t('profile.days', { n: p.streak.best })} />
        </div>

        <StreakCalendar calendar={p.streak.calendar} />

        <section className="mt-8" aria-labelledby="acc-h">
          <h2 id="acc-h" className="mb-3 text-xl font-bold text-ink">
            {t('profile.accuracy')}
          </h2>
          <ul className="flex flex-col gap-3">
            {course.units
              .filter((cu) => units.some((u) => u.dir === cu.dir))
              .map((cu) => {
                const unit = units.find((u) => u.dir === cu.dir)!.unit;
                const s = p.unitStats[unit.id];
                const pct = s && s.answered ? Math.round((s.correct / s.answered) * 100) : null;
                return (
                  <li key={unit.id} className="flex flex-col gap-1">
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="font-semibold text-ink">
                        {unit.number} · <MixedText text={unit.title[lang]} />
                      </span>
                      <span className="text-muted">{pct === null ? t('profile.noData') : `${pct}%`}</span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-line" aria-hidden>
                      <div className="h-full rounded-full bg-brand" style={{ width: `${pct ?? 0}%` }} />
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>

        <section className="mt-8" aria-labelledby="weak-h">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="weak-h" className="text-xl font-bold text-ink">
              {t('profile.weakest')}
            </h2>
            {weakest.length > 0 && (
              <Button variant="ghost" onClick={() => navigate({ name: 'practiceRun', ids: weakest })}>
                {t('profile.practiceThese')}
              </Button>
            )}
          </div>
          {weakest.length === 0 ? (
            <p className="text-muted">{t('profile.weakestEmpty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {weakest.map((id) => {
                const it = getItem(id);
                return (
                  <li key={id} className="flex items-center gap-3 rounded-2xl border-2 border-line bg-white px-3 py-2">
                    <SpeakerButton item={it} size="sm" />
                    <span className="flex flex-col">
                      <Bg className="text-lg font-semibold text-ink">{it.stressed}</Bg>
                      <span dir="ltr" className="text-sm text-muted">
                        {it.translit}
                      </span>
                    </span>
                    <span className="ms-auto text-end text-muted">
                      <MixedText text={it[lang]} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </Page>
    </>
  );
}

function Stat({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <Icon name={icon} className="size-7 text-brand" />
      <div className="flex min-w-0 flex-col">
        <span className="text-xl font-bold whitespace-nowrap text-ink">{value}</span>
        <span className="text-sm text-muted">{label}</span>
      </div>
    </Card>
  );
}

function StreakCalendar({ calendar }: { calendar: Record<string, 'done' | 'freeze'> }) {
  const t = useT();
  const lang = useLang();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const days = new Date(year, month + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7; // weeks start on Monday
  const monthName = new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric' }).format(now);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(lang, { weekday: 'narrow' }).format(new Date(2024, 0, 1 + i)));
  return (
    <section className="mt-8" aria-labelledby="cal-h">
      <h2 id="cal-h" className="mb-3 text-xl font-bold text-ink">
        {t('profile.calendar')} · <span className="font-medium text-muted">{monthName}</span>
      </h2>
      <Card>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted" aria-hidden>
          {weekdays.map((w, i) => (
            <span key={i}>{w}</span>
          ))}
        </div>
        <ol className="mt-1 grid grid-cols-7 gap-1">
          {Array.from({ length: offset }, (_, i) => (
            <li key={`e${i}`} aria-hidden />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const d = new Date(year, month, i + 1);
            const v = calendar[dayKey(d)];
            const today = dayKey(d) === dayKey(now);
            const label = `${new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long' }).format(d)}${v === 'done' ? ` — ${t('profile.legendDone')}` : v === 'freeze' ? ` — ${t('profile.legendFreeze')}` : ''}`;
            return (
              <li
                key={i}
                aria-label={label}
                className={`relative flex aspect-square items-center justify-center rounded-xl text-sm ${v === 'done' ? 'bg-amber font-bold text-ink' : v === 'freeze' ? 'bg-sky-100 text-sky-900' : 'text-ink'} ${today ? 'ring-2 ring-brand' : ''}`}
              >
                {v === 'done' ? <Icon name="flame" className="size-5" filled /> : v === 'freeze' ? <Icon name="snow" className="size-5" /> : i + 1}
              </li>
            );
          })}
        </ol>
        <div className="mt-3 flex gap-4 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Icon name="flame" className="size-4 text-amber-dark" filled /> {t('profile.legendDone')}
          </span>
          <span className="inline-flex items-center gap-1">
            <Icon name="snow" className="size-4 text-sky-800" /> {t('profile.legendFreeze')}
          </span>
        </div>
      </Card>
    </section>
  );
}
