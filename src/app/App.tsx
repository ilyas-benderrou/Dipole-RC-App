import { useEffect, useState, type ReactNode } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { repo } from '../data/repository';
import { LoginPage } from '../pages/LoginPage';
import { BilanPage } from '../pages/student/BilanPage';
import { CoursPage } from '../pages/student/CoursPage';
import { ExercisePage } from '../pages/student/ExercisePage';
import { IntroPage } from '../pages/student/IntroPage';
import { LabPage } from '../pages/student/LabPage';
import { LessonPage } from '../pages/student/LessonPage';
import { LessonsPage } from '../pages/student/LessonsPage';
import { QuestionnairePage } from '../pages/student/QuestionnairePage';
import { StudentHome } from '../pages/student/StudentHome';
import { CopiesPage } from '../pages/teacher/CopiesPage';
import { ErrorsPage } from '../pages/teacher/ErrorsPage';
import { ExperimentPage } from '../pages/teacher/ExperimentPage';
import { QuestionnaireAnalysisPage } from '../pages/teacher/QuestionnaireAnalysisPage';
import { ReferencesPage } from '../pages/teacher/ReferencesPage';
import { SettingsPage } from '../pages/teacher/SettingsPage';
import { TeacherDashboard } from '../pages/teacher/TeacherDashboard';
import { TeacherStudentPage } from '../pages/teacher/TeacherStudentPage';
import { PrintTestPage, TestsPage } from '../pages/teacher/TestsPages';
import { AuthProvider, useAuth } from './auth';
import { StudentLayout } from './student';

function RequireRole({ role, children }: { role: 'student' | 'teacher'; children: ReactNode }) {
  const { session } = useAuth();
  if (!session || session.role !== role) return <Navigate to="/" replace />;
  return <>{children}</>;
}

const teacher = (el: ReactNode) => <RequireRole role="teacher">{el}</RequireRole>;

export function App() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    void repo.init().then(() => setReady(true));
  }, []);
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-muted" role="status">
        Chargement…
      </div>
    );
  }
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route
            path="/apprenant"
            element={
              <RequireRole role="student">
                <StudentLayout />
              </RequireRole>
            }
          >
            <Route index element={<StudentHome />} />
            <Route path="cours" element={<CoursPage />} />
            <Route path="introduction" element={<IntroPage />} />
            <Route path="lecons" element={<LessonsPage />} />
            <Route path="lecons/:id" element={<LessonPage />} />
            <Route path="labo" element={<LabPage />} />
            <Route path="exercices" element={<ExercisePage />} />
            <Route path="questionnaire" element={<QuestionnairePage />} />
            <Route path="bilan" element={<BilanPage />} />
          </Route>
          <Route path="/prof" element={teacher(<TeacherDashboard />)} />
          <Route path="/prof/apprenant/:id" element={teacher(<TeacherStudentPage />)} />
          <Route path="/prof/erreurs" element={teacher(<ErrorsPage />)} />
          <Route path="/prof/questionnaire" element={teacher(<QuestionnaireAnalysisPage />)} />
          <Route path="/prof/experimentation" element={teacher(<ExperimentPage />)} />
          <Route path="/prof/copies" element={teacher(<CopiesPage />)} />
          <Route path="/prof/tests" element={teacher(<TestsPage />)} />
          <Route path="/prof/tests/:test" element={teacher(<PrintTestPage />)} />
          <Route path="/prof/tests/:test/corrige" element={teacher(<PrintTestPage corrige />)} />
          <Route path="/prof/references" element={teacher(<ReferencesPage />)} />
          <Route path="/prof/reglages" element={teacher(<SettingsPage />)} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
