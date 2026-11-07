import { CheckCircle2, Lock, PlayCircle } from 'lucide-react';
import { Link } from 'react-router';
import { StudentPage, useStudent } from '../../app/student';
import { Illustration } from '../../components/Illustration';
import { RichText } from '../../components/Tex';
import { Badge, ProgressBar } from '../../components/ui';
import { LESSON_MISSION } from '../../content/missions';
import { LESSON_INFO, VIDEOS } from '../../content/videos';
import { lessonDone, lessonOpen } from '../../engine/adaptive';
import { LESSON_IDS } from '../../engine/types';

/** Liste du parcours vidéo : V0 puis L1 à L5. */
export function LessonsPage() {
  const { student } = useStudent();
  const m = student.model;
  const introDone = m.journey.introVideo && m.journey.introQuestion;
  const cards = [
    {
      id: 'V0',
      to: '/apprenant/introduction',
      title: 'Introduction : charge et décharge',
      summary: 'Le condensateur au quotidien, le dipôle RC, la charge (K en 1) et la décharge (K en 2).',
      comp: 'Toutes',
      open: true,
      done: introDone,
      percent: m.videos.V0?.percent ?? 0,
      steps: [m.journey.introVideo, m.journey.introQuestion],
      duration: VIDEOS.V0.duration,
    },
    ...LESSON_IDS.map((l) => ({
      id: l,
      to: `/apprenant/lecons/${l}`,
      title: LESSON_INFO[l].title,
      summary: LESSON_INFO[l].summary,
      comp: LESSON_INFO[l].competences,
      open: lessonOpen(m, l),
      done: lessonDone(m, l),
      percent: m.videos[l]?.percent ?? 0,
      steps: [m.journey.lessons[l].video, m.journey.lessons[l].flash, m.journey.lessons[l].mission],
      duration: VIDEOS[l].duration,
    })),
  ];
  return (
    <StudentPage title="Leçons">
      <div className="banner-teal relative mb-5 overflow-hidden rounded-[22px] p-5 text-white sm:p-6">
        <div className="relative z-10 max-w-[68%]">
          <p className="label-caps !text-teal-100">Parcours vidéo</p>
          <p className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">Une vidéo d’introduction, puis cinq leçons de 30 secondes</p>
          <p className="mt-1 text-sm text-teal-50">Chaque leçon : la vidéo, une question flash et une mini-mission au laboratoire.</p>
        </div>
        <Illustration name="capacitor" className="pointer-events-none absolute -bottom-4 right-2 h-[130%] w-auto max-w-[34%] object-contain" />
      </div>
      <div className="cascade grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => {
          const body = (
            <>
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 to-ink">
                <img src={`images/posters/${c.id}.webp`} alt="" className="aspect-video w-full object-cover opacity-90" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />
                <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-teal-800">{c.id}</span>
                <span className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2 py-0.5 text-xs font-semibold text-white">{Math.floor(c.duration / 60)}:{String(c.duration % 60).padStart(2, '0')}</span>
                <span className="absolute inset-0 grid place-items-center">
                  {c.open ? <PlayCircle size={44} className="text-white drop-shadow-lg" /> : <Lock size={34} className="text-white/90" />}
                </span>
              </div>
              <div className="mt-3 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{c.title}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    <RichText text={c.summary} />
                  </p>
                </div>
                {c.done ? <CheckCircle2 className="shrink-0 text-ok-500" /> : null}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="teal">Compétences {c.comp}</Badge>
                {c.id !== 'V0' && <Badge tone="violet">Mission {LESSON_MISSION[c.id as keyof typeof LESSON_MISSION]}</Badge>}
                <span className="ml-auto text-xs text-muted">vue à {c.percent} %</span>
              </div>
              <ProgressBar value={(c.steps.filter(Boolean).length / c.steps.length) * 100} className="mt-2" />
            </>
          );
          return c.open ? (
            <Link key={c.id} to={c.to} className="glass block p-3 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-4">
              {body}
            </Link>
          ) : (
            <div key={c.id} className="glass block cursor-not-allowed p-3 opacity-70 sm:p-4" aria-disabled="true">
              {body}
            </div>
          );
        })}
      </div>
    </StudentPage>
  );
}
