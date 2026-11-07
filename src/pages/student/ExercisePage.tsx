import { ArrowRight, CheckCircle2, Flame, HelpCircle, Lightbulb, Lock, PartyPopper, PlayCircle, Target, UserRound } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { addActiveTime, recordMission, recordVideoProgress, recordVideoView } from '../../app/actions';
import { StudentPage, useStudent } from '../../app/student';
import { useTutor } from '../../app/tutor';
import { FigureView } from '../../components/figures';
import { ChoiceList, QuantityInput, defaultUnit, quantityToSI, type QuantityValue } from '../../components/inputs';
import { MissionPanel } from '../../components/sim/MissionPanel';
import { Simulator } from '../../components/sim/Simulator';
import { useSimulation } from '../../components/sim/useSimulation';
import { RichText, Tex } from '../../components/Tex';
import { Badge, Button, Card, LevelBadge, Notice, Spinner } from '../../components/ui';
import { VideoPlayer } from '../../components/VideoPlayer';
import { ADAPTIVE } from '../../config/adaptive';
import { COMPETENCE_INFO, LEVEL_LABELS } from '../../content/competences';
import { ERRORS, errorHint, exReviewVideo } from '../../content/errors';
import { TEMPLATES, createFreshInstance, getTemplate, type ExerciseInstance } from '../../content/exercises';
import type { CurveQuestion, Question } from '../../content/exercises/types';
import { MISSIONS } from '../../content/missions';
import { VIDEOS } from '../../content/videos';
import { chooseNextTemplate, chooseRemediationTemplate, completeExercise, exercisesOpen, registerError, type HelpAction, type LearnerModel } from '../../engine/adaptive';
import { diagnoseChoice, diagnoseCurve, diagnoseNum, type Diagnosis } from '../../engine/diagnostic';
import { newSeed, mulberry32 } from '../../engine/rng';
import type { ErrorCode, ExSubtype, MissionId, VideoId } from '../../engine/types';
import { newId, repo } from '../../data/repository';
import type { Attempt, StepLog } from '../../data/types';

interface RunState {
  instance: ExerciseInstance;
  remediation: boolean;
  review: boolean;
  startedAt: number;
  steps: StepLog[];
  errors: ErrorCode[];
  hints: number;
  videos: VideoId[];
  missions: MissionId[];
  qIndex: number;
  accepted: Record<string, string>;
  finalized: boolean;
}

type Panel =
  | { kind: 'none' }
  | { kind: 'hint'; text: string; coded: boolean }
  | { kind: 'remediation'; code: ErrorCode; video: VideoId | null; mission: MissionId | null; next: string }
  | { kind: 'alert'; code: ErrorCode }
  | { kind: 'finished'; success: boolean; levelUp: boolean; finished: boolean; slow: boolean; newLevel: string };

const rngNow = () => mulberry32(newSeed());

/** Réponse saisie → texte lisible pour l'historique. */
function answerText(q: Question, raw: QuantityValue | string | null): string {
  if (raw === null) return '';
  if (typeof raw === 'string') return q.kind === 'QCM' || q.kind === 'EXPR' ? (q.options.find((o) => o.id === raw)?.text ?? raw) : raw;
  return `${raw.raw} ${raw.unit.label}`;
}

