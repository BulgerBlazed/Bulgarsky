import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Exercise, Tip } from '../content/schema';
import { getItem } from '../content/course';
import { needsAudio, readingAlternative, resolve } from '../engine/exercises';
import { audio } from '../audio/audio';
import type { Resolved } from '../engine/exercises';
import { accuracy, advance, current, isFinished, isOutOfHearts, progress, startSession, submit } from '../engine/session';
import type { SessionState } from '../engine/session';
import { useStore } from '../state/store';
import type { SessionKind, SessionOutcome } from '../state/store';
import { useLang, useT } from '../i18n/i18n';
import { Bg, MixedText } from '../components/Bg';
import { Icon } from '../components/Icon';
import { Button, ProgressBar, clipFor, useAudioStatus } from '../components/ui';
import type { Evaluation } from '../exercises/common';
import { ChoiceExercise } from '../exercises/ChoiceExercise';
import { TextExercise } from '../exercises/TextExercise';
import { TilesExercise } from '../exercises/TilesExercise';
import { MatchExercise } from '../exercises/MatchExercise';
import { FillExercise } from '../exercises/FillExercise';
import { SpeakExercise } from '../exercises/SpeakExercise';
import { ResultsView } from './ResultsView';

const HEARTS = 5;
const MAX_STEP_MS = 90_000;

/** Can the learner actually hear the audio this exercise depends on? */
function canHear(ex: Exercise): boolean {
  if (!needsAudio(ex) || !('item' in ex)) return true;
  return audio.canPlay(clipFor(getItem(ex.item)));
}

export interface SessionProps {
  kind: SessionKind;
  title: string;
  exercises: Exercise[];
  tips?: Tip[];
  lessonId?: string;
  unitId?: string;
  passPercent?: number;
  onExit: () => void;
  onReview?: (itemIds: string[]) => void;
  /** Called after results are stored (placement uses it to unlock units). */
  onComplete?: (o: SessionOutcome) => void;
}

