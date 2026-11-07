import { ArrowLeft, Send } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { TeacherPage, useTeacherData } from '../../app/teacher';
import { GroupedBarChart, ProgressChart } from '../../components/charts';
import { Badge, Button, Card, LevelBadge, MasteryBar, Modal, Notice, formatDate, formatDuration, relativeTime } from '../../components/ui';
import { COMPETENCE_INFO, GROUP_LABELS, LEVEL_LABELS } from '../../content/competences';
import { ERRORS } from '../../content/errors';
import { TEST_LABELS } from '../../content/tests';
import { VIDEOS } from '../../content/videos';
import { COMPETENCES, LEVELS, MISSION_IDS, VIDEO_IDS, type Group, type Level } from '../../engine/types';
import { progressSeries, studentSummary } from '../../data/analytics';
import { competenceMax, copyCompetenceScores, copyScore } from '../../data/instruments';
import { newId, repo } from '../../data/repository';

/** Fiche apprenant (section 14.2) et actions (14.7). */
export function TeacherStudentPage() {
  const { id } = useParams();
  const { data, reload } = useTeacherData();
  const [msg, setMsg] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  if (!data) return <TeacherPage title="Fiche apprenant" data={null}>{null}</TeacherPage>;
  const s = data.students.find((x) => x.id === id);
  if (!s)
    return (
      <TeacherPage title="Fiche apprenant" data={data}>
        <Card>Apprenant introuvable. <Link to="/prof" className="font-semibold text-teal-700">Retour</Link></Card>
      </TeacherPage>
    );
  const attempts = data.attempts.filter((a) => a.studentId === s.id).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const sum = studentSummary(attempts, data.views.filter((v) => v.studentId === s.id), data.missions.filter((r) => r.studentId === s.id));
  const alerts = data.alerts.filter((a) => a.studentId === s.id);
  const response = data.responses.find((r) => r.studentId === s.id);
  const pre = data.copies.find((c) => c.studentId === s.id && c.test === 'pre');
  const post = data.copies.find((c) => c.studentId === s.id && c.test === 'post');
  const max = competenceMax('pre');
  const messages = data.messages.filter((m) => m.studentId === s.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const act = async (fn: () => Promise<unknown>, text: string) => {
    await fn();
    await reload();
    setNotice(text);
  };

  return (
    <TeacherPage title={`${s.firstName} ${s.lastName}`} data={data}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/prof" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:underline">
            <ArrowLeft size={15} /> Vue classe
          </Link>
          <Badge tone="slate">{s.anonCode}</Badge>
          <Badge tone="slate">{s.classCode}</Badge>
          <Badge tone={s.group === 'experimental' ? 'teal' : s.group === 'temoin' ? 'blue' : 'violet'}>{GROUP_LABELS[s.group]}</Badge>
          <LevelBadge level={s.model.level} />
          {s.model.completed && <Badge tone="ok">Niveau difficile validé</Badge>}
          <span className="text-sm text-muted">Dernière activité : {relativeTime(s.lastActive)}</span>
        </div>
        {notice && <Notice tone="ok">{notice}</Notice>}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <Card title="Compétences et progression">
              <div className="grid gap-x-6 gap-y-2.5 md:grid-cols-2">
                {COMPETENCES.map((c) => (
                  <div key={c}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink-soft">
                        <b className="text-ink">{c}</b> · {COMPETENCE_INFO[c].name}
                      </span>
                      <span className="font-semibold tabular-nums">{s.model.competences[c]} %</span>
                    </div>
                    <MasteryBar value={s.model.competences[c]} />
                  </div>
                ))}
              </div>
              <div className="mt-5">
                <ProgressChart series={[...progressSeries(attempts)]} showCompetences />
              </div>
            </Card>

            <Card title="Pré-test et post-test par compétence">
              {pre || post ? (
                <>
                  <GroupedBarChart
                    categories={COMPETENCES}
                    max={5}
                    unit="pts"
                    series={[
                      ...(pre ? [{ label: `${TEST_LABELS.pre} (${copyScore(pre)}/20)`, color: '#cbd5e1', values: COMPETENCES.map((c) => copyCompetenceScores(pre)[c]) }] : []),
                      ...(post ? [{ label: `${TEST_LABELS.post} (${copyScore(post)}/20)`, color: '#0f7c7c', values: COMPETENCES.map((c) => copyCompetenceScores(post)[c]) }] : []),
                    ]}
                  />
                  <p className="mt-1 text-xs text-muted">Barème : {COMPETENCES.map((c) => `${c} /${max[c]}`).join(' · ')}</p>
                  {(pre?.pendingManual || post?.pendingManual) && <Notice tone="warn" className="mt-2">Une copie est « À corriger » (questions 2.1 et 2.2).</Notice>}
                </>
              ) : (
                <p className="text-sm text-muted">Aucune copie saisie. <Link to={`/prof/copies?apprenant=${s.id}`} className="font-semibold text-teal-700 hover:underline">Saisir les copies</Link></p>
              )}
            </Card>

            <Card title="Historique des tentatives" subtitle={`${sum.attempts} tentatives · ${sum.successes} réussies · ${sum.hints} indices · temps : ${formatDuration(sum.timeSec)}`}>
              <div className="thin-scroll max-h-96 overflow-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="label-caps text-left">
                      <th className="py-1.5 font-semibold">Date</th>
                      <th className="font-semibold">Exercice</th>
                      <th className="font-semibold">Résultat</th>
                      <th className="font-semibold">Erreurs</th>
                      <th className="font-semibold">Indices</th>
                      <th className="font-semibold">Durée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/70">
                    {attempts.map((a) => (
                      <tr key={a.id}>
                        <td className="py-1.5 text-ink-soft">{formatDate(a.startedAt)}</td>
                        <td>
                          <b>{a.templateId}</b> <span className="text-xs text-muted">{LEVEL_LABELS[a.level]}</span>
                          {a.remediation && <Badge tone="violet" className="ml-1">rem.</Badge>}
                          {a.review && <Badge tone="blue" className="ml-1">rév.</Badge>}
                        </td>
                        <td>
                          {a.success ? <Badge tone="ok">réussi</Badge> : a.outcome === 'alert' ? <Badge tone="warn">alerte</Badge> : a.outcome === 'remediation' ? <Badge tone="violet">remédiation</Badge> : <Badge>{a.outcome === 'helped' ? 'avec aide' : 'abandonné'}</Badge>}
                        </td>
                        <td>{a.errors.join(', ') || '—'}</td>
                        <td>{a.hintsUsed}</td>
                        <td className="text-ink-soft">{formatDuration(a.durationSec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!attempts.length && <p className="py-4 text-sm text-muted">Aucune tentative.</p>}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            <Card title="Actions">
              <div className="space-y-3 text-sm">
                <label className="block">
                  <span className="mb-1 block font-semibold text-ink-soft">Groupe</span>
                  <select className="field" value={s.group} onChange={(e) => void act(() => repo.saveStudent({ ...s, group: e.target.value as Group }), 'Groupe modifié.')}>
                    <option value="experimental">Expérimental</option>
                    <option value="temoin">Témoin</option>
                    <option value="diagnostic">Diagnostic</option>
                  </select>
                </label>
                {s.group === 'temoin' && (
                  <label className="flex items-center gap-2">
                    <input type="checkbox" className="accent-teal-600" checked={s.accessOpened} onChange={(e) => void act(() => repo.saveStudent({ ...s, accessOpened: e.target.checked }), e.target.checked ? 'Parcours complet ouvert (équité).' : 'Parcours fermé.')} />
                    Ouvrir le parcours complet (après le post-test)
                  </label>
                )}
                <label className="block">
                  <span className="mb-1 block font-semibold text-ink-soft">Niveau</span>
                  <select
                    className="field"
                    value={s.model.level}
                    onChange={(e) => {
                      const level = e.target.value as Level;
                      const maxReached = LEVELS.indexOf(level) > LEVELS.indexOf(s.model.maxLevelReached) ? level : s.model.maxLevelReached;
                      void act(() => repo.saveStudent({ ...s, model: { ...s.model, level, maxLevelReached: maxReached, streak: { count: 0, noHint: 0 }, exercisesUnlocked: true } }), `Niveau changé : ${LEVEL_LABELS[level]}.`);
                    }}
                  >
                    {LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {LEVEL_LABELS[l]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-teal-600" checked={s.model.exercisesUnlocked} onChange={(e) => void act(() => repo.saveStudent({ ...s, model: { ...s.model, exercisesUnlocked: e.target.checked } }), e.target.checked ? 'Leçons et exercices débloqués.' : 'Déblocage retiré.')} />
                  Débloquer leçons et exercices
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {alerts.some((a) => !a.resolved) && (
                    <Button size="sm" variant="secondary" onClick={() => void act(() => repo.resolveAlerts(s.id), 'Alertes traitées.')}>
                      Traiter les alertes
                    </Button>
                  )}
                  {response && (
                    <Button size="sm" variant="secondary" onClick={() => void act(() => repo.allowQuestionnaireRetake(s.id), 'Reprise du questionnaire autorisée.')}>
                      Autoriser une reprise du questionnaire
                    </Button>
                  )}
                  <Button size="sm" variant="warn" onClick={() => setConfirmReset(true)}>
                    Réinitialiser la progression
                  </Button>
                </div>
              </div>
            </Card>

            <Card title="Laisser un message">
              <form
                className="space-y-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!msg.trim()) return;
                  await act(() => repo.addMessage({ id: newId('msg'), studentId: s.id, text: msg.trim(), createdAt: new Date().toISOString(), read: false }), 'Message envoyé.');
                  setMsg('');
                }}
              >
                <textarea className="field min-h-[4.5rem]" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Un mot d’encouragement, un conseil…" maxLength={400} />
                <Button type="submit" size="sm" disabled={!msg.trim()}>
                  <Send size={15} /> Envoyer
                </Button>
              </form>
              {messages.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-sm">
                  {messages.map((m) => (
                    <li key={m.id} className="rounded-xl bg-white/55 px-3 py-1.5">
                      {m.text} <span className="text-xs text-muted">· {relativeTime(m.createdAt)} {m.read ? '· lu' : ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Erreurs">
              {sum.errorCounts.length ? (
                <ul className="space-y-1.5 text-sm">
                  {sum.errorCounts.map((e) => (
                    <li key={e.code} className="flex justify-between gap-2">
                      <span>
                        <b>{e.code}</b> · <span className="text-ink-soft">{ERRORS[e.code].name}</span>
                      </span>
                      <span className="tabular-nums">
                        {e.count}× {sum.repeated.includes(e.code) && <Badge tone="warn">répétée</Badge>}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">Aucune erreur codée.</p>
              )}
              {alerts.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-muted">
                  {alerts.map((a) => (
                    <li key={a.id}>
                      Alerte {a.code} · {formatDate(a.createdAt)} {a.resolved ? '· traitée' : '· active'}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Vidéos et missions" subtitle={`Laboratoire : ${formatDuration(s.model.labTimeSec)} · ${sum.missionsDone}/8 missions · ${sum.remediationVideos} micro-vidéos de remédiation`}>
              <ul className="grid grid-cols-3 gap-x-3 gap-y-1 text-sm">
                {VIDEO_IDS.map((v) => (
                  <li key={v} className="flex justify-between" title={VIDEOS[v].title}>
                    <span className="text-ink-soft">{v}</span>
                    <span className="tabular-nums">{s.model.videos[v]?.percent ?? 0} %</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-1">
                {MISSION_IDS.map((m) => (
                  <Badge key={m} tone={s.model.missions[m]?.done ? 'ok' : 'slate'}>
                    {m}
                  </Badge>
                ))}
              </div>
            </Card>

            <Card title="Questionnaire diagnostique">
              {response?.submittedAt ? <p className="text-sm text-ink-soft">Envoyé {relativeTime(response.submittedAt)}{response.autoSubmitted ? ' (automatiquement, temps écoulé)' : ''}.</p> : response ? <p className="text-sm text-ink-soft">En cours.</p> : <p className="text-sm text-muted">Pas de passation.</p>}
            </Card>
          </div>
        </div>
      </div>
      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Réinitialiser la progression ?">
        <p className="text-sm text-ink-soft">Le modèle de l’apprenant (niveau, compétences, parcours) repart de zéro et ses alertes sont closes. L’historique des tentatives est conservé pour l’expérimentation.</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmReset(false)}>
            Annuler
          </Button>
          <Button
            variant="warn"
            onClick={() => {
              setConfirmReset(false);
              void act(() => repo.resetStudentProgress(s.id), 'Progression réinitialisée.');
            }}
          >
            Réinitialiser
          </Button>
        </div>
      </Modal>
    </TeacherPage>
  );
}