function QuestionInput({
  q,
  disabled,
  onSubmit,
  picked,
  onPickChange,
}: {
  q: Question;
  disabled: boolean;
  onSubmit: (d: Diagnosis, text: string) => void;
  picked: number | null;
  onPickChange: (t: number | null) => void;
}) {
  const quantity = q.kind === 'NUM' ? q.quantity : 'temps';
  const preferred = q.kind === 'NUM' ? q.preferredUnit : q.kind === 'COURBE' ? (q.answer < 2 ? 'ms' : 's') : undefined;
  const [num, setNum] = useState<QuantityValue>({ raw: '', unit: defaultUnit(quantity, preferred) });
  const [choice, setChoice] = useState<string | null>(null);

  // Lecture sur la courbe → valeur proposée dans le champ (modifiable).
  useEffect(() => {
    if (q.kind !== 'COURBE' || picked === null) return;
    const d = picked - q.origin;
    setNum((v) => ({ ...v, raw: String(Number((d / v.unit.factor).toPrecision(3))).replace('.', ',') }));
  }, [picked, q]);

  if (q.kind === 'QCM' || q.kind === 'EXPR') {
    return (
      <div className="space-y-3">
        <ChoiceList
          name={q.prompt}
          value={choice}
          onChange={setChoice}
          disabled={disabled}
          render={q.kind === 'EXPR' ? 'tex' : undefined}
          columns={q.kind === 'EXPR' || q.options.length === 2 ? 2 : 1}
          options={q.options.map((o) => ({ id: o.id, content: q.kind === 'EXPR' ? <Tex math={o.text} /> : <RichText text={o.text} /> }))}
        />
        <Button disabled={disabled || !choice} onClick={() => onSubmit(diagnoseChoice(q, choice), answerText(q, choice))}>
          Vérifier
        </Button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const v = quantityToSI(num);
        const d = q.kind === 'NUM' ? diagnoseNum(q, v) : diagnoseCurve(q as CurveQuestion, v);
        onSubmit(d, answerText(q, num));
      }}
    >
      <QuantityInput quantity={quantity} value={num} onChange={setNum} disabled={disabled} label={q.kind === 'COURBE' ? 'Valeur lue' : 'Ta réponse'} />
      <Button type="submit" disabled={disabled || !num.raw.trim()}>
        Vérifier
      </Button>
      {q.kind === 'COURBE' && picked !== null && (
        <button type="button" className="text-xs font-semibold text-teal-700 hover:underline" onClick={() => onPickChange(null)}>
          Effacer la lecture
        </button>
      )}
    </form>
  );
}

