import { ArrowRight, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { addActiveTime, recordVideoProgress, recordVideoView } from '../../app/actions';
import { StudentPage, useStudent } from '../../app/student';
import { useTutor } from '../../app/tutor';
import { FlashQuestionCard } from '../../components/FlashQuestionCard';
import { VideoPlayer } from '../../components/VideoPlayer';
import { Button, Card, Notice } from '../../components/ui';
import { V0_QUESTION, V0_REPLAY_SCENE } from '../../content/lessons';
import { V0_SCENES, VIDEOS } from '../../content/videos';
import { ADAPTIVE } from '../../config/adaptive';
import { hashSeed } from '../../engine/rng';

const EVERYDAY = [
  { src: 'images/flash.webp', label: 'Le flash d’un appareil photo' },
  { src: 'images/defibrillateur.webp', label: 'Un défibrillateur' },
  { src: 'images/carte.webp', label: 'Une carte électronique' },
];

/** V0 + question de compréhension (K en position 1 : charge ou décharge ?). Si faux : revoir la scène concernée. */
export function IntroPage() {
  const { student, updateModel } = useStudent();
  const tutor = useTutor();
  const navigate = useNavigate();
  const m = student.model;
  const [percent, setPercent] = useState(m.videos.V0?.percent ?? 0);
  const [ended, setEnded] = useState(false);
  const [segment, setSegment] = useState<{ start: number; end: number; label: string } | null>(null);
  const [answered, setAnswered] = useState(m.journey.introQuestion);
  const viewed = useRef(false);
  const unlocked = percent >= ADAPTIVE.videoWatchedThreshold * 100 || ended || m.journey.introVideo;

  useEffect(() => {
    tutor.say(m.journey.introQuestion ? 'lessonStart' : 'welcomeStart');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const scene = V0_SCENES.find((s) => s.id === V0_REPLAY_SCENE)!;

  return (
    <StudentPage title="Vidéo d’introduction">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <VideoPlayer
            src={VIDEOS.V0.url}
            title={VIDEOS.V0.title}
            resumeAt={m.videos.V0?.position ?? 0}
            percentSeen={percent}
            scenes={V0_SCENES}
            segment={segment}
            onProgress={async (r) => {
              const sec = r.ranges.reduce((s, [a, b]) => s + (b - a), 0);
              const p = await recordVideoProgress(updateModel, 'V0', r.ranges, r.position, r.duration);
              setPercent(p);
              if (sec > 0) void addActiveTime(updateModel, Math.round(sec));
              if (p >= ADAPTIVE.videoWatchedThreshold * 100 || r.ended) {
                await updateModel((x) => ({ ...x, journey: { ...x.journey, introVideo: true } }));
                if (!viewed.current) {
                  viewed.current = true;
                  void recordVideoView(student.id, 'V0', segment ? 'replay' : 'parcours', p);
                }
              }
            }}
            onEnded={() => {
              setEnded(true);
              tutor.say('videoEnd', { reaction: true });
            }}
          />
          <Card title="Le condensateur au quotidien" subtitle="Ils stockent l’énergie électrique et la libèrent au bon moment.">
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {EVERYDAY.map((img) => (
                <figure key={img.src} className="overflow-hidden rounded-2xl bg-white/50">
                  <img src={img.src} alt={img.label} className="aspect-[4/3] w-full object-cover" loading="lazy" />
                  <figcaption className="px-2 py-1.5 text-center text-[11px] font-medium text-ink-soft sm:text-xs">{img.label}</figcaption>
                </figure>
              ))}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          {!unlocked ? (
            <Card title="Question de compréhension">
              <Notice tone="info">Regarde la vidéo (au moins 80 %) : une question t’attend ensuite.</Notice>
            </Card>
          ) : (
            <FlashQuestionCard
              title="Question de compréhension"
              question={V0_QUESTION}
              seed={hashSeed(student.id + 'V0')}
              done={answered}
              wrongHint={`Revois la scène « ${scene.title} » puis réessaie.`}
              wrongExtra={
                <Button size="sm" variant="secondary" onClick={() => setSegment({ start: scene.start, end: scene.end, label: scene.title })}>
                  <RotateCcw size={15} /> Revoir la scène
                </Button>
              }
              onWrong={() => tutor.say('flashWrong', { reaction: true })}
              onCorrect={async () => {
                setAnswered(true);
                tutor.say('flashCorrect', { reaction: true });
                await updateModel((x) => ({ ...x, journey: { ...x.journey, introVideo: true, introQuestion: true } }));
              }}
            />
          )}
          {answered && (
            <Card>
              <p className="mb-3 text-sm text-ink-soft">Bravo ! Les cinq leçons animées t’attendent : 30 secondes de vidéo, une question flash et une mini-mission au labo.</p>
              <Button onClick={() => navigate('/apprenant/lecons/L1')}>
                Commencer la leçon L1 <ArrowRight size={16} />
              </Button>
            </Card>
          )}
        </div>
      </div>
    </StudentPage>
  );
}
