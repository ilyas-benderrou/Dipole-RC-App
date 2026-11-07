import { BarChart3, ClipboardList, FileText, FlaskConical, Home, Lock, PencilRuler, PlayCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';
import { AppShell, type NavItem, type SearchEntry, type ShellNotification } from '../components/AppShell';
import { Illustration } from '../components/Illustration';
import { Card, Spinner } from '../components/ui';
import { GROUP_LABELS } from '../content/competences';
import { MISSIONS } from '../content/missions';
import { LESSON_INFO } from '../content/videos';
import { exercisesOpen, type LearnerModel } from '../engine/adaptive';
import { LESSON_IDS, MISSION_IDS } from '../engine/types';
import { repo } from '../data/repository';
import type { QuestionnaireResponse, QuestionnaireWindow, Student, TeacherMessage } from '../data/types';
import { useAuth } from './auth';
import { useCurrentStudent } from './hooks';
import { TutorProvider } from './tutor';

interface StudentContextValue {
  student: Student;
  reload: () => Promise<Student | null>;
  save: (s: Student) => Promise<Student>;
  updateModel: (fn: (m: LearnerModel) => LearnerModel) => Promise<Student | null>;
  session: { studentId: string; sessionId: string; startedAt: string };
  questionnaire: { window: QuestionnaireWindow | null; response: QuestionnaireResponse | null; pending: boolean; submitted: boolean; reload: () => Promise<void> };
  messages: TeacherMessage[];
  /** Parcours complet accessible (groupe expérimental, ou témoin ouvert par le professeur). */
  fullAccess: boolean;
}

const StudentContext = createContext<StudentContextValue | null>(null);

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error('useStudent hors de StudentLayout');
  return ctx;
}

/** Espace apprenant : charge l'apprenant, le questionnaire et les messages ; fournit le tuteur Capi. */
export function StudentLayout() {
  const { student, loading, reload, save, updateModel, session } = useCurrentStudent();
  const { logout } = useAuth();
  const [qState, setQState] = useState<{ window: QuestionnaireWindow | null; response: QuestionnaireResponse | null }>({ window: null, response: null });
  const [messages, setMessages] = useState<TeacherMessage[]>([]);
  const [qLoaded, setQLoaded] = useState(false);

  const reloadQuestionnaire = useCallback(async () => {
    if (!session) return;
    const s = await repo.getStudent(session.studentId);
    if (!s) return;
    const [window, response, msgs] = await Promise.all([repo.getQuestionnaireWindow(s.classCode), repo.getQuestionnaireResponse(s.id), repo.listMessages(s.id)]);
    setQState({ window, response });
    setMessages(msgs);
    setQLoaded(true);
  }, [session]);

  useEffect(() => {
    void reloadQuestionnaire();
  }, [reloadQuestionnaire]);

  if (!session) return <Navigate to="/" replace />;
  if (loading || !qLoaded) return <Spinner />;
  if (!student) {
    logout();
    return <Navigate to="/" replace />;
  }

  const submitted = !!qState.response?.submittedAt;
  const pending = !!qState.window?.open && !submitted;
  const fullAccess = student.group === 'experimental' || (student.group === 'temoin' && student.accessOpened);

  const value: StudentContextValue = {
    student,
    reload,
    save,
    updateModel,
    session,
    questionnaire: { ...qState, pending, submitted, reload: reloadQuestionnaire },
    messages,
    fullAccess,
  };

  return (
    <StudentContext.Provider value={value}>
      <TutorProvider firstName={student.firstName}>
        <Outlet />
      </TutorProvider>
    </StudentContext.Provider>
  );
}

function greetingFor(firstName: string) {
  return (
    <>
      Bonjour, {firstName} <span aria-hidden="true">👋</span>
    </>
  );
}

/**
 * Page de l'espace apprenant (barre latérale, en-tête, verrouillages).
 * `requires` : 'full' = parcours complet ; 'none' = toujours accessible (accueil, questionnaire, cours).
 */
