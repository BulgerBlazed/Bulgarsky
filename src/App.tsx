import { useEffect, useMemo } from 'react';
import { getLesson, getTip, getUnit, lessonsOf, units } from './content/course';
import type { Tip } from './content/schema';
import { buildCheckpoint, buildPlacement, generatePractice } from './engine/exercises';
import { useStore } from './state/store';
import { dueItemIds, unitItemIdsLearned, weakestItemIds } from './state/selectors';
import { navigate, useRoute } from './router';
import type { Route } from './router';
import { DIR, useLang, useT } from './i18n/i18n';
import { BottomNav } from './components/Shell';
import { AudioNotice } from './components/ui';
import { SessionScreen } from './screens/SessionScreen';
import { PathScreen } from './screens/PathScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { CheatSheetScreen } from './screens/CheatSheetScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

const home = () => navigate({ name: 'path' });
const review = (ids: string[]) => navigate({ name: 'practiceRun', ids });

function LessonRoute({ id }: { id: string }) {
  const lang = useLang();
  const done = useStore((s) => !!s.progress.lessons[id]);
  const ref = getLesson(id);
  // Tip cards appear the first time a lesson introducing a rule is taken.
  const tips = useMemo(() => (done ? [] : (ref?.lesson.tips ?? []).map(getTip).filter((x): x is Tip => !!x)), [ref, done]);
  if (!ref) return <PathScreen />;
  return (
    <SessionScreen
      key={id}
      kind="lesson"
      title={ref.lesson.title[lang]}
      exercises={ref.lesson.exercises}
      tips={tips}
      lessonId={id}
      unitId={ref.unit.id}
      onExit={home}
      onReview={review}
    />
  );
}

function CheckpointRoute({ unitId }: { unitId: string }) {
  const unit = getUnit(unitId);
  const exercises = useMemo(() => (unit ? buildCheckpoint(unit.id, unit.checkpoint.count) : []), [unit]);
  if (!unit) return <PathScreen />;
  return (
    <SessionScreen
      kind="checkpoint"
      title={unit.title.en}
      exercises={exercises}
      unitId={unit.id}
      passPercent={unit.checkpoint.passPercent}
      onExit={home}
      onReview={review}
    />
  );
}

function PracticeRunRoute({ ids, unitId }: { ids?: string[]; unitId?: string }) {
  const progress = useStore.getState().progress;
  const exercises = useMemo(() => {
    const pick = ids?.length ? ids : unitId ? unitItemIdsLearned(unitId, progress) : dueItemIds(progress).length ? dueItemIds(progress) : weakestItemIds(progress);
    return generatePractice(pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids?.join(','), unitId]);
  return <SessionScreen kind="practice" title="practice" exercises={exercises} unitId={unitId} onExit={() => navigate({ name: 'practice' })} onReview={review} />;
}

function PlacementRoute() {
  const passUnits = useStore((s) => s.passUnits);
  const exercises = useMemo(() => buildPlacement(), []);
  return (
    <SessionScreen
      kind="placement"
      title="placement"
      exercises={exercises}
      passPercent={80}
      onExit={home}
      onComplete={(o) => {
        if (!o.passed) return;
        const alpha = units.filter((u) => u.unit.alphabet).map((u) => u.unit);
        passUnits(
          alpha.map((u) => u.id),
          alpha.flatMap((u) => u.items.map((i) => i.id)),
          alpha.flatMap((u) => lessonsOf(u.id).map((l) => l.id)),
        );
      }}
    />
  );
}

const WITH_NAV: Route['name'][] = ['path', 'practice', 'profile', 'settings', 'cheat'];

export default function App() {
  const route = useRoute();
  const lang = useLang();
  const t = useT();
  const onboarded = useStore((s) => s.settings.onboarded);
  const openApp = useStore((s) => s.openApp);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = DIR[lang];
    document.title = `${t('app.name')} · ${t('app.tagline')}`;
  }, [lang, t]);

  useEffect(() => openApp(), [openApp]);

  useEffect(() => {
    if (!onboarded && route.name !== 'onboarding' && route.name !== 'placement') navigate({ name: 'onboarding' }, true);
  }, [onboarded, route.name]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  let screen;
  switch (route.name) {
    case 'onboarding':
      screen = <OnboardingScreen />;
      break;
    case 'lesson':
      screen = <LessonRoute id={route.id} />;
      break;
    case 'checkpoint':
      screen = <CheckpointRoute unitId={route.unitId} />;
      break;
    case 'practice':
      screen = <PracticeScreen />;
      break;
    case 'practiceRun':
      screen = <PracticeRunRoute ids={route.ids} unitId={route.unitId} />;
      break;
    case 'placement':
      screen = <PlacementRoute />;
      break;
    case 'profile':
      screen = <ProfileScreen />;
      break;
    case 'settings':
      screen = <SettingsScreen />;
      break;
    case 'cheat':
      screen = <CheatSheetScreen unitId={route.unitId} />;
      break;
    default:
      screen = <PathScreen />;
  }

  return (
    <>
      <a href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }} className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:start-2 focus:z-50 focus:rounded-xl focus:bg-white focus:p-3">
        Skip to content
      </a>
      <AudioNotice />
      {screen}
      {WITH_NAV.includes(route.name) && onboarded && <BottomNav active={route.name} />}
    </>
  );
}
