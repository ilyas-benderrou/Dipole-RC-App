import { Printer } from 'lucide-react';
import { TeacherPage, useTeacherData } from '../../app/teacher';
import { GroupedBarChart, ScatterPrePost } from '../../components/charts';
import { Badge, Button, Card, Notice } from '../../components/ui';
import { COMPETENCE_INFO } from '../../content/competences';
import { ERRORS } from '../../content/errors';
import { COMPETENCES, MAIN_ERRORS } from '../../engine/types';
import { analyzeExperiment, type GroupStats } from '../../data/experiment';
import { effectSizeLabel, fmt, fmtP, significanceText } from '../../data/stats';

const EXP_COLOR = '#0f7c7c';
const TEM_COLOR = '#1F6FD1';

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'confirmée' ? 'ok' : status === 'tendance' ? 'blue' : status === 'non confirmée' ? 'warn' : 'slate';
  return <Badge tone={tone}>{status === 'tendance' ? 'tendance non significative' : status === 'insuffisant' ? 'données insuffisantes' : status}</Badge>;
}

function GroupTable({ exp, tem }: { exp: GroupStats; tem: GroupStats }) {
  const rows: [string, (g: GroupStats) => string][] = [
    ['Effectif (pré / post / apparié)', (g) => `${g.nPre} / ${g.nPost} / ${g.nPaired}`],
    ['Pré-test : moyenne (écart-type)', (g) => `${fmt(g.meanPre)} (${fmt(g.sdPre)})`],
    ['Post-test : moyenne (écart-type)', (g) => `${fmt(g.meanPost)} (${fmt(g.sdPost)})`],
    ['Gain moyen post − pré (écart-type)', (g) => `${fmt(g.meanGain)} (${fmt(g.sdGain)})`],
    ['Gain normalisé moyen g', (g) => fmt(g.meanNormGain)],
  ];
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="label-caps text-left">
          <th className="py-2 font-semibold">Sur 20</th>
          <th className="font-semibold" style={{ color: EXP_COLOR }}>
            Expérimental
          </th>
          <th className="font-semibold" style={{ color: TEM_COLOR }}>
            Témoin
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-white/70">
        {rows.map(([label, f]) => (
          <tr key={label}>
            <td className="py-2 text-ink-soft">{label}</td>
            <td className="font-semibold tabular-nums">{f(exp)}</td>
            <td className="font-semibold tabular-nums">{f(tem)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Analyse de l'expérimentation : pré-test / post-test, groupe expérimental contre témoin (section 14.5). */
export function ExperimentPage() {
  const { data } = useTeacherData();
  if (!data) return <TeacherPage title="Expérimentation" data={null}>{null}</TeacherPage>;
  const a = analyzeExperiment(data.students, data.copies);
  const { exp, tem } = a;
  return (
    <TeacherPage title="Expérimentation" data={data}>
      <div className="space-y-5">
        <div className="no-print flex flex-wrap items-center gap-3">
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimer / PDF (pour le mémoire)
          </Button>
          <span className="text-sm text-muted">Les apprenants apparaissent sous leur code anonyme.</span>
        </div>
        {a.excludedPending > 0 && (
          <Notice tone="info">
            {a.excludedPending} copie(s) « À corriger » ne sont pas encore prises en compte : termine leur correction dans « Saisir les copies ».
          </Notice>
        )}
        {a.smallSample && <Notice tone="warn" title="Effectif faible : interpréter avec prudence.">Chaque groupe devrait compter au moins 10 apprenants avec les deux copies.</Notice>}

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Scores par groupe">
            <GroupTable exp={exp} tem={tem} />
          </Card>
          <Card title="Comparaison des groupes (test t de Welch)">
            <div className="space-y-3 text-sm">
              <div className="glass-inset p-3">
                <p className="label-caps">Au pré-test (niveau de départ)</p>
                <p className="mt-1 tabular-nums">
                  t = {fmt(a.preTest.t)} · ddl = {fmt(a.preTest.df, 1)} · p = {fmtP(a.preTest.p)}
                </p>
                <p className="text-ink-soft">{Number.isFinite(a.preTest.p) ? (a.preTest.p < 0.05 ? 'Les groupes ne partent pas du même niveau (différence significative).' : 'Les groupes partent d’un niveau comparable (différence non significative).') : 'Effectif insuffisant.'}</p>
              </div>
              <div className="glass-inset p-3">
                <p className="label-caps">Sur les gains</p>
                <p className="mt-1 tabular-nums">
                  t = {fmt(a.gainTest.t)} · ddl = {fmt(a.gainTest.df, 1)} · p = {fmtP(a.gainTest.p)} · d de Cohen = {fmt(a.gainD)} ({effectSizeLabel(a.gainD)})
                </p>
                <p className="font-semibold text-ink">{significanceText(a.gainTest.p)}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card title="Hypothèses du projet">
          <ul className="space-y-3">
            <li className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">H1 : le groupe expérimental progresse plus que le groupe témoin.</p>
                <p className="text-sm text-ink-soft">{a.h1.text}</p>
              </div>
              <StatusBadge status={a.h1.status} />
            </li>
            <li className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-white/60 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">H2 : les erreurs E1 à E6 diminuent davantage dans le groupe expérimental.</p>
                <p className="text-sm text-ink-soft">{a.h2.text}</p>
              </div>
              <StatusBadge status={a.h2.status} />
            </li>
          </ul>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Moyennes pré / post (barres d’écart-type)">
            <GroupedBarChart
              categories={['Expérimental', 'Témoin']}
              max={20}
              unit="/20"
              series={[
                { label: 'Pré-test', color: '#cbd5e1', values: [exp.meanPre || 0, tem.meanPre || 0] },
                { label: 'Post-test', color: EXP_COLOR, values: [exp.meanPost || 0, tem.meanPost || 0] },
              ]}
              errorBars={[
                [exp.sdPre || 0, tem.sdPre || 0],
                [exp.sdPost || 0, tem.sdPost || 0],
              ]}
            />
          </Card>
          <Card title="Gains individuels" subtitle="Au-dessus de la diagonale : l’apprenant a progressé.">
            <ScatterPrePost
              points={[
                ...exp.points.map((p) => ({ x: p.pre, y: p.post, color: EXP_COLOR, label: `${p.label} (exp.)` })),
                ...tem.points.map((p) => ({ x: p.pre, y: p.post, color: TEM_COLOR, label: `${p.label} (témoin)` })),
              ]}
            />
            <div className="mt-2 flex justify-center gap-4 text-xs text-ink-soft">
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: EXP_COLOR }} /> Expérimental</span>
              <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-full" style={{ background: TEM_COLOR }} /> Témoin</span>
            </div>
          </Card>
        </div>

        <Card title="Par compétence (moyennes en points)">
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="label-caps text-left">
                  <th className="py-2 font-semibold">Compétence</th>
                  <th className="font-semibold">Barème</th>
                  <th className="font-semibold" style={{ color: EXP_COLOR }}>Exp. pré</th>
                  <th className="font-semibold" style={{ color: EXP_COLOR }}>Exp. post</th>
                  <th className="font-semibold" style={{ color: TEM_COLOR }}>Témoin pré</th>
                  <th className="font-semibold" style={{ color: TEM_COLOR }}>Témoin post</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/70">
                {COMPETENCES.map((c) => (
                  <tr key={c}>
                    <td className="py-2">
                      <b>{c}</b> <span className="text-ink-soft">· {COMPETENCE_INFO[c].name}</span>
                    </td>
                    <td className="tabular-nums">/{exp.byCompetence[c].max}</td>
                    <td className="tabular-nums">{fmt(exp.byCompetence[c].pre)}</td>
                    <td className="tabular-nums">{fmt(exp.byCompetence[c].post)}</td>
                    <td className="tabular-nums">{fmt(tem.byCompetence[c].pre)}</td>
                    <td className="tabular-nums">{fmt(tem.byCompetence[c].post)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Erreurs avant / après" subtitle="Pourcentage d’apprenants qui commettent chaque erreur au pré-test et au post-test.">
          <GroupedBarChart
            categories={MAIN_ERRORS}
            series={[
              { label: 'Expérimental – pré', color: '#a6dcd9', values: MAIN_ERRORS.map((e) => exp.errorsPre[e]) },
              { label: 'Expérimental – post', color: EXP_COLOR, values: MAIN_ERRORS.map((e) => exp.errorsPost[e]) },
              { label: 'Témoin – pré', color: '#bcd4f5', values: MAIN_ERRORS.map((e) => tem.errorsPre[e]) },
              { label: 'Témoin – post', color: TEM_COLOR, values: MAIN_ERRORS.map((e) => tem.errorsPost[e]) },
            ]}
          />
          <p className="mt-2 text-xs text-muted">{MAIN_ERRORS.map((e) => `${e} : ${ERRORS[e].name}`).join(' · ')}</p>
        </Card>
      </div>
    </TeacherPage>
  );
}
