import { useCallback, useEffect, useRef, useState } from 'react';
import type { LearnerModel } from '../engine/adaptive';
import { repo } from '../data/repository';
import type { QuestionnaireResponse, QuestionnaireWindow, Student } from '../data/types';
import { useStudentSession } from './auth';

/** Apprenant connecté, rechargé depuis le repository. */
export function useCurrentStudent() {
  const session = useStudentSession();
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!session) return null;
    const s = await repo.getStudent(session.studentId);
    setStudent(s);
    setLoading(false);
    return s;
  }, [session]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (s: Student) => {
    const updated = { ...s, lastActive: new Date().toISOString() };
    await repo.saveStudent(updated);
    setStudent(updated);
    return updated;
  }, []);

  /** Modifie le modèle à partir de la version la plus récente stockée (évite d'écraser une autre mise à jour). */
  const updateModel = useCallback(
    async (fn: (m: LearnerModel) => LearnerModel) => {
      if (!session) return null;
      const fresh = await repo.getStudent(session.studentId);
      if (!fresh) return null;
      return save({ ...fresh, model: fn(fresh.model) });
    },
    [session, save],
  );

  return { student, loading, reload, save, updateModel, session };
}

/** État du questionnaire diagnostique pour l'apprenant : ouvert, en cours, envoyé. */
export function useQuestionnaireState(student: Student | null) {
  const [state, setState] = useState<{ window: QuestionnaireWindow | null; response: QuestionnaireResponse | null; loaded: boolean }>({
    window: null,
    response: null,
    loaded: false,
  });
  const reload = useCallback(async () => {
    if (!student) return;
    const [window, response] = await Promise.all([repo.getQuestionnaireWindow(student.classCode), repo.getQuestionnaireResponse(student.id)]);
    setState({ window, response, loaded: true });
  }, [student]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const submitted = !!state.response?.submittedAt;
  /** Questionnaire à faire : ouvert pour la classe et pas encore envoyé (le parcours est alors verrouillé). */
  const pending = !!state.window?.open && !submitted;
  return { ...state, submitted, pending, reload };
}

/** Compte le temps passé sur une page (appelle onFlush toutes les 15 s et au démontage). */
export function useActiveTime(onFlush: (seconds: number) => void, active = true) {
  const flushRef = useRef(onFlush);
  flushRef.current = onFlush;
  useEffect(() => {
    if (!active) return;
    let last = Date.now();
    const flush = () => {
      const now = Date.now();
      const sec = Math.round((now - last) / 1000);
      last = now;
      if (sec > 0 && document.visibilityState !== 'hidden') flushRef.current(Math.min(sec, 60));
    };
    const id = window.setInterval(flush, 15000);
    return () => {
      window.clearInterval(id);
      flush();
    };
  }, [active]);
}

/** Préférence « réduire les animations ». */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}
