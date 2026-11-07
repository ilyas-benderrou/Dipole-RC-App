import { ArrowRight, Clock, ClipboardList, Film, Mail, Sparkles, Trophy, TrendingUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { StudentPage, useStudent } from '../../app/student';
import { useTutor } from '../../app/tutor';
import { Illustration } from '../../components/Illustration';
import { Journey } from '../../components/Journey';
import { Button, Card, MasteryBar, Pastille, StatCard, formatDuration } from '../../components/ui';
import { COMPETENCE_INFO, LEVEL_LABELS } from '../../content/competences';
import { LESSON_INFO } from '../../content/videos';
import { exercisesOpen, lessonDone, videoSeen, type LearnerModel } from '../../engine/adaptive';
import { COMPETENCES, LESSON_IDS, type VideoId } from '../../engine/types';
import { repo } from '../../data/repository';
import type { Attempt } from '../../data/types';

function nextStep(m: LearnerModel): { label: string; title: string; desc: string; to: string; cta: string } {
  if (!m.journey.introVideo || !m.journey.introQuestion)
    return { label: 'Vidéo d’introduction', title: 'V0 · Charge et décharge', desc: 'Une vidéo de 4 minutes pour découvrir le dipôle RC, puis une question.', to: '/apprenant/introduction', cta: 'Commencer' };
  for (const l of LESSON_IDS) {
    if (!lessonDone(m, l)) {
      const p = m.journey.lessons[l];
      const sub = !p.video ? 'vidéo de 30 s' : !p.flash ? 'question flash' : 'mini-mission au labo';
      return { label: `Leçon ${l}`, title: `${l} · ${LESSON_INFO[l].title}`, desc: `Prochaine étape : ${sub}.`, to: `/apprenant/lecons/${l}`, cta: 'Continuer' };
    }
  }
  if (m.completed)
    return { label: 'Parcours terminé', title: 'Bravo, niveau difficile validé !', desc: 'Regarde ton bilan ou continue à t’entraîner.', to: '/apprenant/bilan', cta: 'Voir mon bilan' };
  return {
    label: 'Exercices',
    title: `Niveau ${LEVEL_LABELS[m.level].toLowerCase()}`,
    desc: `${m.streak.count} réussite${m.streak.count > 1 ? 's' : ''} d’affilée sur 3 pour passer au niveau suivant.`,
    to: '/apprenant/exercices',
    cta: 'Continuer',
  };
}

const PATH_VIDEOS: VideoId[] = ['V0', 'L1', 'L2', 'L3', 'L4', 'L5'];

/** Accueil apprenant (section 15.2) : prochaine étape, progression, compétences, statistiques, parcours. */
export function StudentHome() {
  const { student, questionnaire, messages, fullAccess } = useStudent();
  const tutor = useTutor();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const m = student.model;

  useEffect(() => {
    void repo.listAttempts({ studentId: student.id }).then(setAttempts);
  }, [student.id]);

  useEffect(() => {
    if (questionnaire.pending || !fullAccess) return;
    const absentDays = student.lastActive ? (Date.now() - new Date(student.lastActive).getTime()) / 86400000 : 0;
    const h = new Date().getHours();
    const mean = COMPETENCES.reduce((s, c) => s + m.competences[c], 0) / COMPETENCES.length / 100;
    if (!m.journey.introQuestion) tutor.say('welcomeStart');
    else if (absentDays > 3) tutor.say('comeback');
    else if (m.exercisesDone > 0 && Math.random() < 0.4) tutor.say('welcomeAdvanced', { vars: { niveau: LEVEL_LABELS[m.level].toLowerCase() }, level: mean });
    else tutor.say(h < 12 ? 'welcomeMorning' : h < 18 ? 'welcomeAfternoon' : 'welcomeEvening', { level: mean });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!fullAccess) {
    return (
      <StudentPage title="Accueil" requires="none" allowDuringQuestionnaire>
        <div className="mx-auto max-w-2xl space-y-4">
          {questionnaire.pending && <QuestionnaireCard />}
          <Card>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Illustration name="empty-lab" className="h-40 w-auto" />
              <p className="text-ink-soft">
                {student.group === 'diagnostic'
                  ? questionnaire.submitted
                    ? 'Merci ! Tes réponses au questionnaire ont bien été envoyées.'
                    : 'Ton groupe participe au questionnaire diagnostique. Il apparaîtra ici quand ton professeur l’ouvrira.'
                  : 'Ton parcours sera ouvert par ton professeur après le post-test. Merci de ta patience !'}
              </p>
            </div>
          </Card>
        </div>
      </StudentPage>
    );
  }

  const step = nextStep(m);
  const successNoHint = attempts.filter((a) => a.success && a.hintsUsed === 0).length;
  const successHint = attempts.filter((a) => a.success && a.hintsUsed > 0).length;
  const notSuccess = attempts.filter((a) => !a.success).length;
  const total = Math.max(1, attempts.length);
  const errors = attempts.reduce((s, a) => s + a.errors.length, 0);
  const hints = attempts.reduce((s, a) => s + a.hintsUsed, 0);
  const videos = PATH_VIDEOS.filter((v) => videoSeen(m, v)).length;
  const unread = messages.filter((x) => !x.read);

  return (
    <StudentPage title="Accueil" requires="none" allowDuringQuestionnaire>
      <div className="cascade space-y-5">
        {questionnaire.pending && <QuestionnaireCard />}

        {unread.length > 0 && (
          <Card className="!bg-violet-50/80">
            <div className="flex items-start gap-3">
              <Pastille color="violet">
                <Mail size={18} />
              </Pastille>
              <div>
                <p className="label-caps">Message de ton professeur</p>
                <p className="text-ink">{unread[unread.length - 1].text}</p>
              </div>
            </div>
          </Card>
        )}

        <Card title="Mon parcours" action={<Link to={step.to}>Étape actuelle</Link>}>
          <Journey model={m} />
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card title="Prochaine étape" action={<Link to="/apprenant/lecons">Voir les leçons</Link>}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Pastille color="teal" size={52}>
                    <Sparkles size={24} />
                  </Pastille>
                  <div className="min-w-0">
                    <p className="label-caps">{step.label}</p>
                    <p className="text-lg font-semibold text-ink">{step.title}</p>
                    <p className="text-sm text-ink-soft">{step.desc}</p>
                  </div>
                </div>
                <Button size="lg" onClick={() => navigate(step.to)} disabled={questionnaire.pending}>
                  {step.cta} <ArrowRight size={18} />
                </Button>
              </div>
            </Card>

            <Card title="Mes compétences" action={<Link to="/apprenant/bilan">Voir le bilan</Link>}>
              <ul className="divide-y divide-white/70">
                {COMPETENCES.map((c) => (
                  <li key={c} className="grid grid-cols-[2.4rem_minmax(0,1fr)_3rem] items-center gap-3 py-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/80 text-xs font-bold text-teal-700 ring-1 ring-teal-100">{c}</span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{COMPETENCE_INFO[c].name}</p>
                      <MasteryBar value={m.competences[c]} className="mt-1.5" />
                    </div>
                    <span className="text-right text-sm font-semibold tabular-nums text-ink">{m.competences[c]} %</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <div className="space-y-5">
            <Card title="Ma progression" action={<Link to="/apprenant/exercices">Exercices</Link>}>
              <div className="glass-inset p-4">
                <div className="flex h-2.5 overflow-hidden rounded-full bg-ink/8" role="img" aria-label="Réussites, réussites avec indice, exercices non réussis">
                  <div className="bar-fill bg-teal-600" style={{ width: `${(successNoHint / total) * 100}%` }} />
                  <div className="bar-fill bg-slate-200" style={{ width: `${(successHint / total) * 100}%` }} />
                  <div className="bar-fill bg-warn-500/80" style={{ width: `${(notSuccess / total) * 100}%` }} />
                </div>
                <dl className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[
                    ['Exercices', attempts.length],
                    ['Réussis', successNoHint + successHint],
                    ['Indices', hints],
                    ['Erreurs', errors],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <dt className="label-caps !text-[10px]">{k}</dt>
                      <dd className="text-lg font-semibold text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Card>

            <div className="grid grid-cols-2 gap-3 sm:gap-5">
              <StatCard label="Niveau actuel" value={LEVEL_LABELS[m.level]} icon={<TrendingUp size={18} />} color="violet" hint={exercisesOpen(m) ? undefined : 'après les leçons'} />
              <StatCard label="Exercices réussis" value={m.exercisesSucceeded} icon={<Trophy size={18} />} color="rose" />
              <StatCard label="Temps passé" value={formatDuration(m.activeTimeSec)} icon={<Clock size={18} />} color="orange" />
              <StatCard label="Vidéos vues" value={videos} unit={`/${PATH_VIDEOS.length}`} icon={<Film size={18} />} color="teal" />
            </div>

            <div className="banner-teal relative overflow-hidden rounded-[20px] p-5 text-white shadow-[0_24px_48px_-24px_rgba(15,124,124,0.8)] sm:p-6">
              <div className="relative z-10 max-w-[60%]">
                <p className="label-caps !text-teal-100">N’oublie pas</p>
                <p className="mt-1 text-xl font-semibold leading-snug sm:text-2xl">Teste τ au laboratoire</p>
                <button type="button" onClick={() => navigate('/apprenant/labo')} className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow hover:bg-teal-50">
                  Aller au laboratoire
                </button>
              </div>
              <Illustration name="banner-3d" className="pointer-events-none absolute -bottom-3 right-0 h-[118%] w-auto max-w-[52%] object-contain" />
            </div>
          </div>
        </div>
      </div>
    </StudentPage>
  );
}

function QuestionnaireCard() {
  const navigate = useNavigate();
  return (
    <Card className="!bg-amber-50/85 ring-2 ring-amber-300/70">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Pastille color="orange" size={48}>
          <ClipboardList size={22} />
        </Pastille>
        <div className="min-w-0 flex-1">
          <p className="label-caps !text-amber-700">À faire</p>
          <p className="text-lg font-semibold text-ink">Questionnaire diagnostique</p>
          <p className="text-sm text-ink-soft">12 questions, 20 minutes, non noté. Le parcours est verrouillé jusqu’à l’envoi.</p>
        </div>
        <Button size="lg" onClick={() => navigate('/apprenant/questionnaire')}>
          Commencer <ArrowRight size={18} />
        </Button>
      </div>
    </Card>
  );
}
