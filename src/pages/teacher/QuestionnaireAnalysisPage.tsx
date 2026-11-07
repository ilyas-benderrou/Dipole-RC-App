import { Lock, Unlock } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TeacherPage, useTeacherData } from '../../app/teacher';
import { Legend, StackedBarChart } from '../../components/charts';
import { RichText } from '../../components/Tex';
import { Badge, Button, Card, Field, Notice, Tabs } from '../../components/ui';
import { CRI_NOTE, EXPLAIN_QUESTIONS, QUESTIONS } from '../../content/questionnaire';
import { ERRORS } from '../../content/errors';
import { ERROR_CODES, type ErrorCode } from '../../engine/types';
import { CRI_LABELS, analyzeQuestionnaire } from '../../data/instruments';
import { repo } from '../../data/repository';
import type { OptionKey } from '../../data/types';

const KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

/** Analyse du questionnaire diagnostique (section 14.4) + ouverture/fermeture (13.1). */
export function QuestionnaireAnalysisPage() {
  const { data, reload } = useTeacherData();
  const [classCode, setClassCode] = useState('all');
  const [qFilter, setQFilter] = useState('all');
  const [deadline, setDeadline] = useState<Record<string, string>>({});
  const responses = useMemo(() => {
    if (!data) return [];
    const ids = new Set(data.students.filter((s) => classCode === 'all' || s.classCode === classCode).map((s) => s.id));
    return data.responses.filter((r) => ids.has(r.studentId));
  }, [data, classCode]);
  if (!data) return <TeacherPage title="Questionnaire diagnostique" data={null}>{null}</TeacherPage>;
  const threshold = data.settings.confirmThreshold;
  const a = analyzeQuestionnaire(responses, threshold);
  const totalAnswers = Object.values(a.matrix).reduce((s, v) => s + v, 0) || 1;
  const pct = (v: number) => Math.round((v / totalAnswers) * 100);
  const byId = new Map(data.students.map((s) => [s.id, s]));

  const setTag = async (respId: string, qid: string, tag: ErrorCode | null) => {
    const r = data.responses.find((x) => x.id === respId);
    if (!r) return;
    await repo.saveQuestionnaireResponse({ ...r, answers: { ...r.answers, [qid]: { ...r.answers[qid], teacherTag: tag } } });
    await reload();
  };

  return (
    <TeacherPage title="Questionnaire diagnostique" data={data}>
      <div className="space-y-5">
        <Card title="Passation" subtitle="Ouvre le questionnaire pour une classe ; les apprenants voient une carte « À faire » et le parcours est verrouillé jusqu’à l’envoi.">
          <div className="grid gap-3 md:grid-cols-2">
            {data.classes.map((c) => {
              const w = data.windows.find((x) => x.classCode === c.code);
              const expired = !!(w?.open && w.deadline && new Date(w.deadline).getTime() < Date.now());
              const open = !!w?.open && !expired;
              const classIds = new Set(data.students.filter((s) => s.classCode === c.code).map((s) => s.id));
              const done = data.responses.filter((r) => classIds.has(r.studentId) && r.submittedAt).length;
              return (
                <div key={c.code} className="glass-inset space-y-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{c.code}</p>
                    {open ? <Badge tone="ok">ouvert</Badge> : <Badge>fermé{expired ? ' (date limite passée)' : ''}</Badge>}
                  </div>
                  <p className="text-xs text-muted">
                    {done} / {classIds.size} passations envoyées
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <Field label="Date limite (facultative)" className="min-w-[12rem] flex-1">
                      <input type="datetime-local" className="field py-1.5 text-sm" value={deadline[c.code] ?? (w?.deadline ? w.deadline.slice(0, 16) : '')} onChange={(e) => setDeadline({ ...deadline, [c.code]: e.target.value })} />
                    </Field>
                    {open ? (
                      <Button size="sm" variant="secondary" onClick={async () => (await repo.saveQuestionnaireWindow({ classCode: c.code, open: false, openedAt: w?.openedAt ?? null, closedAt: new Date().toISOString(), deadline: w?.deadline ?? null }), reload())}>
                        <Lock size={15} /> Fermer
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={async () => {
                          const d = deadline[c.code];
                          await repo.saveQuestionnaireWindow({ classCode: c.code, open: true, openedAt: new Date().toISOString(), closedAt: null, deadline: d ? new Date(d).toISOString() : null });
                          await reload();
                        }}
                      >
                        <Unlock size={15} /> Ouvrir
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Une seule passation par apprenant ; une reprise s’autorise depuis la fiche de l’apprenant.</p>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={classCode} onChange={setClassCode} items={[{ id: 'all', label: 'Toutes les classes' }, ...data.classes.map((c) => ({ id: c.code, label: c.code }))]} />
          <span className="text-sm text-muted">{a.respondents} répondants</span>
        </div>

        <Card className="!bg-teal-50/80" title="Conclusion automatique">
          {a.respondents === 0 ? (
            <p className="text-sm text-muted">Aucune passation envoyée pour l’instant.</p>
          ) : (
            <p className="text-ink">
              <b>Erreurs confirmées</b> (choisies avec certitude haute par au moins {Math.round(threshold * 100)} % des apprenants) :{' '}
              {a.confirmed.length ? a.confirmed.map((c) => `${c} (${ERRORS[c].name})`).join(' ; ') : 'aucune'}.
            </p>
          )}
          <p className="mt-1 text-xs text-muted">Le seuil se règle dans les réglages.</p>
        </Card>

        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Par erreur" subtitle="Pourcentage d’apprenants concernés.">
            <StackedBarChart
              rows={a.byError.map((e) => ({ label: e.code, sub: ERRORS[e.code].name, parts: [e.conception, e.manque] }))}
              legend={[
                { label: 'Conception erronée (certitude haute)', color: '#E67E22' },
                { label: 'Manque de connaissance (certitude basse)', color: '#f6c08e' },
              ]}
            />
          </Card>
          <Card title="Matrice certitude" subtitle={CRI_NOTE}>
            <div className="grid grid-cols-[auto_1fr_1fr] gap-2 text-sm">
              <span />
              <span className="label-caps text-center">Certitude basse (0–1)</span>
              <span className="label-caps text-center">Certitude haute (2–3)</span>
              <span className="label-caps self-center">Juste</span>
              <div className="rounded-xl bg-sky-100/80 p-3 text-center">
                <p className="text-2xl font-semibold">{pct(a.matrix.devinee)} %</p>
                <p className="text-xs text-ink-soft">{CRI_LABELS.devinee}</p>
              </div>
              <div className="rounded-xl bg-teal-100/90 p-3 text-center">
                <p className="text-2xl font-semibold">{pct(a.matrix.maitrise)} %</p>
                <p className="text-xs text-ink-soft">{CRI_LABELS.maitrise}</p>
              </div>
              <span className="label-caps self-center">Fausse</span>
              <div className="rounded-xl bg-amber-100/80 p-3 text-center">
                <p className="text-2xl font-semibold">{pct(a.matrix.manque)} %</p>
                <p className="text-xs text-ink-soft">{CRI_LABELS.manque}</p>
              </div>
              <div className="rounded-xl bg-orange-200/80 p-3 text-center">
                <p className="text-2xl font-semibold">{pct(a.matrix.conception)} %</p>
                <p className="text-xs text-ink-soft">{CRI_LABELS.conception}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted">Pourcentage de l’ensemble des réponses données.</p>
          </Card>
        </div>

        <Card title="Par question" subtitle="Répartition des réponses ; la bonne réponse est en vert.">
          <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
            {a.byQuestion.map((bq) => {
              const q = QUESTIONS.find((x) => x.id === bq.id)!;
              const n = a.respondents || 1;
              return (
                <div key={bq.id} className="glass-inset p-3">
                  <p className="text-sm font-semibold text-ink">
                    {bq.id} · <RichText text={q.prompt} />
                  </p>
                  <ul className="mt-2 space-y-1">
                    {KEYS.map((k) => (
                      <li key={k} className="grid grid-cols-[1.2rem_minmax(0,1fr)_2.6rem] items-center gap-2 text-xs">
                        <b className={k === bq.correct ? 'text-ok-700' : 'text-ink-soft'}>{k}</b>
                        <div className="h-3.5 overflow-hidden rounded bg-ink/6" title={q.options[k].text}>
                          <div className="bar-fill h-full rounded" style={{ width: `${(bq.counts[k] / n) * 100}%`, background: k === bq.correct ? '#1fa971' : q.options[k].codes.length ? '#f6c08e' : '#cbd5e1' }} />
                        </div>
                        <span className="text-right tabular-nums">{Math.round((bq.counts[k] / n) * 100)} %</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-xs text-muted">
                    Certitude moyenne : {bq.meanCertainty === null ? '—' : bq.meanCertainty.toFixed(1).replace('.', ',')} / 3 · sans réponse : {bq.counts.none}
                  </p>
                </div>
              );
            })}
          </div>
          <Legend items={[{ label: 'Bonne réponse', color: '#1fa971' }, { label: 'Distracteur codé', color: '#f6c08e' }, { label: 'Autre', color: '#cbd5e1' }]} />
        </Card>

        <Card title="Explications écrites" subtitle="Questions Q1, Q5, Q9, Q11 : tague une explication par code d’erreur.">
          <Tabs className="mb-3" value={qFilter} onChange={setQFilter} items={[{ id: 'all', label: 'Toutes' }, ...EXPLAIN_QUESTIONS.map((id) => ({ id, label: id }))]} />
          <ul className="space-y-2">
            {responses
              .filter((r) => r.submittedAt)
              .flatMap((r) => EXPLAIN_QUESTIONS.filter((qid) => (qFilter === 'all' || qid === qFilter) && r.answers[qid]?.explanation?.trim()).map((qid) => ({ r, qid })))
              .map(({ r, qid }) => {
                const ans = r.answers[qid];
                const q = QUESTIONS.find((x) => x.id === qid)!;
                const right = ans.choice === q.correct;
                return (
                  <li key={`${r.id}-${qid}`} className="grid gap-2 rounded-xl bg-white/60 p-3 text-sm sm:grid-cols-[minmax(0,1fr)_10rem]">
                    <div>
                      <p className="text-xs text-muted">
                        {byId.get(r.studentId)?.anonCode} · {qid} · réponse {ans.choice ?? '—'} {right ? '(juste)' : '(fausse)'} · certitude {ans.certainty ?? '—'}
                      </p>
                      <p className="text-ink">« {ans.explanation} »</p>
                    </div>
                    <select className="field py-1.5 text-sm" value={ans.teacherTag ?? ''} onChange={(e) => void setTag(r.id, qid, (e.target.value || null) as ErrorCode | null)} aria-label="Code d'erreur">
                      <option value="">Sans code</option>
                      {ERROR_CODES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </li>
                );
              })}
          </ul>
          {!responses.some((r) => r.submittedAt && EXPLAIN_QUESTIONS.some((qid) => r.answers[qid]?.explanation?.trim())) && <Notice tone="info">Aucune explication écrite.</Notice>}
        </Card>
      </div>
    </TeacherPage>
  );
}
