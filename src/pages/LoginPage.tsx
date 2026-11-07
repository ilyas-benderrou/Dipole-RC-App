import { GraduationCap, KeyRound, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { useAuth } from '../app/auth';
import { APP } from '../config/app';
import { RepositoryError, repo } from '../data/repository';
import type { Student } from '../data/types';
import { Illustration } from '../components/Illustration';
import { Logo } from '../components/Logo';
import { Button, Field, Notice, Tabs } from '../components/ui';
import { GROUP_LABELS } from '../content/competences';

export function LoginPage() {
  const { session, loginStudent, loginTeacher } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'apprenant' | 'prof'>('apprenant');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [classCode, setClassCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<Student[]>([]);

  useEffect(() => {
    void repo.listStudents().then((all) => {
      const pickDemo = all.filter((s) => s.demo && s.group !== 'temoin');
      const exp = pickDemo.filter((s) => s.group === 'experimental').slice(0, 4);
      const diag = pickDemo.filter((s) => s.group === 'diagnostic').slice(0, 1);
      setDemo([...exp, ...diag]);
    });
  }, []);

  if (session?.role === 'student') return <Navigate to="/apprenant" replace />;
  if (session?.role === 'teacher') return <Navigate to="/prof" replace />;

  const submitStudent = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const s = await repo.findOrCreateStudent(first, last, classCode);
      loginStudent(s.id);
      navigate('/apprenant');
    } catch (err) {
      setError(err instanceof RepositoryError ? err.message : 'Connexion impossible.');
    } finally {
      setBusy(false);
    }
  };

  const submitTeacher = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (await repo.checkTeacherPin(pin)) {
      loginTeacher();
      navigate('/prof');
    } else setError('Code PIN incorrect.');
  };

  return (
    <div className="min-h-screen px-4 py-6 sm:py-10">
      <div className="mx-auto grid max-w-6xl items-center gap-6 lg:grid-cols-[1.15fr_1fr] lg:gap-10">
        <section className="page-enter">
          <Logo />
          <h1 className="mt-6 text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
            Le dipôle RC,
            <br />
            <span className="bg-gradient-to-r from-teal-600 to-uc bg-clip-text text-transparent">enfin limpide.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-soft sm:text-lg">
            Vidéos courtes, laboratoire interactif et exercices adaptés à ton rythme pour maîtriser la charge et la décharge d’un condensateur
            (2ème Bac PC et SM).
          </p>
          <div className="relative mt-6 hidden overflow-hidden rounded-[24px] shadow-[0_24px_48px_-24px_rgba(22,50,79,0.35)] sm:block">
            <Illustration name="hero-lab" className="h-64 w-full object-cover" />
          </div>
          <p className="mt-6 text-xs text-muted">{APP.credits}</p>
        </section>

        <section className="glass glass-strong page-enter p-5 sm:p-7" aria-label="Connexion">
          <Tabs
            value={tab}
            onChange={(t) => {
              setTab(t);
              setError(null);
            }}
            items={[
              { id: 'apprenant', label: <span className="inline-flex items-center gap-1.5"><UserRound size={16} /> Apprenant</span> },
              { id: 'prof', label: <span className="inline-flex items-center gap-1.5"><GraduationCap size={16} /> Professeur</span> },
            ]}
          />

          {tab === 'apprenant' ? (
            <form onSubmit={submitStudent} className="mt-5 space-y-3.5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Prénom">
                  <input className="field" value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" required />
                </Field>
                <Field label="Nom">
                  <input className="field" value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" required />
                </Field>
              </div>
              <Field label="Code de classe" hint="Donné par ton professeur, par exemple 2BAC-PC-A.">
                <input className="field uppercase" value={classCode} onChange={(e) => setClassCode(e.target.value)} placeholder="2BAC-PC-A" required />
              </Field>
              {error && <Notice tone="warn">{error}</Notice>}
              <Button type="submit" size="lg" className="w-full" disabled={busy}>
                C’est parti ⚡
              </Button>
              {demo.length > 0 && (
                <div className="rounded-2xl bg-white/55 p-3 ring-1 ring-white/80">
                  <p className="label-caps mb-2 flex items-center gap-1.5">
                    <Sparkles size={13} /> Comptes de démonstration
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {demo.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-teal-800 ring-1 ring-teal-100 hover:bg-teal-50"
                        onClick={() => {
                          setFirst(s.firstName);
                          setLast(s.lastName);
                          setClassCode(s.classCode);
                        }}
                      >
                        {s.firstName} {s.lastName} · {GROUP_LABELS[s.group]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </form>
          ) : (
            <form onSubmit={submitTeacher} className="mt-5 space-y-3.5">
              <Field label="Code PIN" hint={`Démonstration : ${APP.defaultTeacherPin} (modifiable dans les réglages).`}>
                <div className="relative">
                  <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input className="field pl-10 tracking-[0.4em]" type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" required />
                </div>
              </Field>
              {error && <Notice tone="warn">{error}</Notice>}
              <Button type="submit" size="lg" className="w-full">
                Ouvrir le tableau de bord
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
