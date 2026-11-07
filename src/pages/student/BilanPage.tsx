import { CheckCircle2, Circle, Clock, Film, Target, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StudentPage, useStudent } from '../../app/student';
import { useTutor } from '../../app/tutor';
import { ProgressChart } from '../../components/charts';
import { Illustration } from '../../components/Illustration';
import { Badge, Card, MasteryBar, StatCard, formatDuration } from '../../components/ui';
import { COMPETENCE_INFO, LEVEL_LABELS } from '../../content/competences';
import { ERRORS } from '../../content/errors';
import { MISSIONS } from '../../content/missions';
import { VIDEOS } from '../../content/videos';
import { levelIndex } from '../../engine/adaptive';
import { COMPETENCES, LEVELS, MISSION_IDS, VIDEO_IDS } from '../../engine/types';
import { learnerBilan, progressSeries } from '../../data/analytics';
import { repo } from '../../data/repository';
import type { Attempt } from '../../data/types';

/** Bilan : niveaux validés, compétences, erreurs corrigées (aucune note négative, aucun classement). */
export function BilanPage() {
  const { student } = useStudent();
  const tutor = useTutor();
  const [attempts, setAttempts] = useState<Attempt[] | null>(null);
  const m = student.model;

  useEffect(() => {
    void repo.listAttempts({ studentId: student.id }).then(setAttempts);
    tutor.say('bilan');
  }, [student.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const b = learnerBilan(attempts ?? []);
  const validated = (l: (typeof LEVELS)[number]) => (l === 'difficile' ? m.completed : levelIndex(m.maxLevelReached) > levelIndex(l));
  const missionsDone = MISSION_IDS.filter((id) => m.missions[id]?.done).length;

  return (
    <StudentPage title="Mon bilan">
      <div className="cascade space-y-5">
        <div className="banner-teal relative overflow-hidden rounded-[22px] p-5 text-white sm:p-7">
          <div className="relative z-10 max-w-[62%]">
            <p className="label-caps !text-teal-100">Bravo {student.firstName}</p>
            <p className="mt-1 text-2xl font-semibold leading-snug sm:text-3xl">
              {m.completed ? 'Tu maîtrises le dipôle RC !' : `Niveau ${LEVEL_LABELS[m.level].toLowerCase()} en cours`}
            </p>
            <p className="mt-2 text-sm text-teal-50">
              {b.successes} exercice{b.successes > 1 ? 's' : ''} réussi{b.successes > 1 ? 's' : ''} · {b.errorsCorrected.length} erreur{b.errorsCorrected.length > 1 ? 's' : ''} corrigée{b.errorsCorrected.length > 1 ? 's' : ''} · {missionsDone} mission{missionsDone > 1 ? 's' : ''}
            </p>
          </div>
          <Illustration name="trophy" className="pointer-events-none absolute -bottom-2 right-2 h-[115%] w-auto max-w-[40%] object-contain" />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <StatCard label="Exercices réussis" value={b.successes} unit={`/${b.exercises}`} icon={<Trophy size={18} />} color="rose" />
          <StatCard label="Temps passé" value={formatDuration(m.activeTimeSec)} icon={<Clock size={18} />} color="orange" />
          <StatCard label="Missions réussies" value={missionsDone} unit="/8" icon={<Target size={18} />} color="violet" />
          <StatCard label="Vidéos vues" value={VIDEO_IDS.filter((v) => (m.videos[v]?.percent ?? 0) >= 80).length} unit="/12" icon={<Film size={18} />} color="teal" />
        </div>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Niveaux validés">
            <ol className="grid grid-cols-3 gap-3">
              {LEVELS.map((l) => (
                <li key={l} className={`glass-inset flex flex-col items-center gap-1.5 p-4 text-center ${validated(l) ? '' : 'opacity-60'}`}>
                  {validated(l) ? <CheckCircle2 className="text-ok-500" size={28} /> : <Circle className="text-slate-300" size={28} />}
                  <span className="font-semibold text-ink">{LEVEL_LABELS[l]}</span>
                  <span className="text-xs text-muted">{validated(l) ? 'validé' : l === m.level ? 'en cours' : 'à venir'}</span>
                </li>
              ))}
            </ol>
          </Card>
          <Card title="Erreurs travaillées" subtitle="Chaque erreur corrigée est une victoire.">
            {b.errorsMade.length === 0 ? (
              <p className="text-sm text-muted">Aucune erreur fréquente détectée pour l’instant.</p>
            ) : (
              <ul className="space-y-2">
                {b.errorsMade.map((code) => (
                  <li key={code} className="flex items-center justify-between gap-3 rounded-xl bg-white/55 px-3 py-2 text-sm">
                    <span>
                      <b className="text-ink">{code}</b> · <span className="text-ink-soft">{ERRORS[code].name}</span>
                    </span>
                    {b.errorsCorrected.includes(code) ? <Badge tone="ok">corrigée ✓</Badge> : <Badge tone="blue">en cours</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Mes compétences">
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {COMPETENCES.map((c) => (
              <div key={c}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink-soft">
                    <b className="text-ink">{c}</b> · {COMPETENCE_INFO[c].name}
                  </span>
                  <span className="font-semibold tabular-nums text-ink">{m.competences[c]} %</span>
                </div>
                <MasteryBar value={m.competences[c]} />
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Ma progression">
            <ProgressChart series={progressSeries(attempts ?? [])} />
          </Card>
          <Card title="Missions et vidéos">
            <div className="flex flex-wrap gap-1.5">
              {MISSION_IDS.map((id) => (
                <Badge key={id} tone={m.missions[id]?.done ? 'ok' : 'slate'}>
                  {id} · {MISSIONS[id].title}
                </Badge>
              ))}
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
              {VIDEO_IDS.map((v) => (
                <li key={v} className="flex justify-between gap-2" title={VIDEOS[v].title}>
                  <span className="text-ink-soft">{v}</span>
                  <span className="tabular-nums text-ink">{m.videos[v]?.percent ?? 0} %</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </StudentPage>
  );
}