export function SessionScreen(props: SessionProps) {
  const { kind, exercises, tips = [], lessonId, unitId, passPercent = 80, onExit } = props;
  const t = useT();
  const lang = useLang();
  const heartsOn = useStore((s) => s.settings.hearts) && kind !== 'placement';
  const completeSession = useStore((s) => s.completeSession);
  const audioStatus = useAudioStatus();

  const [tipIndex, setTipIndex] = useState(0);
  const [session, setSession] = useState<SessionState>(() => startSession(exercises, heartsOn ? HEARTS : null));
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [locked, setLocked] = useState(false);
  const [skipListening, setSkipListening] = useState(false);
  const [result, setResult] = useState<{ outcome: SessionOutcome; xp: number } | null>(null);
  const msRef = useRef(0);
  const tickRef = useRef(Date.now());

  const entry = current(session);
  // Recompute when audio becomes (un)available, e.g. voices finish loading.
  const audioKey = audioStatus ? `${audioStatus.available}-${audioStatus.recordings}` : 'loading';
  const resolved: Resolved | null = useMemo(() => {
    if (!entry) return null;
    // No Bulgarian audio for this item on this device → use the reading version.
    const ex = !audioStatus || canHear(entry.ex) ? entry.ex : readingAlternative(entry.ex);
    return resolve(ex, lang, lessonId);
    // re-resolve only when moving to another queue position
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.pos, entry?.src, entry?.round, lang, audioKey]);

  const showingTips = tipIndex < tips.length;
  const outOfHearts = isOutOfHearts(session) && !locked;

  const restart = () => {
    setSession(startSession(exercises, heartsOn ? HEARTS : null));
    setEvaluation(null);
    setLocked(false);
  };

  const finish = useCallback(
    (s: SessionState) => {
      const firstTry = Object.values(s.firstTry);
      const acc = accuracy(s);
      const outcome: SessionOutcome = {
        kind,
        refId: kind === 'lesson' ? lessonId : unitId,
        unitId,
        accuracy: acc,
        firstTryAnswered: firstTry.length,
        firstTryCorrect: firstTry.filter(Boolean).length,
        items: kind === 'placement' ? {} : s.items,
        ms: msRef.current,
        passed: kind === 'checkpoint' || kind === 'placement' ? acc * 100 >= passPercent : undefined,
      };
      const { xp } = completeSession(outcome);
      props.onComplete?.(outcome);
      setResult({ outcome, xp });
    },
    [kind, lessonId, unitId, passPercent, completeSession, props],
  );

  const check = useCallback(
    (ev: Evaluation | null = evaluation) => {
      if (!ev || locked || !entry) return;
      const now = Date.now();
      msRef.current += Math.min(MAX_STEP_MS, now - tickRef.current);
      tickRef.current = now;
      setEvaluation(ev);
      setLocked(true);
      setSession((s) => submit(s, ev.verdict, entry.ex.type === 'speak' ? [] : undefined));
    },
    [evaluation, locked, entry],
  );

  const next = useCallback(() => {
    const s = advance(session);
    setEvaluation(null);
    setLocked(false);
    tickRef.current = Date.now();
    if (isFinished(s)) finish(s);
    setSession(s);
  }, [session, finish]);

  /** Skips the current exercise without grading (e.g. can't listen now). */
  const skip = useCallback(() => {
    const s = advance(session);
    setEvaluation(null);
    setLocked(false);
    if (isFinished(s)) finish(s);
    setSession(s);
  }, [session, finish]);

  // Auto-skip listening exercises after "Can't listen now".
  useEffect(() => {
    if (skipListening && resolved && needsAudio(resolved.ex) && !locked) skip();
  }, [skipListening, resolved, locked, skip]);

  const onChange = useCallback(
    (ev: Evaluation | null) => {
      if (ev?.autoSubmit) check(ev);
      else setEvaluation(ev);
    },
    [check],
  );

  // Enter = check / continue.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      if (result || showingTips || outOfHearts) return;
      e.preventDefault();
      if (locked) next();
      else if (evaluation) check();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [locked, evaluation, next, check, result, showingTips, outOfHearts]);

  const quit = () => {
    if (window.confirm(t('lesson.quitConfirm'))) onExit();
  };

  if (result) {
    return (
      <ResultsView
        kind={kind}
        outcome={result.outcome}
        xp={result.xp}
        passPercent={passPercent}
        onContinue={onExit}
        onReview={props.onReview}
      />
    );
  }

  if (!exercises.length) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 p-8 text-center">
        <p>{t('lesson.empty')}</p>
        <Button onClick={onExit}>{t('common.back')}</Button>
      </div>
    );
  }

  if (showingTips) {
    const tip = tips[tipIndex];
    return (
      <TipCard
        tip={tip}
        onNext={() => setTipIndex((i) => i + 1)}
        onClose={onExit}
        step={`${tipIndex + 1}/${tips.length}`}
      />
    );
  }

  if (outOfHearts) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center gap-6 p-6 text-center">
        <Icon name="heart" className="size-20 text-danger" filled />
        <h1 className="text-3xl font-bold">{t('lesson.outOfHearts')}</h1>
        <p className="text-muted">{t('lesson.outOfHeartsBody')}</p>
        <div className="flex gap-3">
          <Button onClick={restart}>{t('common.retry')}</Button>
          <Button variant="secondary" onClick={onExit}>
            {t('common.quit')}
          </Button>
        </div>
      </div>
    );
  }

  const canSkipAudio = resolved && needsAudio(resolved.ex);

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      <header className="flex items-center gap-3 px-4 pt-4 pb-2">
        <button type="button" onClick={quit} className="rounded-xl p-2 text-muted hover:bg-surface" aria-label={t('common.close')}>
          <Icon name="close" className="size-7" />
        </button>
        <ProgressBar value={progress(session)} label={t('lesson.progress')} />
        {session.hearts !== null && (
          <span className="inline-flex items-center gap-1 font-bold text-danger" aria-label={t('lesson.hearts', { n: session.hearts })}>
            <Icon name="heart" className="size-6" filled />
            {session.hearts}
          </span>
        )}
      </header>

      <main className="flex flex-1 flex-col gap-6 px-4 pt-4 pb-56 sm:px-6" id="main">
        {resolved && (
          <>
            <h1 className="text-xl font-bold text-ink sm:text-2xl">
              {props.kind !== 'lesson' && (
                <span className="me-2 rounded-lg bg-amber-soft px-2 py-0.5 text-sm align-middle">
                  {t(kind === 'checkpoint' ? 'mode.checkpoint' : kind === 'placement' ? 'mode.placement' : 'mode.practice')}
                </span>
              )}
              {t(resolved.titleKey as never)}
            </h1>
            <ExerciseView key={`${session.pos}`} r={resolved} locked={locked} onChange={onChange} />
          </>
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-10">
        {locked && evaluation && resolved ? (
          <Feedback r={resolved} ev={evaluation} onContinue={next} />
        ) : (
          <div className="border-t-2 border-line bg-white">
            <div className="mx-auto flex max-w-2xl flex-wrap items-center justify-between gap-3 px-4 py-4">
              {canSkipAudio ? (
                <Button variant="ghost" onClick={() => setSkipListening(true)}>
                  {t('lesson.cantListen')}
                </Button>
              ) : (
                <Button variant="ghost" onClick={skip}>
                  {t('common.skip')}
                </Button>
              )}
              {resolved?.kind !== 'match' && resolved?.kind !== 'speak' && (
                <Button onClick={() => check()} disabled={!evaluation} className="min-w-40">
                  {t('common.check')}
                  <kbd className="hidden rounded bg-white/20 px-1.5 text-xs sm:inline">{t('common.keyHint')}</kbd>
                </Button>
              )}
            </div>
          </div>
        )}
      </footer>
    </div>
  );
}

