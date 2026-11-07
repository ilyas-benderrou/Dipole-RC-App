import { CheckCircle2, FileUp, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { TeacherPage, useTeacherData } from '../../app/teacher';
import { RichText, Tex } from '../../components/Tex';
import { Badge, Button, Card, Notice, Tabs } from '../../components/ui';
import { GROUP_LABELS } from '../../content/competences';
import { TESTS, TEST_LABELS } from '../../content/tests';
import { ERROR_CODES, type ErrorCode, type TestId } from '../../engine/types';
import { applyRaw, copyScore, emptyCopy, gradeItem, parseCopiesCsv } from '../../data/instruments';
import { newId, repo } from '../../data/repository';
import type { TestCopy } from '../../data/types';

/** Saisie rapide des copies papier (section 13.2), import CSV et compteur par groupe. */
export function CopiesPage() {
  const { data, reload } = useTeacherData();
  const [params] = useSearchParams();
  const [test, setTest] = useState<TestId>('pre');
  const [studentId, setStudentId] = useState<string>(params.get('apprenant') ?? '');
  const [copy, setCopy] = useState<TestCopy | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<{ ok: string; errors: string[] } | null>(null);

  const learners = useMemo(() => (data ? data.students.filter((s) => s.group === 'experimental' || s.group === 'temoin').sort((a, b) => a.group.localeCompare(b.group) || a.lastName.localeCompare(b.lastName, 'fr')) : []), [data]);

  useEffect(() => {
    if (!data || !studentId) return setCopy(null);
    const existing = data.copies.find((c) => c.studentId === studentId && c.test === test);
    setCopy(existing ? structuredClone(existing) : emptyCopy(studentId, test, newId('cop')));
    setSaved(null);
  }, [data, studentId, test]);

  if (!data) return <TeacherPage title="Saisir les copies" data={null}>{null}</TeacherPage>;
  const def = TESTS[test];
  const has = (sid: string) => data.copies.find((c) => c.studentId === sid && c.test === test);
  const counter = (['experimental', 'temoin'] as const).map((g) => {
    const list = data.students.filter((s) => s.group === g);
    const entered = list.filter((s) => has(s.id)).length;
    return { g, total: list.length, entered, pending: list.filter((s) => has(s.id)?.pendingManual).length };
  });

  const setItem = (id: string, patch: Partial<TestCopy['items'][string]>) => setCopy((c) => (c ? { ...c, items: { ...c.items, [id]: { ...c.items[id], ...patch } } } : c));

  const save = async (markCorrected?: boolean) => {
    if (!copy) return;
    const next = { ...copy, pendingManual: markCorrected ? false : copy.pendingManual, updatedAt: new Date().toISOString() };
    await repo.saveTestCopy(next);
    setSaved(markCorrected ? 'Copie enregistrée et marquée comme corrigée.' : 'Copie enregistrée.');
    await reload();
  };

  return (
    <TeacherPage title="Saisir les copies" data={data}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          {counter.map((c) => (
            <div key={c.g} className="glass flex items-center justify-between gap-3 p-4">
              <div>
                <p className="label-caps">Groupe {GROUP_LABELS[c.g].toLowerCase()} · {TEST_LABELS[test]}</p>
                <p className="text-2xl font-semibold text-ink">
                  {c.entered} <span className="text-base font-medium text-ink-soft">saisies / {c.total}</span>
                </p>
              </div>
              <div className="text-right text-sm">
                <p className="text-ink-soft">{c.total - c.entered} manquantes</p>
                {c.pending > 0 && <Badge tone="warn">{c.pending} à corriger</Badge>}
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <Card
            title="Copie"
            action={<Tabs value={test} onChange={setTest} items={[{ id: 'pre', label: 'Pré-test' }, { id: 'post', label: 'Post-test' }]} />}
          >
            <label className="mb-4 block">
              <span className="mb-1 block text-sm font-semibold text-ink-soft">Apprenant</span>
              <select className="field" value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">— Choisir —</option>
                {learners.map((s) => {
                  const c = has(s.id);
                  return (
                    <option key={s.id} value={s.id}>
                      {s.anonCode} · {s.firstName} {s.lastName} · {GROUP_LABELS[s.group]} {c ? (c.pendingManual ? '· à corriger' : '· saisie ✓') : ''}
                    </option>
                  );
                })}
              </select>
            </label>

            {copy && (
              <>
                <div className="thin-scroll overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="label-caps text-left">
                        <th className="py-2 font-semibold">Q.</th>
                        <th className="font-semibold">Élément attendu</th>
                        <th className="font-semibold">Réponse sur la copie</th>
                        <th className="font-semibold">Points</th>
                        <th className="font-semibold">Code</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/70">
                      {def.items.map((it) => {
                        const ci = copy.items[it.id];
                        const g = it.kind !== 'criterion' && ci.raw ? gradeItem(it, ci.raw) : null;
                        return (
                          <tr key={it.id} className="align-top">
                            <td className="py-2 pr-2 font-bold text-ink">{it.id}</td>
                            <td className="py-2 pr-2">
                              <span className="font-medium text-ink">{it.label}</span>
                              <span className="block text-xs text-muted">
                                attendu : <RichText text={it.expected} />
                              </span>
                            </td>
                            <td className="py-2 pr-2">
                              {it.kind === 'num' && (
                                <input className="field py-1.5" value={ci.raw} placeholder="ex. 56,4 µC" onChange={(e) => setCopy((c) => (c ? applyRaw(c, it.id, e.target.value) : c))} aria-label={`Réponse ${it.id}`} />
                              )}
                              {it.kind === 'choice' && (
                                <select className="field py-1.5" value={ci.raw} onChange={(e) => setCopy((c) => (c ? applyRaw(c, it.id, e.target.value) : c))} aria-label={`Choix ${it.id}`}>
                                  <option value="">—</option>
                                  {it.options!.map((o) => (
                                    <option key={o.key} value={o.key}>
                                      {o.key}) {o.tex ? o.text.replace(/\\dfrac\{E\}\{R\}/g, 'E/R').replace(/\\,|\\left|\\right/g, '').replace(/e\^\{-t\/\\tau\}/g, 'e^(−t/τ)') : o.text}
                                    </option>
                                  ))}
                                </select>
                              )}
                              {it.kind === 'criterion' && (
                                <label className="flex items-center gap-2 py-1.5 text-ink-soft">
                                  <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={ci.points >= it.points} onChange={(e) => setItem(it.id, { points: e.target.checked ? it.points : 0, raw: e.target.checked ? 'ok' : '' })} />
                                  critère présent ({it.points} pt{it.points > 1 ? 's' : ''})
                                </label>
                              )}
                              {g?.note && <span className="text-xs text-warn-700">{g.note}</span>}
                            </td>
                            <td className="py-2 pr-2">
                              <input
                                type="number"
                                min={0}
                                max={it.points}
                                step={0.5}
                                className="field w-20 py-1.5 tabular-nums"
                                value={ci.points}
                                onChange={(e) => setItem(it.id, { points: Math.max(0, Math.min(it.points, Number(e.target.value) || 0)) })}
                                aria-label={`Points ${it.id}`}
                              />
                              <span className="ml-1 text-xs text-muted">/ {it.points}</span>
                            </td>
                            <td className="py-2">
                              <select
                                className={`field w-24 py-1.5 ${ci.code && ci.codeAuto ? 'ring-2 ring-amber-200' : ''}`}
                                value={ci.code ?? ''}
                                onChange={(e) => setItem(it.id, { code: (e.target.value || null) as ErrorCode | null, codeAuto: false })}
                                aria-label={`Code ${it.id}`}
                                title={ci.codeAuto && ci.code ? 'Proposé automatiquement' : it.usualCode ? `Code habituel : ${it.usualCode}` : undefined}
                              >
                                <option value="">—</option>
                                {ERROR_CODES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <p className="mr-auto text-lg font-semibold text-ink">
                    Total : {copyScore(copy)} / 20 {copy.pendingManual ? <Badge tone="warn">À corriger</Badge> : <Badge tone="ok">corrigée</Badge>}
                  </p>
                  <Button variant="secondary" onClick={() => void save(false)}>
                    <Save size={16} /> Enregistrer
                  </Button>
                  <Button onClick={() => void save(true)}>
                    <CheckCircle2 size={16} /> Enregistrer et marquer comme corrigée
                  </Button>
                  {data.copies.some((c) => c.id === copy.id) && (
                    <Button variant="ghost" onClick={async () => (await repo.deleteTestCopy(copy.id), await reload(), setSaved('Copie supprimée.'))}>
                      <Trash2 size={16} /> Supprimer
                    </Button>
                  )}
                </div>
                {saved && <Notice tone="ok" className="mt-3">{saved}</Notice>}
                <p className="mt-3 text-xs text-muted">
                  Réponses numériques et choix corrigés automatiquement (tolérance 2 %, unité vérifiée) ; le code d’erreur est proposé quand la réponse correspond à un distracteur (surligné), modifiable à la main. Questions 2.1 et 2.2 : cocher les critères.
                </p>
              </>
            )}
          </Card>

          <div className="space-y-5">
            <Card title="Import CSV" subtitle="Colonnes : code apprenant ; test ; question ; réponse ; points ; code d’erreur.">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-teal-200 bg-white/50 px-4 py-6 text-sm font-semibold text-teal-700 hover:bg-white/80">
                <FileUp size={18} /> Choisir un fichier .csv
                <input
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="sr-only"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const text = await file.text();
                    const res = parseCopiesCsv(text, data.students, data.copies, () => newId('cop'));
                    for (const c of res.copies) await repo.saveTestCopy(c);
                    setImportMsg({ ok: `${res.imported} ligne(s) importée(s), ${res.copies.length} copie(s) mise(s) à jour.`, errors: res.errors });
                    e.target.value = '';
                    await reload();
                  }}
                />
              </label>
              {importMsg && (
                <div className="mt-3 space-y-2">
                  <Notice tone="ok">{importMsg.ok}</Notice>
                  {importMsg.errors.length > 0 && (
                    <Notice tone="warn" title={`${importMsg.errors.length} ligne(s) ignorée(s)`}>
                      <ul className="list-disc pl-4">
                        {importMsg.errors.slice(0, 8).map((er) => (
                          <li key={er}>{er}</li>
                        ))}
                      </ul>
                    </Notice>
                  )}
                </div>
              )}
              <p className="mt-3 text-xs text-muted">
                Questions : {def.items.map((i) => i.id).join(', ')}. Test : « pré » ou « post ». Exemple : <code>A-07;pré;1.1;56,4 µC;;</code>
              </p>
            </Card>
            <Card title="Rappel du barème">
              <ul className="space-y-1.5 text-xs">
                {def.questions.map((q) => (
                  <li key={q.id}>
                    <b className="text-ink">{q.id}</b> <span className="text-ink-soft">({q.bareme} pt)</span> · <RichText text={q.expected} />
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                <Tex math="\text{Total} = 20" />
              </p>
            </Card>
          </div>
        </div>
      </div>
    </TeacherPage>
  );
}
