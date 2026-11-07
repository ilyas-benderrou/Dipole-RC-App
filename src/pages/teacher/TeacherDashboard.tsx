import { AlertTriangle, ClipboardCheck, ClipboardList, Download, UserPlus, Users } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { TeacherPage, useTeacherData } from '../../app/teacher';
import { Badge, Button, Card, Field, LevelBadge, Notice, StatCard, Tabs, relativeTime } from '../../components/ui';
import { GROUP_LABELS } from '../../content/competences';
import { ERRORS } from '../../content/errors';
import { masteryBand } from '../../engine/adaptive';
import { COMPETENCES, type Group } from '../../engine/types';
import { RepositoryError, repo } from '../../data/repository';
import { exportAll } from './exports';

const DOT: Record<'low' | 'mid' | 'high', string> = { low: 'bg-warn-500', mid: 'bg-uc', high: 'bg-teal-600' };

/** Vue classe (section 14.1) + alertes (14.7). */
export function TeacherDashboard() {
  const { data, reload } = useTeacherData();
  const navigate = useNavigate();
  const [group, setGroup] = useState<'all' | Group>('all');
  const [classCode, setClassCode] = useState<string>('all');
  const [form, setForm] = useState({ first: '', last: '', classCode: '2BAC-PC-A', group: 'temoin' as Group });
  const [formMsg, setFormMsg] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const rows = useMemo(() => {
    if (!data) return [];
    return data.students
      .filter((s) => (group === 'all' || s.group === group) && (classCode === 'all' || s.classCode === classCode))
      .sort((a, b) => a.classCode.localeCompare(b.classCode) || a.lastName.localeCompare(b.lastName, 'fr'));
  }, [data, group, classCode]);

  if (!data) return <TeacherPage title="Vue classe" data={null}>{null}</TeacherPage>;

  const active = data.alerts.filter((a) => !a.resolved);
  const count = (g: Group) => data.students.filter((s) => s.group === g).length;
  const submitted = new Set(data.responses.filter((r) => r.submittedAt).map((r) => r.studentId));
  const copyOf = (sid: string, test: 'pre' | 'post') => data.copies.find((c) => c.studentId === sid && c.test === test);

  return (
    <TeacherPage title="Vue classe" data={data}>
      <div className="cascade space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          <StatCard label="Apprenants" value={data.students.length} icon={<Users size={18} />} color="teal" hint={`${count('experimental')} exp. · ${count('temoin')} témoin · ${count('diagnostic')} diag.`} />
          <StatCard label="Alertes actives" value={active.length} icon={<AlertTriangle size={18} />} color="orange" />
          <StatCard label="Questionnaires" value={submitted.size} icon={<ClipboardList size={18} />} color="violet" hint="passations envoyées" />
          <StatCard label="Copies saisies" value={data.copies.length} icon={<ClipboardCheck size={18} />} color="rose" hint={`${data.copies.filter((c) => c.pendingManual).length} à corriger`} />
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
            <Card title="Alertes" subtitle="3 échecs sur la même erreur.">
              {active.length === 0 ? (
                <p className="text-sm text-muted">Aucune alerte active.</p>
              ) : (
                <ul className="space-y-2">
                  {active.map((a) => {
                    const s = data.students.find((x) => x.id === a.studentId);
                    return (
                      <li key={a.id} className="rounded-xl bg-amber-50/80 px-3 py-2 text-sm ring-1 ring-amber-200">
                        <p className="font-semibold text-ink">
                          {s?.firstName} bloqué sur {a.code} ({ERRORS[a.code].name}) – {a.count} échecs
                        </p>
                        <p className="text-xs text-muted">{relativeTime(a.createdAt)}</p>
                        <div className="mt-1.5 flex gap-3 text-xs font-semibold">
                          <Link to={`/prof/apprenant/${a.studentId}`} className="text-teal-700 hover:underline">
                            Voir la fiche
                          </Link>
                          <button type="button" className="text-ink-soft hover:underline" onClick={async () => (await repo.resolveAlerts(a.studentId), reload())}>
                            Marquer comme traitée
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>

            <Card title="Ajouter un apprenant" subtitle="Pour le groupe témoin : il n’utilise pas l’application, mais ses copies sont saisies ici.">
              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const s = await repo.createStudent(form.first, form.last, form.classCode, form.group);
                    setFormMsg({ tone: 'ok', text: `${s.firstName} ${s.lastName} ajouté (code ${s.anonCode}).` });
                    setForm({ ...form, first: '', last: '' });
                    await reload();
                  } catch (err) {
                    setFormMsg({ tone: 'warn', text: err instanceof RepositoryError ? err.message : 'Ajout impossible.' });
                  }
                }}
              >
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Prénom">
                    <input className="field" value={form.first} onChange={(e) => setForm({ ...form, first: e.target.value })} required />
                  </Field>
                  <Field label="Nom">
                    <input className="field" value={form.last} onChange={(e) => setForm({ ...form, last: e.target.value })} required />
                  </Field>
                  <Field label="Classe">
                    <select className="field" value={form.classCode} onChange={(e) => setForm({ ...form, classCode: e.target.value })}>
                      {data.classes.map((c) => (
                        <option key={c.code}>{c.code}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Groupe">
                    <select className="field" value={form.group} onChange={(e) => setForm({ ...form, group: e.target.value as Group })}>
                      <option value="temoin">Témoin</option>
                      <option value="experimental">Expérimental</option>
                      <option value="diagnostic">Diagnostic</option>
                    </select>
                  </Field>
                </div>
                {formMsg && <Notice tone={formMsg.tone}>{formMsg.text}</Notice>}
                <Button type="submit">
                  <UserPlus size={16} /> Ajouter
                </Button>
              </form>
            </Card>

            <Card title="Exports" subtitle="Codes anonymes, séparateur « ; », virgule décimale (Excel en français).">
              <Button variant="secondary" onClick={() => exportAll(data)}>
                <Download size={16} /> Tout exporter (4 fichiers CSV)
              </Button>
              <p className="mt-2 text-xs text-muted">
                Exports détaillés et impression dans <Link to="/prof/reglages" className="font-semibold text-teal-700 hover:underline">Réglages</Link>.
              </p>
            </Card>
          </div>
          <Card
            title="Apprenants"
            action={
              <div className="flex flex-wrap items-center gap-2">
                <select className="field w-auto py-1.5 text-sm" value={classCode} onChange={(e) => setClassCode(e.target.value)} aria-label="Classe">
                  <option value="all">Toutes les classes</option>
                  {data.classes.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </div>
            }
          >
            <Tabs
              className="mb-3"
              value={group}
              onChange={setGroup}
              items={[
                { id: 'all', label: `Tous (${data.students.length})` },
                { id: 'experimental', label: `Expérimental (${count('experimental')})` },
                { id: 'temoin', label: `Témoin (${count('temoin')})` },
                { id: 'diagnostic', label: `Diagnostic (${count('diagnostic')})` },
              ]}
            />
            <div className="thin-scroll -mx-2 overflow-x-auto px-2">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="label-caps text-left">
                    <th className="py-2 pr-2 font-semibold">Apprenant</th>
                    <th className="px-2 font-semibold">Groupe</th>
                    <th className="px-2 font-semibold">Niveau</th>
                    <th className="px-2 font-semibold">C1 – C6</th>
                    <th className="px-2 font-semibold">Activité</th>
                    <th className="px-2 font-semibold">Quest.</th>
                    <th className="px-2 font-semibold">Pré</th>
                    <th className="px-2 font-semibold">Post</th>
                    <th className="px-2 font-semibold">Alerte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/70">
                  {rows.map((s) => {
                    const alert = active.find((a) => a.studentId === s.id);
                    const pre = copyOf(s.id, 'pre');
                    const post = copyOf(s.id, 'post');
                    const copyBadge = (c: typeof pre) => (c ? c.pendingManual ? <Badge tone="warn">À corriger</Badge> : <Badge tone="ok">saisi</Badge> : <span className="text-muted">—</span>);
                    return (
                      <tr key={s.id} className="cursor-pointer transition hover:bg-white/50" onClick={() => navigate(`/prof/apprenant/${s.id}`)}>
                        <td className="py-2.5 pr-2">
                          <Link to={`/prof/apprenant/${s.id}`} className="font-semibold text-ink hover:underline" onClick={(e) => e.stopPropagation()}>
                            {s.firstName} {s.lastName}
                          </Link>
                          <span className="block text-xs text-muted">
                            {s.anonCode} · {s.classCode}
                          </span>
                        </td>
                        <td className="px-2">
                          <Badge tone={s.group === 'experimental' ? 'teal' : s.group === 'temoin' ? 'blue' : 'violet'}>{GROUP_LABELS[s.group]}</Badge>
                        </td>
                        <td className="px-2">{s.group === 'experimental' || s.accessOpened ? <LevelBadge level={s.model.level} /> : <span className="text-muted">—</span>}</td>
                        <td className="px-2">
                          <div className="flex gap-1" aria-label="Compétences">
                            {COMPETENCES.map((c) => (
                              <span key={c} title={`${c} : ${s.model.competences[c]} %`} className={`grid h-6 w-6 place-items-center rounded-md text-[9px] font-bold text-white ${DOT[masteryBand(s.model.competences[c])]}`} style={{ opacity: 0.35 + s.model.competences[c] / 160 }}>
                                {c.slice(1)}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-2 text-ink-soft">{relativeTime(s.lastActive)}</td>
                        <td className="px-2">{submitted.has(s.id) ? <Badge tone="ok">✓</Badge> : <span className="text-muted">—</span>}</td>
                        <td className="px-2">{copyBadge(pre)}</td>
                        <td className="px-2">{copyBadge(post)}</td>
                        <td className="px-2">{alert ? <Badge tone="warn">{alert.code}</Badge> : null}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!rows.length && <p className="py-6 text-center text-sm text-muted">Aucun apprenant dans ce filtre.</p>}
            </div>
            <p className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-teal-600" /> maîtrisée (≥ 70 %)</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-uc" /> en cours (40–69 %)</span>
              <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-warn-500" /> à travailler (&lt; 40 %)</span>
            </p>
          </Card>
      </div>
    </TeacherPage>
  );
}
