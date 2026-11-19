import { useEffect, useRef } from 'react';
import type { Ref } from 'react';
import { course, lessonsOf, units } from '../content/course';
import type { Lesson, Unit } from '../content/schema';
import { useStore } from '../state/store';
import { checkpointStatus, dueCount, isUnitUnlocked, lessonBars, lessonStatus } from '../state/selectors';
import type { NodeStatus } from '../state/selectors';
import { href } from '../router';
import { useLang, useT } from '../i18n/i18n';
import { MixedText } from '../components/Bg';
import { Icon } from '../components/Icon';
import { AudioWarning, Page, TopBar } from '../components/Shell';

/** Zig-zag offsets (px) along the inline axis; negated automatically in RTL. */
const OFFSETS = [0, 56, 84, 56, 0, -56, -84, -56];

export function PathScreen() {
  const t = useT();
  const lang = useLang();
  const progress = useStore((s) => s.progress);
  const due = dueCount(progress);
  const currentRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
  }, []);

  let currentAssigned = false;
  const mark = (status: NodeStatus) => {
    if (status === 'current' && !currentAssigned) {
      currentAssigned = true;
      return true;
    }
    return false;
  };

  return (
    <>
      <TopBar />
      <AudioWarning />
      <Page>
        <h1 className="sr-only">{t('nav.learn')}</h1>
        {course.units.map((cu) => {
          const ready = units.find((u) => u.dir === cu.dir);
          if (!ready || cu.status === 'planned') {
            return (
              <section key={cu.dir} className="mb-6 rounded-3xl border-2 border-dashed border-line bg-surface p-5 text-muted" aria-label={t('path.unit', { n: cu.number })}>
                <p className="text-sm font-bold uppercase">
                  {t('path.unit', { n: cu.number })} · {t('path.comingSoon')}
                </p>
                <h2 className="text-xl font-bold">
                  <MixedText text={cu.title[lang]} />
                </h2>
              </section>
            );
          }
          const { unit } = ready;
          const lessons = lessonsOf(unit.id);
          const unlocked = isUnitUnlocked(unit.id, progress);
          const doneCount = lessons.filter((l) => progress.lessons[l.id]).length;
          const cp = checkpointStatus(unit.id, progress);
          return (
            <section key={unit.id} className="mb-10" aria-labelledby={`unit-${unit.id}`}>
              <UnitBanner unit={unit} unlocked={unlocked} done={doneCount} total={lessons.length} />
              <ol className="mt-8 flex flex-col items-center gap-7">
                {lessons.map((lesson, i) => {
                  const status = lessonStatus(unit.id, i, progress);
                  const isCurrent = mark(status);
                  return (
                    <li key={lesson.id} style={{ ['--offset' as string]: `${OFFSETS[i % OFFSETS.length]}px` }} className="path-node">
                      <LessonNode lesson={lesson} index={i} total={lessons.length} status={status} isCurrent={isCurrent} bars={lessonBars(lesson, progress)} nodeRef={isCurrent ? currentRef : undefined} />
                    </li>
                  );
                })}
                <li className="path-node" style={{ ['--offset' as string]: '0px' }}>
                  <CheckpointNode unit={unit} status={cp} isCurrent={mark(cp)} nodeRef={cp === 'current' ? currentRef : undefined} />
                </li>
              </ol>
            </section>
          );
        })}
      </Page>
      {due > 0 && (
        <a
          href={href({ name: 'practice' })}
          className="chunky fixed end-4 bottom-20 z-10 inline-flex min-h-12 items-center gap-2 rounded-full border-danger-dark bg-danger px-5 font-bold text-white shadow-lg"
        >
          <Icon name="dumbbell" />
          {t('path.practiceDue', { n: due })}
        </a>
      )}
    </>
  );
}

