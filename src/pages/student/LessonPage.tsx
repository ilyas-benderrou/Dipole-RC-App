import { ArrowRight, CheckCircle2, Lock, PlayCircle, Target, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router';
import { addActiveTime, recordMission, recordVideoProgress, recordVideoView } from '../../app/actions';
import { StudentPage, useStudent } from '../../app/student';
import { useTutor } from '../../app/tutor';
import { FlashQuestionCard } from '../../components/FlashQuestionCard';
import { MissionPanel } from '../../components/sim/MissionPanel';
import { Simulator } from '../../components/sim/Simulator';
import { useSimulation } from '../../components/sim/useSimulation';
import { RichText } from '../../components/Tex';
import { Button, Card, Notice } from '../../components/ui';
import { VideoPlayer } from '../../components/VideoPlayer';
import { ADAPTIVE } from '../../config/adaptive';
import { FLASH } from '../../content/lessons';
import { LESSON_MISSION, MISSIONS } from '../../content/missions';
import { LESSON_INFO, VIDEOS } from '../../content/videos';
import { lessonDone, lessonOpen } from '../../engine/adaptive';
import { hashSeed } from '../../engine/rng';
import { LESSON_IDS, type LessonId } from '../../engine/types';

type Step = 'video' | 'flash' | 'mission';

function MissionStep({ lesson, onDone }: { lesson: LessonId; onDone: () => void }) {
  const { student, updateModel } = useStudent();
  const tutor = useTutor();
  const id = LESSON_MISSION[lesson];
  const sim = useSimulation(MISSIONS[id].config);
  return (
    <Simulator
      sim={sim}
      compact
      top={
        <MissionPanel
          id={id}
          sim={sim}
          context={`mini-mission de ${lesson}`}
          onComplete={async (r) => {
            tutor.say('missionSuccess', { reaction: true });
            await recordMission(student.id, updateModel, r.missionId, r.success, r.durationSec, 'lesson');
            onDone();
          }}
        />
      }
    />
  );
}

/** Leçon L1 à L5 : vidéo de 30 s, question flash, mini-mission de simulation. */
export function LessonPage() {
  const { id } = useParams();
  const { student, updateModel } = useStudent();
  const tutor = useTutor();
  const navigate = useNavigate();
  const lesson = (LESSON_IDS as string[]).includes(id ?? '') ? (id as LessonId) : null;
  const m = student.model;
  const progress = lesson ? m.journey.lessons[lesson] : null;
  const [step, setStep] = useState<Step>(() => (!progress?.video ? 'video' : !progress.flash ? 'flash' : 'mission'));
  const [percent, setPercent] = useState(lesson ? (m.videos[lesson]?.percent ?? 0) : 0);
  const viewed = useRef(false);

  useEffect(() => {
    if (lesson && !lessonDone(m, lesson)) tutor.say('lessonStart');
  }, [lesson]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lesson || !progress) return <Navigate to="/apprenant/lecons" replace />;
  const info = LESSON_INFO[lesson];
  const idx = LESSON_IDS.indexOf(lesson);
  const next = LESSON_IDS[idx + 1];
  const done = lessonDone(m, lesson);

  if (!lessonOpen(m, lesson)) {
    return (
      <StudentPage title={`${lesson} · ${info.title}`}>
        <Card className="mx-auto max-w-lg text-center">
          <div className="flex flex-col items-center gap-3 py-3">
            <span className="pastille pastille-violet h-12 w-12">
              <Lock size={22} />
            </span>
            <p className="text-ink-soft">Cette leçon se débloque quand l’étape précédente est terminée.</p>
            <Link className="font-semibold text-teal-700 hover:underline" to={idx === 0 ? '/apprenant/introduction' : `/apprenant/lecons/${LESSON_IDS[idx - 1]}`}>
              Aller à l’étape précédente
            </Link>
          </div>
        </Card>
      </StudentPage>
    );
  }

  const steps: { id: Step; label: string; icon: React.ReactNode; ok: boolean; enabled: boolean }[] = [
    { id: 'video', label: 'Vidéo', icon: <PlayCircle size={16} />, ok: progress.video, enabled: true },
    { id: 'flash', label: 'Question flash', icon: <Zap size={16} />, ok: progress.flash, enabled: progress.video },
    { id: 'mission', label: 'Mini-mission', icon: <Target size={16} />, ok: progress.mission, enabled: progress.flash },
  ];

  const markLesson = (patch: Partial<typeof progress>) =>
    updateModel((x) => ({ ...x, journey: { ...x.journey, lessons: { ...x.journey.lessons, [lesson]: { ...x.journey.lessons[lesson], ...patch } } } }));

  return (
    <StudentPage title={`${lesson} · ${info.title}`}>
      <div className="space-y-4">
        <div className="glass flex flex-wrap items-center gap-2 p-2.5">
          {steps.map((s, j) => (
            <button
              key={s.id}
              type="button"
              disabled={!s.enabled}
              onClick={() => setStep(s.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                step === s.id ? 'bg-teal-600 text-white shadow' : 'text-ink-soft hover:bg-white/70'
              }`}
            >
              <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${step === s.id ? 'bg-white/25' : 'bg-ink/8'}`}>{s.ok ? '✓' : j + 1}</span>
              {s.icon}
              {s.label}
            </button>
          ))}
          <span className="ml-auto hidden text-xs text-muted sm:block">
            Compétences {info.competences} · <RichText text={info.summary} />
          </span>
        </div>

        {step === 'video' && (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <VideoPlayer
              src={VIDEOS[lesson].url}
              title={VIDEOS[lesson].title}
              resumeAt={m.videos[lesson]?.position ?? 0}
              percentSeen={percent}
              onProgress={async (r) => {
                const sec = r.ranges.reduce((s, [a, b]) => s + (b - a), 0);
                const p = await recordVideoProgress(updateModel, lesson, r.ranges, r.position, r.duration);
                setPercent(p);
                if (sec > 0) void addActiveTime(updateModel, Math.round(sec));
                if (p >= ADAPTIVE.videoWatchedThreshold * 100 || r.ended) {
                  await markLesson({ video: true });
                  if (!viewed.current) {
                    viewed.current = true;
                    void recordVideoView(student.id, lesson, progress.video ? 'replay' : 'parcours', p);
                  }
                }
              }}
              onEnded={() => tutor.say('videoEnd', { reaction: true })}
            />
            <Card title="Ensuite">
              <p className="mb-3 text-sm text-ink-soft">
                Après la vidéo : une question flash, puis la mini-mission <b>{LESSON_MISSION[lesson]}</b> au labo.
              </p>
              <Button disabled={!(progress.video || percent >= ADAPTIVE.videoWatchedThreshold * 100)} onClick={() => setStep('flash')}>
                Question flash <ArrowRight size={16} />
              </Button>
              {!(progress.video || percent >= ADAPTIVE.videoWatchedThreshold * 100) && <p className="mt-2 text-xs text-muted">Regarde au moins 80 % de la vidéo.</p>}
            </Card>
          </div>
        )}

        {step === 'flash' && (
          <div className="mx-auto max-w-2xl space-y-3">
            <FlashQuestionCard
              question={FLASH[lesson]}
              seed={hashSeed(student.id + lesson)}
              done={progress.flash}
              onWrong={() => tutor.say('flashWrong', { reaction: true })}
              wrongExtra={
                <Button size="sm" variant="secondary" onClick={() => setStep('video')}>
                  Revoir la vidéo
                </Button>
              }
              onCorrect={async () => {
                tutor.say('flashCorrect', { reaction: true });
                await markLesson({ flash: true });
              }}
            />
            {(progress.flash || m.journey.lessons[lesson].flash) && (
              <Button onClick={() => setStep('mission')}>
                Mini-mission {LESSON_MISSION[lesson]} <ArrowRight size={16} />
              </Button>
            )}
          </div>
        )}

        {step === 'mission' && (
          <div className="space-y-4">
            {progress.mission && <Notice tone="ok" icon={<CheckCircle2 size={18} />} title="Mini-mission déjà réussie">Tu peux la refaire autant que tu veux.</Notice>}
            <MissionStep lesson={lesson} onDone={() => void markLesson({ mission: true })} />
          </div>
        )}

        {done && (
          <Card className="banner-teal border-0 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="label-caps !text-teal-100">Leçon terminée</p>
                <p className="text-lg font-semibold">
                  {lesson} validée ! {next ? `Prochaine étape : ${next} · ${LESSON_INFO[next].title}.` : 'Place aux exercices.'}
                </p>
              </div>
              <Button variant="white" onClick={() => navigate(next ? `/apprenant/lecons/${next}` : '/apprenant/exercices')}>
                {next ? `Leçon ${next}` : 'Exercices'} <ArrowRight size={16} />
              </Button>
            </div>
          </Card>
        )}
      </div>
    </StudentPage>
  );
}