function ExerciseView({ r, locked, onChange }: { r: Resolved; locked: boolean; onChange: (e: Evaluation | null) => void }) {
  switch (r.kind) {
    case 'choice':
      return <ChoiceExercise r={r} locked={locked} onChange={onChange} />;
    case 'text':
      return <TextExercise r={r} locked={locked} onChange={onChange} />;
    case 'tiles':
      return <TilesExercise r={r} locked={locked} onChange={onChange} />;
    case 'match':
      return <MatchExercise r={r} locked={locked} onChange={onChange} />;
    case 'fill':
      return <FillExercise r={r} locked={locked} onChange={onChange} />;
    case 'speak':
      return <SpeakExercise r={r} locked={locked} onChange={onChange} />;
  }
}

/** Correct answer as {bg, l1} for the feedback sheet. */
export function answerFor(r: Resolved, lang: 'en' | 'he', ev: Evaluation): { bg?: string; l1?: string } | null {
  switch (r.kind) {
    case 'choice':
      return { bg: r.answer.stressed, l1: r.answer[lang] };
    case 'text':
    case 'tiles':
      if (r.lang === 'bg') {
        const best = ev.verdict === 'typo' && ev.closest ? ev.closest : r.answer.stressed;
        return { bg: best, l1: r.answer[lang] };
      }
      return { bg: r.answer.stressed, l1: ev.verdict === 'typo' && ev.closest ? ev.closest : r.accepted[0] };
    case 'fill':
      return { bg: r.before + r.answer + r.after, l1: r.translation[lang] };
    case 'speak':
      return { bg: r.item.stressed, l1: r.item[lang] };
    case 'match':
      return null;
  }
}

