import { BookMarked, ClipboardCheck, ClipboardList, FlaskConical, LayoutDashboard, Printer, Settings, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { AppShell, type NavItem, type SearchEntry, type ShellNotification } from '../components/AppShell';
import { Spinner } from '../components/ui';
import { ERRORS } from '../content/errors';
import { repo } from '../data/repository';
import type { Alert, Attempt, ClassRoom, MissionRun, QuestionnaireResponse, QuestionnaireWindow, Settings as AppSettings, Student, TeacherMessage, TestCopy, VideoView } from '../data/types';

export interface TeacherData {
  students: Student[];
  classes: ClassRoom[];
  attempts: Attempt[];
  alerts: Alert[];
  views: VideoView[];
  missions: MissionRun[];
  responses: QuestionnaireResponse[];
  allResponses: QuestionnaireResponse[];
  windows: QuestionnaireWindow[];
  copies: TestCopy[];
  messages: TeacherMessage[];
  settings: AppSettings;
  demo: boolean;
}

/** Toutes les données du tableau de bord (rechargées à la demande). */
export function useTeacherData() {
  const [data, setData] = useState<TeacherData | null>(null);
  const reload = useCallback(async () => {
    const [students, classes, attempts, alerts, views, missions, responses, allResponses, windows, copies, settings, demo] = await Promise.all([
      repo.listStudents(),
      repo.listClasses(),
      repo.listAttempts(),
      repo.listAlerts(),
      repo.listVideoViews(),
      repo.listMissionRuns(),
      repo.listQuestionnaireResponses(),
      repo.listQuestionnaireResponses({ includeArchived: true }),
      repo.listQuestionnaireWindows(),
      repo.listTestCopies(),
      repo.getSettings(),
      repo.hasDemoData(),
    ]);
    const messages = (await Promise.all(students.map((s) => repo.listMessages(s.id)))).flat();
    setData({ students, classes, attempts, alerts, views, missions, responses, allResponses, windows, copies, messages, settings, demo });
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { data, reload };
}

const NAV: NavItem[] = [
  { to: '/prof', label: 'Vue classe', icon: <LayoutDashboard />, end: true },
  { to: '/prof/erreurs', label: 'Erreurs fréquentes', icon: <TriangleAlert /> },
  { to: '/prof/questionnaire', label: 'Questionnaire', icon: <ClipboardList /> },
  { to: '/prof/experimentation', label: 'Expérimentation', icon: <FlaskConical /> },
  { to: '/prof/copies', label: 'Saisir les copies', icon: <ClipboardCheck /> },
  { to: '/prof/tests', label: 'Tests imprimables', icon: <Printer /> },
  { to: '/prof/references', label: 'Références', icon: <BookMarked /> },
  { to: '/prof/reglages', label: 'Réglages', icon: <Settings /> },
];

const SEARCH: SearchEntry[] = [
  { label: 'Vue classe', to: '/prof', keywords: 'apprenants alertes' },
  { label: 'Erreurs fréquentes', to: '/prof/erreurs', keywords: 'E1 E2 E3 E4 E5 E6' },
  { label: 'Analyse du questionnaire', to: '/prof/questionnaire', keywords: 'CRI certitude ouvrir fermer' },
  { label: 'Analyse de l’expérimentation', to: '/prof/experimentation', keywords: 'Welch Cohen gain pré post' },
  { label: 'Saisir les copies', to: '/prof/copies', keywords: 'pré-test post-test import CSV' },
  { label: 'Tests imprimables', to: '/prof/tests', keywords: 'A4 corrigé barème' },
  { label: 'Références', to: '/prof/references' },
  { label: 'Réglages', to: '/prof/reglages', keywords: 'PIN classe démo export' },
];

/** Page du tableau de bord professeur (même style que l'espace apprenant). */
export function TeacherPage({ title, data, children, wideTitle }: { title: string; data: TeacherData | null; children: ReactNode; wideTitle?: ReactNode }) {
  const notifications: ShellNotification[] = data
    ? [
        ...data.alerts
          .filter((a) => !a.resolved)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .map((a) => {
            const s = data.students.find((x) => x.id === a.studentId);
            return { id: a.id, text: `${s ? s.firstName : 'Apprenant'} bloqué sur ${a.code} (${ERRORS[a.code].name}) – ${a.count} échecs`, at: a.createdAt, to: `/prof/apprenant/${a.studentId}`, unread: true };
          }),
        ...(data.copies.some((c) => c.pendingManual) ? [{ id: 'copies', text: `${data.copies.filter((c) => c.pendingManual).length} copie(s) « À corriger »`, to: '/prof/copies' }] : []),
      ]
    : [];
  return (
    <AppShell
      title={wideTitle ?? title}
      greeting={
        <>
          Bonjour, Professeur <span aria-hidden="true">👋</span>
        </>
      }
      nav={NAV}
      mobileNav={[NAV[0], { ...NAV[1], label: 'Erreurs' }, { ...NAV[2], label: 'Questionnaire' }, { ...NAV[3], label: 'Expé' }, { ...NAV[4], label: 'Copies' }]}
      user={{ name: 'Professeur', sub: 'Tableau de bord', initials: 'P' }}
      notifications={notifications}
      search={SEARCH}
      demo={data?.demo}
    >
      {data ? children : <Spinner />}
    </AppShell>
  );
}