function UnitBanner({ unit, unlocked, done, total }: { unit: Unit; unlocked: boolean; done: number; total: number }) {
  const t = useT();
  const lang = useLang();
  return (
    <div className={`rounded-3xl p-5 text-white ${unlocked ? 'bg-brand' : 'bg-slate-500'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-black/20 px-3 py-1 text-xs font-bold uppercase">{t('path.unit', { n: unit.number })}</span>
          <h2 id={`unit-${unit.id}`} className="text-2xl font-bold">
            <MixedText text={unit.title[lang]} />
          </h2>
        </div>
        <a href={href({ name: 'cheat', unitId: unit.id })} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-white px-3 font-semibold text-brand-dark hover:bg-brand-soft">
          <Icon name="book" className="size-5" />
          {t('path.cheatSheet')}
        </a>
      </div>
      <p className="mt-2 text-white/95">
        <MixedText text={unit.description[lang]} />
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/25" aria-hidden>
          <div className="h-full rounded-full bg-white" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        <span className="text-sm font-bold">{t('path.lessonsDone', { done, total })}</span>
      </div>
    </div>
  );
}

function StrengthBars({ bars }: { bars: number }) {
  const t = useT();
  return (
    <span className="flex gap-1" role="img" aria-label={t('path.strength', { n: bars })}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`h-2 w-5 rounded-full ${i < bars ? (bars <= 1 ? 'bg-amber-dark' : 'bg-brand') : 'bg-line'}`} />
      ))}
    </span>
  );
}

function LessonNode({
  lesson,
  index,
  total,
  status,
  isCurrent,
  bars,
  nodeRef,
}: {
  lesson: Lesson;
  index: number;
  total: number;
  status: NodeStatus;
  isCurrent: boolean;
  bars: number;
  nodeRef?: Ref<HTMLAnchorElement>;
}) {
  const t = useT();
  const lang = useLang();
  const label = `${t('path.lessonOf', { i: index + 1, n: total })}: ${lesson.title[lang]} — ${status === 'done' ? t('path.strength', { n: bars }) : status === 'locked' ? t('path.locked') : t('path.start')}`;
  const circle =
    status === 'done'
      ? 'bg-brand border-brand-dark text-white'
      : status === 'current'
        ? 'bg-brand border-brand-dark text-white ring-8 ring-brand-soft size-24'
        : 'bg-line border-slate-300 text-muted';
  const inner = (
    <>
      {isCurrent && (
        <span className="absolute -top-11 rounded-xl border-2 border-line bg-white px-3 py-1 text-sm font-bold text-brand shadow animate-bounce-soft">
          {t('path.start')}
        </span>
      )}
      <span className={`chunky relative inline-flex size-20 items-center justify-center rounded-full ${circle}`}>
        <Icon name={status === 'done' ? 'check' : status === 'locked' ? 'lock' : 'star'} className="size-9" filled={status === 'current'} />
        {status === 'done' && bars <= 1 && (
          <span className="absolute -end-1 -top-1 rounded-full bg-amber px-1.5 text-xs font-bold text-ink" aria-hidden>
            !
          </span>
        )}
      </span>
      {status === 'done' && <StrengthBars bars={bars} />}
      <span className={`max-w-40 text-center text-sm font-semibold ${status === 'locked' ? 'text-muted' : 'text-ink'}`}>
        <MixedText text={lesson.title[lang]} />
      </span>
    </>
  );
  if (status === 'locked') {
    return (
      <span className="relative flex flex-col items-center gap-2" aria-label={label} role="img">
        {inner}
      </span>
    );
  }
  return (
    <a ref={nodeRef} href={href({ name: 'lesson', id: lesson.id })} className="relative flex flex-col items-center gap-2 rounded-3xl p-1" aria-label={label}>
      {inner}
    </a>
  );
}

function CheckpointNode({ unit, status, isCurrent, nodeRef }: { unit: Unit; status: NodeStatus; isCurrent: boolean; nodeRef?: Ref<HTMLAnchorElement> }) {
  const t = useT();
  const title = t('path.checkpoint', { n: unit.number });
  const sub = status === 'done' ? t('path.checkpointPassed') : t('path.checkpointHint', { p: unit.checkpoint.passPercent });
  const inner = (
    <>
      {isCurrent && <span className="absolute -top-11 rounded-xl border-2 border-line bg-white px-3 py-1 text-sm font-bold text-danger shadow animate-bounce-soft">{t('path.start')}</span>}
      <span
        className={`chunky inline-flex size-24 items-center justify-center rounded-full ${status === 'locked' ? 'bg-line border-slate-300 text-muted' : 'bg-danger border-danger-dark text-white'}`}
      >
        <Icon name={status === 'locked' ? 'lock' : 'trophy'} className="size-11" />
      </span>
      <span className={`text-center text-sm font-bold uppercase ${status === 'locked' ? 'text-muted' : 'text-danger'}`}>{title}</span>
      <span className="text-center text-xs text-muted">{sub}</span>
    </>
  );
  if (status === 'locked')
    return (
      <span className="relative flex flex-col items-center gap-1" role="img" aria-label={`${title} — ${t('path.locked')}. ${sub}`}>
        {inner}
      </span>
    );
  return (
    <a ref={nodeRef} href={href({ name: 'checkpoint', unitId: unit.id })} className="relative flex flex-col items-center gap-1 rounded-3xl p-1" aria-label={`${title}. ${sub}`}>
      {inner}
    </a>
  );
}
