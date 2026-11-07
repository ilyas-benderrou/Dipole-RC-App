import { Database, Download, KeyRound, Plus, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { TeacherPage, useTeacherData } from '../../app/teacher';
import { Button, Card, Field, Modal, Notice } from '../../components/ui';
import { RepositoryError, repo } from '../../data/repository';
import { EXPORTS, exportAll } from './exports';

/** Réglages : PIN, classes, seuil, données de démonstration, exports (section 14.7 et 18). */
export function SettingsPage() {
  const { data, reload } = useTeacherData();
  const [pin, setPin] = useState('');
  const [room, setRoom] = useState({ code: '', name: '' });
  const [msg, setMsg] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);
  const [confirm, setConfirm] = useState<'clear' | 'reload' | null>(null);
  if (!data) return <TeacherPage title="Réglages" data={null}>{null}</TeacherPage>;
  const done = async (text: string) => {
    await reload();
    setMsg({ tone: 'ok', text });
  };
  return (
    <TeacherPage title="Réglages" data={data}>
      <div className="space-y-5">
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div className="grid gap-5 xl:grid-cols-2">
          <Card title="Exports" subtitle="Codes anonymes ; séparateur « ; » et virgule décimale (Excel en français).">
            <div className="space-y-2">
              {EXPORTS.map((e) => (
                <Button key={e.id} variant="secondary" className="w-full justify-start" onClick={() => e.run(data)}>
                  <Download size={16} /> {e.label}
                </Button>
              ))}
              <Button className="w-full" onClick={() => exportAll(data)}>
                <Download size={16} /> Tout exporter
              </Button>
              <Link to="/prof/experimentation" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <Printer size={16} /> Imprimer la page d’analyse (PDF)
                </Button>
              </Link>
            </div>
          </Card>

          <Card title="Données de démonstration" subtitle="16 apprenants (2BAC-PC-A) et 24 apprenants du groupe diagnostic (2BAC-PC-B), fictifs.">
            <p className="mb-3 text-sm text-ink-soft">{data.demo ? 'Des données fictives sont présentes : un bandeau les signale partout où elles apparaissent.' : 'Aucune donnée fictive.'}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="warn" disabled={!data.demo} onClick={() => setConfirm('clear')}>
                <Trash2 size={16} /> Effacer les données de démo
              </Button>
              <Button variant="secondary" onClick={() => setConfirm('reload')}>
                <Database size={16} /> Recharger la démo (tout effacer)
              </Button>
            </div>
          </Card>

          <Card title="Code PIN du professeur">
            <form
              className="flex flex-wrap items-end gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!/^\d{4,8}$/.test(pin)) return setMsg({ tone: 'warn', text: 'Le PIN doit contenir 4 à 8 chiffres.' });
                await repo.saveSettings({ ...data.settings, teacherPin: pin });
                setPin('');
                await done('Code PIN modifié.');
              }}
            >
              <Field label="Nouveau PIN" className="flex-1">
                <input className="field" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} />
              </Field>
              <Button type="submit">
                <KeyRound size={16} /> Changer
              </Button>
            </form>
          </Card>

          <Card title="Questionnaire : seuil « erreur confirmée »" subtitle="Part minimale d’apprenants ayant choisi l’erreur avec une certitude haute.">
            <div className="flex items-center gap-3">
              <input
                type="range"
                className="range flex-1"
                min={5}
                max={60}
                step={5}
                value={Math.round(data.settings.confirmThreshold * 100)}
                onChange={async (e) => {
                  await repo.saveSettings({ ...data.settings, confirmThreshold: Number(e.target.value) / 100 });
                  await reload();
                }}
              />
              <span className="w-14 text-right font-semibold tabular-nums">{Math.round(data.settings.confirmThreshold * 100)} %</span>
            </div>
          </Card>

          <Card title="Classes">
            <ul className="mb-3 space-y-1 text-sm">
              {data.classes.map((c) => (
                <li key={c.code} className="flex justify-between rounded-xl bg-white/55 px-3 py-1.5">
                  <b>{c.code}</b>
                  <span className="text-ink-soft">{c.name}</span>
                </li>
              ))}
            </ul>
            <form
              className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end"
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  await repo.addClass(room);
                  setRoom({ code: '', name: '' });
                  await done('Classe ajoutée.');
                } catch (err) {
                  setMsg({ tone: 'warn', text: err instanceof RepositoryError ? err.message : 'Ajout impossible.' });
                }
              }}
            >
              <Field label="Code">
                <input className="field uppercase" value={room.code} onChange={(e) => setRoom({ ...room, code: e.target.value })} placeholder="2BAC-SM-A" required />
              </Field>
              <Field label="Nom">
                <input className="field" value={room.name} onChange={(e) => setRoom({ ...room, name: e.target.value })} placeholder="2ème Bac SM – A" />
              </Field>
              <Button type="submit">
                <Plus size={16} /> Ajouter
              </Button>
            </form>
          </Card>
        </div>
      </div>
      <Modal open={confirm !== null} onClose={() => setConfirm(null)} title={confirm === 'clear' ? 'Effacer les données de démo ?' : 'Recharger la démo ?'}>
        <p className="text-sm text-ink-soft">
          {confirm === 'clear' ? 'Tous les apprenants fictifs et leurs données (tentatives, copies, questionnaires…) seront supprimés. Les vraies données sont conservées.' : 'Toute la base (y compris les vraies données) sera remplacée par les données de démonstration.'}
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)}>
            Annuler
          </Button>
          <Button
            variant="warn"
            onClick={async () => {
              const c = confirm;
              setConfirm(null);
              if (c === 'clear') {
                await repo.clearDemo();
                await done('Données de démonstration effacées.');
              } else {
                await repo.resetDemo();
                await done('Données de démonstration rechargées.');
              }
            }}
          >
            Confirmer
          </Button>
        </div>
      </Modal>
    </TeacherPage>
  );
}