function Feedback({ r, ev, onContinue }: { r: Resolved; ev: Evaluation; onContinue: () => void }) {
  const t = useT();
  const lang = useLang();
  const ok = ev.verdict !== 'wrong';
  const ans = answerFor(r, lang, ev);
  const btnRef = useRef<HTMLButtonElement>(null);
  useEffect(() => btnRef.current?.focus({ preventScroll: true }), []);
  const explain = 'explain' in r.ex ? r.ex.explain : undefined;
  const note = r.kind === 'choice' || r.kind === 'text' || r.kind === 'tiles' ? r.answer.note : undefined;

  const title = ev.selfAssessed ? (ok ? t('fb.selfGood') : t('fb.selfBad')) : ev.verdict === 'correct' ? t('fb.correct') : ev.verdict === 'typo' ? t('fb.typo') : t('fb.wrong');

  return (
    <section
      role="status"
      aria-live="assertive"
      className={`animate-slide-up border-t-2 ${ok ? 'border-brand bg-brand-soft' : 'border-danger bg-danger-soft'}`}
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-brand' : 'bg-danger'} text-white`}>
            <Icon name={ok ? 'check' : 'x'} className="size-7" />
          </span>
          <div className="flex flex-col gap-1">
            <p className={`text-xl font-bold ${ok ? 'text-brand-dark' : 'text-danger-dark'}`}>{title}</p>
            {ans && r.kind !== 'speak' && (ev.verdict !== 'correct' || r.kind === 'tiles' || r.kind === 'text') && (
              <p className="text-ink">
                {ev.verdict !== 'correct' && <span className="font-semibold">{t('fb.correctAnswer')} </span>}
                {ans.bg && <Bg className="font-semibold">{ans.bg}</Bg>}
                {ans.bg && ans.l1 && <span> = </span>}
                {ans.l1 && <MixedText text={ans.l1} />}
              </p>
            )}
            {ok && r.kind === 'choice' && ans && (
              <p className="text-ink">
                <Bg className="font-semibold">{ans.bg}</Bg> = <MixedText text={ans.l1 ?? ''} />
              </p>
            )}
            {ev.hint === 'latin-script' && <p className="text-sm text-ink">{t('fb.latinHint')}</p>}
            {!ok && explain && (
              <p className="text-sm text-ink">
                <span className="font-semibold">{t('fb.why')} </span>
                <MixedText text={explain[lang]} />
              </p>
            )}
            {note && ok && (
              <p className="text-sm text-muted">
                <MixedText text={note[lang]} />
              </p>
            )}
          </div>
        </div>
        <Button ref={btnRef} variant={ok ? 'primary' : 'danger'} onClick={onContinue} className="min-w-40">
          {t('common.continue')}
          <kbd className="hidden rounded bg-white/20 px-1.5 text-xs sm:inline">{t('common.keyHint')}</kbd>
        </Button>
      </div>
    </section>
  );
}

function TipCard({ tip, onNext, onClose, step }: { tip: Tip; onNext: () => void; onClose: () => void; step: string }) {
  const t = useT();
  const lang = useLang();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onNext]);
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 p-4">
      <header className="flex items-center justify-between">
        <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted hover:bg-surface" aria-label={t('common.close')}>
          <Icon name="close" className="size-7" />
        </button>
        <span className="text-sm text-muted">{step}</span>
      </header>
      <article className="flex flex-1 flex-col gap-4 rounded-3xl border-2 border-amber bg-amber-soft p-6" aria-labelledby="tip-title">
        <span className="inline-flex items-center gap-2 text-sm font-bold tracking-wide text-amber-dark uppercase">
          <Icon name="sparkle" className="size-5" />
          {t('lesson.tip')}
        </span>
        <h1 id="tip-title" className="text-2xl font-bold text-ink">
          <MixedText text={tip.title[lang]} />
        </h1>
        {tip.body[lang].map((p, i) => (
          <p key={i} className="text-lg leading-relaxed text-ink">
            <MixedText text={p} />
          </p>
        ))}
        {tip.examples && (
          <ul className="mt-2 flex flex-col gap-2">
            {tip.examples.map((id) => {
              const it = getItem(id);
              return (
                <li key={id} className="flex flex-wrap items-baseline gap-x-3 rounded-2xl bg-white px-4 py-2">
                  <Bg className="text-xl font-semibold">{it.stressed}</Bg>
                  <span className="text-muted" dir="ltr">
                    {it.translit}
                  </span>
                  <MixedText text={it[lang]} />
                </li>
              );
            })}
          </ul>
        )}
      </article>
      <Button onClick={onNext} className="w-full">
        {t('lesson.tipNext')}
      </Button>
    </div>
  );
}