export function StudentPage({ title, children, requires = 'full', allowDuringQuestionnaire = false }: { title: string; children: ReactNode; requires?: 'full' | 'none'; allowDuringQuestionnaire?: boolean }) {
  const { student, questionnaire, messages, fullAccess } = useStudent();
  const location = useLocation();
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const m = student.model;
  const lockedJourney = !fullAccess || questionnaire.pending;

  const nav: NavItem[] = [
    { to: '/apprenant', label: 'Accueil', icon: <Home />, end: true },
    { to: '/apprenant/cours', label: 'Cours PDF', icon: <FileText />, locked: !fullAccess },
    { to: '/apprenant/lecons', label: 'Leçons', icon: <PlayCircle />, locked: lockedJourney },
    { to: '/apprenant/labo', label: 'Laboratoire', icon: <FlaskConical />, locked: lockedJourney },
    { to: '/apprenant/exercices', label: 'Exercices', icon: <PencilRuler />, locked: lockedJourney || !exercisesOpen(m) },
    { to: '/apprenant/questionnaire', label: 'Questionnaire', icon: <ClipboardList />, badge: questionnaire.pending },
    { to: '/apprenant/bilan', label: 'Bilan', icon: <BarChart3 />, locked: !fullAccess },
  ];
  const mobileNav: NavItem[] = questionnaire.pending
    ? [nav[0], nav[5], nav[1], nav[6]]
    : [nav[0], { ...nav[2], label: 'Leçons' }, { ...nav[3], label: 'Labo' }, nav[4], nav[6]];

  const search: SearchEntry[] = useMemo(
    () => [
      { label: 'Accueil', to: '/apprenant' },
      { label: 'Vidéo d’introduction', hint: 'V0', to: '/apprenant/introduction', keywords: 'charge décharge' },
      ...LESSON_IDS.map((l) => ({ label: `${l} · ${LESSON_INFO[l].title}`, hint: 'Leçon', to: `/apprenant/lecons/${l}`, keywords: LESSON_INFO[l].summary })),
      { label: 'Laboratoire', hint: 'Simulation', to: '/apprenant/labo', keywords: 'simulation tau courbe' },
      ...MISSION_IDS.map((id) => ({ label: `Mission ${id} · ${MISSIONS[id].title}`, hint: 'Labo', to: `/apprenant/labo?mission=${id}`, keywords: MISSIONS[id].consigne })),
      { label: 'Exercices', to: '/apprenant/exercices', keywords: 'facile moyen difficile' },
      { label: 'Cours PDF', to: '/apprenant/cours', keywords: 'formules' },
      { label: 'Questionnaire', to: '/apprenant/questionnaire' },
      { label: 'Bilan', to: '/apprenant/bilan', keywords: 'compétences progression' },
    ],
    [],
  );

  const notifications: ShellNotification[] = [
    ...(questionnaire.pending ? [{ id: 'q', text: 'Questionnaire diagnostique à faire', to: '/apprenant/questionnaire', unread: true }] : []),
    ...[...messages]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((msg) => ({ id: msg.id, text: `Message de ton professeur : ${msg.text}`, at: msg.createdAt, unread: !msg.read && !readIds.has(msg.id) })),
  ];

  const blocked =
    (requires === 'full' && !fullAccess) || (questionnaire.pending && !allowDuringQuestionnaire && location.pathname !== '/apprenant');

  return (
    <AppShell
      title={title}
      greeting={greetingFor(student.firstName)}
      nav={nav}
      mobileNav={mobileNav}
      user={{ name: `${student.firstName} ${student.lastName}`, sub: `${student.classCode} · ${GROUP_LABELS[student.group]}`, initials: `${student.firstName[0] ?? ''}${student.lastName[0] ?? ''}`.toUpperCase() }}
      notifications={notifications}
      onNotificationsOpen={() => {
        if (messages.some((x) => !x.read)) {
          void repo.markMessagesRead(student.id);
          setReadIds(new Set(messages.map((x) => x.id)));
        }
      }}
      search={fullAccess && !questionnaire.pending ? search : []}
      demo={!!student.demo}
    >
      {blocked ? <BlockedNotice reason={questionnaire.pending ? 'questionnaire' : student.group === 'diagnostic' ? 'diagnostic' : 'temoin'} /> : children}
    </AppShell>
  );
}

export function BlockedNotice({ reason }: { reason: 'questionnaire' | 'diagnostic' | 'temoin' }) {
  const text = {
    questionnaire: 'Ton professeur a ouvert le questionnaire diagnostique. Le parcours est verrouillé jusqu’à l’envoi de tes réponses.',
    diagnostic: 'Ton groupe participe seulement au questionnaire diagnostique. Merci pour ta participation !',
    temoin: 'Ton parcours sera ouvert par ton professeur après le post-test. Merci de ta patience !',
  }[reason];
  return (
    <Card className="mx-auto max-w-xl text-center">
      <div className="flex flex-col items-center gap-3 py-4">
        <Illustration name="empty-lab" className="h-32 w-auto" />
        <p className="flex items-center gap-2 text-ink-soft">
          <Lock size={16} className="shrink-0" /> {text}
        </p>
        {reason === 'questionnaire' && (
          <a href="#/apprenant/questionnaire" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700">
            Aller au questionnaire
          </a>
        )}
      </div>
    </Card>
  );
}