function RemediationPanel({ panel, onContinue, onMission, onVideo }: { panel: Extract<Panel, { kind: 'remediation' }>; onContinue: () => void; onMission: (id: MissionId, sec: number) => void; onVideo: (id: VideoId, percent: number) => void }) {
  const { student, updateModel } = useStudent();
  const [videoOk, setVideoOk] = useState(false);
  const [missionOk, setMissionOk] = useState(!panel.mission);
  const sim = useSimulation(panel.mission ? MISSIONS[panel.mission].config : {});
  const info = ERRORS[panel.code];
  return (
    <div className="space-y-4">
      <Card className="!bg-violet-50/80">
        <div className="flex items-start gap-3">
          <span className="pastille pastille-violet h-10 w-10 shrink-0">
            <PlayCircle size={20} />
          </span>
          <div>
            <p className="label-caps">Remédiation · {panel.code === 'EX' ? 'revoir la leçon' : info.name}</p>
            <p className="text-ink">
              {panel.mission ? 'Regarde cette courte vidéo, fais la mission au labo, puis un nouvel exercice avec de nouvelles valeurs.' : 'Revois cette courte vidéo, puis un nouvel exercice avec de nouvelles valeurs.'}
            </p>
          </div>
        </div>
      </Card>
      {panel.video && (
        <div className="mx-auto max-w-3xl">
          <VideoPlayer
            src={VIDEOS[panel.video].url}
            title={VIDEOS[panel.video].title}
            onProgress={async (r) => {
              const p = await recordVideoProgress(updateModel, panel.video!, r.ranges, r.position, r.duration);
              if ((p >= ADAPTIVE.videoWatchedThreshold * 100 || r.ended) && !videoOk) {
                setVideoOk(true);
                onVideo(panel.video!, p);
              }
            }}
            onEnded={() => setVideoOk(true)}
          />
          {!videoOk && <p className="mt-2 text-center text-xs text-muted">Regarde la vidéo jusqu’au bout pour continuer.</p>}
        </div>
      )}
      {panel.mission && (videoOk || !panel.video) && (
        <Simulator
          sim={sim}
          compact
          top={
            <MissionPanel
              id={panel.mission}
              sim={sim}
              context="remédiation"
              onComplete={async (r) => {
                setMissionOk(true);
                onMission(r.missionId, r.durationSec);
                await recordMission(student.id, updateModel, r.missionId, r.success, r.durationSec, 'remediation');
              }}
            />
          }
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" disabled={!(videoOk || !panel.video) || !missionOk} onClick={onContinue}>
          Exercice de remédiation <ArrowRight size={18} />
        </Button>
        {panel.mission && videoOk && !missionOk && (
          <button type="button" className="text-sm font-semibold text-teal-700 hover:underline" onClick={onContinue}>
            Passer la mission
          </button>
        )}
      </div>
    </div>
  );
}

/** Exercices adaptatifs (sections 7 à 10). */
export function ExercisePage() {
  const { student, session, updateModel } = useStudent();
  const tutor = useTutor();
  const [run, setRun] = useState<RunState | null>(null);
  const [panel, setPanel] = useState<Panel>({ kind: 'none' });
  const [picked, setPicked] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const runRef = useRef<RunState | null>(null);
  runRef.current = run;
  const m = student.model;

  /** Lit le modèle frais, applique fn, enregistre ; renvoie ce que fn renvoie en plus. */
  const withModel = useCallback(
    async <T,>(fn: (model: LearnerModel) => { model: LearnerModel; out: T }): Promise<T> => {
      let out!: T;
      await updateModel((model) => {
        const r = fn(model);
        out = r.out;
        return r.model;
      });
      return out;
    },
    [updateModel],
  );

  const start = useCallback(
    async (forced?: { templateId: string; remediation?: boolean }) => {
      setBusy(true);
      const res = await withModel((model) => {
        if (forced) return { model, out: { templateId: forced.templateId, review: false, seen: model.seenValues[forced.templateId] ?? [] } };
        const next = chooseNextTemplate(model, TEMPLATES, rngNow());
        return { model: next.model, out: { templateId: next.templateId, review: next.review, seen: next.model.seenValues[next.templateId] ?? [] } };
      });
      const instance = createFreshInstance(res.templateId, res.seen);
      setRun({ instance, remediation: !!forced?.remediation, review: res.review, startedAt: Date.now(), steps: [], errors: [], hints: 0, videos: [], missions: [], qIndex: 0, accepted: {}, finalized: false });
      setPanel({ kind: 'none' });
      setPicked(null);
      setBusy(false);
      tutor.say('exerciseStart');
    },
    [withModel, tutor],
  );

  useEffect(() => {
    if (exercisesOpen(m) && !run) void start();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // « Réfléchit » après 2 minutes sur un exercice.
  useEffect(() => {
    if (!run || run.finalized) return;
    const id = window.setTimeout(() => tutor.say('thinking'), ADAPTIVE.tutorThinkingAfterSec * 1000);
    return () => window.clearTimeout(id);
  }, [run?.instance.seed, run?.finalized]); // eslint-disable-line react-hooks/exhaustive-deps

  // Exercice quitté en cours : enregistré comme abandonné (historique de l'expérimentation).
  useEffect(
    () => () => {
      const r = runRef.current;
      if (r && !r.finalized && r.steps.length > 0) void saveAttempt(r, 'abandoned', false, null);
    },
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const saveAttempt = async (r: RunState, outcome: Attempt['outcome'], success: boolean, model: LearnerModel | null) => {
    const now = Date.now();
    const durationSec = Math.round((now - r.startedAt) / 1000);
    const fresh = model ?? (await repo.getStudent(student.id))?.model ?? m;
    await repo.addAttempt({
      id: newId('att'),
      studentId: student.id,
      sessionId: session.sessionId,
      templateId: r.instance.templateId,
      level: r.instance.level,
      seed: r.instance.seed,
      values: r.instance.values,
      remediation: r.remediation,
      review: r.review,
      steps: r.steps,
      questionsTotal: r.instance.questions.length,
      questionsOk: Object.keys(r.accepted).length,
      errors: r.errors,
      success,
      outcome,
      hintsUsed: r.hints,
      videosWatched: r.videos,
      missionsUsed: r.missions,
      startedAt: new Date(r.startedAt).toISOString(),
      endedAt: new Date(now).toISOString(),
      durationSec,
      competencesAfter: { ...fresh.competences },
      levelAfter: fresh.level,
    });
    void addActiveTime(updateModel, durationSec);
    return durationSec;
  };

  /** Termine l'exercice : met à jour le modèle (section 10) et l'historique. */
  const finalize = async (r: RunState, outcome: Attempt['outcome'], completed: boolean) => {
    const tpl = getTemplate(r.instance.templateId);
    const durationSec = Math.round((Date.now() - r.startedAt) / 1000);
    const success = completed && (tpl.level !== 'difficile' || r.hints <= ADAPTIVE.maxHintsForHardSuccess);
    const finalOutcome: Attempt['outcome'] = completed ? (success ? 'success' : 'helped') : outcome;
    const res = await withModel((model) => {
      const out = completeExercise(model, { template: tpl, success, usedHelp: r.hints > 0 || r.videos.length > 0, durationSec, errors: r.errors }, rngNow());
      const seen = out.model.seenValues[tpl.id] ?? [];
      out.model.seenValues = { ...out.model.seenValues, [tpl.id]: [...seen, r.instance.valueKey].slice(-60) };
      return { model: out.model, out };
    });
    const done = { ...r, finalized: true };
    setRun(done);
    await saveAttempt(done, finalOutcome, success, res.model);
    return { ...res, success };
  };

  const onAnswer = async (d: Diagnosis, text: string) => {
    if (!run || busy) return;
    const q = run.instance.questions[run.qIndex];
    const step: StepLog = { t: Date.now() - run.startedAt, questionId: q.id, answer: text, ok: d.ok, code: d.code, sub: d.sub ?? null };
    let r: RunState = { ...run, steps: [...run.steps, step] };
    if (d.ok) {
      r = { ...r, accepted: { ...r.accepted, [q.id]: text }, qIndex: r.qIndex + 1 };
      setPanel({ kind: 'none' });
      setPicked(null);
      if (r.qIndex >= r.instance.questions.length) {
        setRun(r);
        setBusy(true);
        const res = await finalize(r, 'success', true);
        setBusy(false);
        setPanel({ kind: 'finished', success: res.success, levelUp: res.levelUp, finished: res.finished, slow: res.slow, newLevel: LEVEL_LABELS[res.model.level] });
        if (res.finished) tutor.say('finished', { reaction: true });
        else if (res.levelUp) tutor.say('levelUp', { reaction: true, vars: { niveau: LEVEL_LABELS[res.model.level].toLowerCase() } });
        else if (res.success && res.model.streak.count >= 3) tutor.say('streak3', { reaction: true });
        else if (res.success) tutor.say('success', { reaction: true, level: Object.values(res.model.competences).reduce((s, v) => s + v, 0) / 600 });
        else tutor.say('competenceUp', { reaction: true });
      } else {
        setRun(r);
        tutor.say('flashCorrect', { reaction: true });
      }
      return;
    }
    // Réponse fausse.
    if (!d.code) {
      r = { ...r, hints: r.hints + 1 };
      setRun(r);
      setPanel({ kind: 'hint', text: q.hint ?? run.instance.generalHint, coded: false });
      tutor.say('noCodeError', { reaction: true });
      return;
    }
    const code = d.code;
    const sub: ExSubtype | null = d.sub ?? null;
    r = { ...r, errors: [...r.errors, code] };
    setBusy(true);
    const tpl = getTemplate(run.instance.templateId);
    const reg = await withModel((model) => {
      const out = registerError(model, code, tpl.competences);
      return { model: out.model, out: { action: out.action as HelpAction, count: out.count } };
    });
    if (reg.action === 'hint') {
      r = { ...r, hints: r.hints + 1 };
      setRun(r);
      const text = errorHint(code, sub);
      setPanel({ kind: 'hint', text, coded: true });
      tutor.say('firstError', { reaction: true, vars: { indice: text } });
    } else if (reg.action === 'video') {
      const video = code === 'EX' ? exReviewVideo(sub) : ERRORS[code].video;
      const missions = ERRORS[code].missions;
      const mission = missions.length ? (missions.find((x) => !student.model.missions[x]?.done) ?? missions[0]) : null;
      const next = chooseRemediationTemplate(code, tpl.id, rngNow());
      r = { ...r, videos: video ? [...r.videos, video] : r.videos, missions: mission ? [...r.missions, mission] : r.missions };
      setRun(r);
      await finalize(r, 'remediation', false);
      setPanel({ kind: 'remediation', code, video, mission, next });
      tutor.say('secondError', { reaction: true });
    } else {
      setRun(r);
      await repo.addAlert({ id: newId('alr'), studentId: student.id, code, count: reg.count, templateId: tpl.id, createdAt: new Date().toISOString(), resolved: false });
      await finalize(r, 'alert', false);
      setPanel({ kind: 'alert', code });
      tutor.say('teacherAlert', { reaction: true });
    }
    setBusy(false);
  };

  if (!exercisesOpen(m)) {
    return (
      <StudentPage title="Exercices">
        <Card className="mx-auto max-w-lg text-center">
          <div className="flex flex-col items-center gap-3 py-3">
            <span className="pastille pastille-violet h-12 w-12">
              <Lock size={22} />
            </span>
            <p className="text-ink-soft">Les exercices s’ouvrent quand les cinq leçons (vidéo, question flash et mini-mission) sont terminées.</p>
            <Link className="font-semibold text-teal-700 hover:underline" to="/apprenant/lecons">
              Aller aux leçons
            </Link>
          </div>
        </Card>
      </StudentPage>
    );
  }

  if (!run) return <StudentPage title="Exercices"><Spinner /></StudentPage>;

  const inst = run.instance;
  const tpl = getTemplate(inst.templateId);
  const curQ = inst.questions[run.qIndex] as Question | undefined;
  const curveFigure = curQ?.kind === 'COURBE' ? (curQ.figure ?? inst.figures.findIndex((f) => f.kind === 'plot')) : -1;
  const needed = ADAPTIVE.streakToLevelUp + m.extraNeeded;
  const locked = run.finalized || panel.kind === 'remediation' || panel.kind === 'alert';

  return (
    <StudentPage title="Exercices">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-4">
          {panel.kind === 'remediation' ? (
            <RemediationPanel
              key={inst.seed}
              panel={panel}
              onVideo={(id, p) => {
                void recordVideoView(student.id, id, 'remediation', p);
              }}
              onMission={() => {}}
              onContinue={() => void start({ templateId: panel.next, remediation: true })}
            />
          ) : (
            <Card>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <LevelBadge level={inst.level} />
                <Badge tone="slate">{tpl.id}</Badge>
                {run.remediation && <Badge tone="violet">Remédiation</Badge>}
                {run.review && <Badge tone="blue">Révision</Badge>}
                {inst.questions.length > 1 && <Badge tone="teal">{inst.questions.length} étapes</Badge>}
              </div>
              <h2 className="text-xl font-semibold text-ink">{inst.title}</h2>
              <p className="mt-2 leading-relaxed text-ink-soft">
                <RichText text={inst.intro} />
              </p>
              {inst.figures.length > 0 && (
                <div className={`mt-4 grid gap-3 ${inst.figures.length > 1 ? 'lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]' : ''}`}>
                  {inst.figures.map((f, j) => (
                    <FigureView
                      key={j}
                      figure={f}
                      onPick={j === curveFigure && !locked ? setPicked : undefined}
                      picked={j === curveFigure ? picked : null}
                      origin={curQ?.kind === 'COURBE' ? curQ.origin : 0}
                    />
                  ))}
                </div>
              )}
              <ol className="mt-5 space-y-3">
                {inst.questions.map((q, j) => {
                  const done = j < run.qIndex;
                  const current = j === run.qIndex && !run.finalized;
                  if (j > run.qIndex && !run.finalized) {
                    return (
                      <li key={q.id} className="flex items-center gap-3 rounded-2xl bg-white/40 px-4 py-3 text-sm text-muted ring-1 ring-white/60">
                        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink/8 text-xs font-bold">{j + 1}</span> Étape suivante
                      </li>
                    );
                  }
                  return (
                    <li key={q.id} className={`rounded-2xl px-4 py-3 ring-1 ${current ? 'bg-white/80 ring-teal-200' : 'bg-white/50 ring-white/70'}`}>
                      <div className="flex items-start gap-3">
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? 'bg-ok-500 text-white' : 'bg-teal-600 text-white'}`}>{done ? '✓' : j + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-ink">
                            <RichText text={q.prompt} />
                          </p>
                          {done && (
                            <p className="mt-1 text-sm text-ok-700">
                              <CheckCircle2 size={14} className="mr-1 inline" />
                              {q.kind === 'EXPR' ? <Tex math={run.accepted[q.id]} /> : <RichText text={run.accepted[q.id]} />}
                            </p>
                          )}
                          {current && (
                            <div className="mt-3">
                              <QuestionInput key={`${inst.seed}-${q.id}`} q={q} disabled={busy || locked} onSubmit={(d, text) => void onAnswer(d, text)} picked={picked} onPickChange={setPicked} />
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
              {panel.kind === 'hint' && (
                <Notice className="mt-4" tone="tip" icon={<Lightbulb size={18} className="text-amber-600" />} title={panel.coded ? 'Indice' : 'Pas encore… essaie à nouveau'}>
                  <RichText text={panel.text} />
                </Notice>
              )}
            </Card>
          )}

          {panel.kind === 'alert' && (
            <Card className="!bg-amber-50/85">
              <div className="flex flex-wrap items-center gap-3">
                <span className="pastille pastille-orange h-10 w-10">
                  <UserRound size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">Ton professeur est prévenu et va t’aider sur ce point.</p>
                  <p className="text-sm text-ink-soft">On consolide les bases : retour au niveau {LEVEL_LABELS[m.level].toLowerCase()}.</p>
                </div>
                <Button onClick={() => void start()}>
                  Exercice suivant <ArrowRight size={16} />
                </Button>
              </div>
            </Card>
          )}

          {panel.kind === 'finished' && (
            <Card className={panel.levelUp || panel.finished ? 'banner-teal border-0 text-white' : ''}>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`pastille ${panel.success ? 'pastille-teal' : 'pastille-blue'} h-11 w-11`}>{panel.levelUp || panel.finished ? <PartyPopper size={22} /> : <CheckCircle2 size={22} />}</span>
                <div className="min-w-0 flex-1">
                  <p className={`font-semibold ${panel.levelUp || panel.finished ? 'text-white' : 'text-ink'}`}>
                    {panel.finished
                      ? 'Niveau difficile validé : tu maîtrises le dipôle RC !'
                      : panel.levelUp
                        ? `3 sur 3 ! Le niveau ${panel.newLevel.toLowerCase()} est débloqué 🎉`
                        : panel.success
                          ? 'Exercice réussi !'
                          : 'Toutes les étapes sont justes. Au niveau difficile, un exercice compte comme réussi avec au plus un indice : on en refait un.'}
                  </p>
                  {panel.slow && !panel.levelUp && <p className="text-sm text-ink-soft">Tu as pris ton temps : un exercice de plus avant de passer au niveau suivant.</p>}
                </div>
                <Button variant={panel.levelUp || panel.finished ? 'white' : 'primary'} onClick={() => void start()}>
                  Exercice suivant <ArrowRight size={16} />
                </Button>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card title="Ma série" subtitle={`${needed} réussites d’affilée (dont ${ADAPTIVE.minNoHintInStreak} sans indice) pour passer au niveau suivant.`}>
            <div className="flex items-center gap-2">
              {Array.from({ length: needed }, (_, j) => (
                <span key={j} className={`grid h-10 w-10 place-items-center rounded-full ${j < m.streak.count ? 'bg-gradient-to-br from-amber-300 to-cur text-white' : 'bg-ink/8 text-slate-400'}`}>
                  <Flame size={18} />
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-ink-soft">
              Niveau actuel : <b className="text-ink">{LEVEL_LABELS[m.level]}</b>
              {m.completed && ' · validé ✓'}
            </p>
          </Card>
          <Card title="Compétences travaillées">
            <ul className="space-y-1.5 text-sm">
              {tpl.competences.map((c) => (
                <li key={c} className="flex items-center justify-between gap-2">
                  <span className="text-ink-soft">
                    <b className="text-ink">{c}</b> · {COMPETENCE_INFO[c].name}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{m.competences[c]} %</span>
                </li>
              ))}
            </ul>
          </Card>
          {!locked && curQ && (
            <Card>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => {
                  setRun({ ...run, hints: run.hints + 1 });
                  setPanel({ kind: 'hint', text: curQ.hint ?? inst.generalHint, coded: false });
                }}
              >
                <HelpCircle size={16} /> Besoin d’un indice ?
              </Button>
              <p className="mt-2 text-xs text-muted">Un indice compte comme une aide utilisée.</p>
            </Card>
          )}
          {curQ?.kind === 'COURBE' && !locked && (
            <Notice tone="info" icon={<Target size={18} />}>
              Clique sur la courbe pour lire une date : un réticule affiche <i>t</i> et la valeur de la courbe. Tu peux aussi saisir la valeur lue.
            </Notice>
          )}
          <p className="px-1 text-xs text-muted">Source : {inst.source}</p>
        </aside>
      </div>
    </StudentPage>
  );
}
