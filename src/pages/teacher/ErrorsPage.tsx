import { useState } from 'react';
import { TeacherPage, useTeacherData } from '../../app/teacher';
import { ERROR_COLORS, HBarChart, WeeklyLines } from '../../components/charts';
import { Card, Tabs } from '../../components/ui';
import { ERRORS } from '../../content/errors';
import { MAIN_ERRORS } from '../../engine/types';
import { classErrorFrequency, weeklyErrorEvolution } from '../../data/analytics';

/** Erreurs fréquentes dans le parcours (section 14.3). */
export function ErrorsPage() {
  const { data } = useTeacherData();
  const [classCode, setClassCode] = useState('all');
  if (!data) return <TeacherPage title="Erreurs fréquentes" data={null}>{null}</TeacherPage>;
  const learners = data.students.filter((s) => (s.group === 'experimental' || s.accessOpened) && (classCode === 'all' || s.classCode === classCode));
  const freq = classErrorFrequency(learners, data.attempts);
  const weekly = weeklyErrorEvolution(learners, data.attempts);
  return (
    <TeacherPage title="Erreurs fréquentes" data={data}>
      <div className="space-y-5">
        <Tabs value={classCode} onChange={setClassCode} items={[{ id: 'all', label: 'Toutes les classes' }, ...data.classes.map((c) => ({ id: c.code, label: c.code }))]} />
        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Apprenants ayant commis chaque erreur" subtitle={`Pourcentage des ${learners.length} apprenants du parcours (exercices).`}>
            <HBarChart rows={freq.map((f) => ({ label: f.code, sub: ERRORS[f.code].name, value: f.percent, color: ERROR_COLORS[f.code], tooltip: `${f.students} apprenants · ${f.occurrences} occurrences` }))} />
          </Card>
          <Card title="Évolution semaine par semaine" subtitle="Pourcentage des apprenants actifs de la semaine.">
            <WeeklyLines weeks={weekly.map((w) => w.week)} series={MAIN_ERRORS.map((e) => ({ label: e, color: ERROR_COLORS[e], values: weekly.map((w) => w.percent[e]) }))} />
          </Card>
        </div>
        <Card title="Base des erreurs">
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="label-caps text-left">
                  <th className="py-2 font-semibold">Code</th>
                  <th className="font-semibold">Erreur</th>
                  <th className="font-semibold">Micro-vidéo</th>
                  <th className="font-semibold">Mission</th>
                  <th className="font-semibold">Remédiation</th>
                  <th className="font-semibold">Occurrences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {freq.map((f) => (
                  <tr key={f.code}>
                    <td className="py-2 font-bold" style={{ color: ERROR_COLORS[f.code] }}>
                      {f.code}
                    </td>
                    <td>{ERRORS[f.code].name}</td>
                    <td>{ERRORS[f.code].video}</td>
                    <td>{ERRORS[f.code].missions.join(', ')}</td>
                    <td>{ERRORS[f.code].remediation.join(', ')}</td>
                    <td className="tabular-nums">{f.occurrences}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </TeacherPage>
  );
}
