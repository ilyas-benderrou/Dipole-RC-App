import type { Group, TestId } from '../engine/types';
import { LocalStorageRepository } from './localStorageRepository';
import type {
  Alert,
  Attempt,
  ClassRoom,
  MissionRun,
  QuestionnaireResponse,
  QuestionnaireWindow,
  Settings,
  Student,
  TeacherMessage,
  TestCopy,
  VideoView,
} from './types';

/**
 * Couche d'accès aux données (abstraite).
 * V1 : localStorage + données de démonstration (aucune configuration).
 * V2 : Firebase (Auth + Firestore) — il suffira d'écrire une autre implémentation de cette interface
 * et de la renvoyer dans `createRepository()`.
 */
export interface Repository {
  init(): Promise<void>;
  /** Recharge les données de démonstration (efface tout). */
  resetDemo(): Promise<void>;
  /** Efface les apprenants fictifs et tout ce qui les concerne (garde les vraies données). */
  clearDemo(): Promise<void>;
  hasDemoData(): Promise<boolean>;

  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;
  checkTeacherPin(pin: string): Promise<boolean>;

  listClasses(): Promise<ClassRoom[]>;
  addClass(room: ClassRoom): Promise<void>;

  /** Connexion apprenant : prénom + nom + code de classe (crée l'apprenant à la première connexion). */
  findOrCreateStudent(firstName: string, lastName: string, classCode: string): Promise<Student>;
  /** Création par le professeur (groupe témoin notamment). */
  createStudent(firstName: string, lastName: string, classCode: string, group: Group): Promise<Student>;
  getStudent(id: string): Promise<Student | null>;
  listStudents(filter?: { classCode?: string; group?: Group }): Promise<Student[]>;
  saveStudent(student: Student): Promise<void>;
  /** Réinitialise la progression (le modèle) ; l'historique est conservé pour l'expérimentation. */
  resetStudentProgress(id: string): Promise<void>;

  addAttempt(attempt: Attempt): Promise<void>;
  listAttempts(filter?: { studentId?: string }): Promise<Attempt[]>;

  addAlert(alert: Alert): Promise<void>;
  listAlerts(filter?: { studentId?: string; activeOnly?: boolean }): Promise<Alert[]>;
  resolveAlerts(studentId: string): Promise<void>;

  addMessage(message: TeacherMessage): Promise<void>;
  listMessages(studentId: string): Promise<TeacherMessage[]>;
  markMessagesRead(studentId: string): Promise<void>;

  addVideoView(view: VideoView): Promise<void>;
  listVideoViews(filter?: { studentId?: string }): Promise<VideoView[]>;

  addMissionRun(run: MissionRun): Promise<void>;
  listMissionRuns(filter?: { studentId?: string }): Promise<MissionRun[]>;

  listQuestionnaireWindows(): Promise<QuestionnaireWindow[]>;
  getQuestionnaireWindow(classCode: string): Promise<QuestionnaireWindow>;
  saveQuestionnaireWindow(window: QuestionnaireWindow): Promise<void>;
  /** Passation en cours ou terminée (non archivée) d'un apprenant. */
  getQuestionnaireResponse(studentId: string): Promise<QuestionnaireResponse | null>;
  listQuestionnaireResponses(filter?: { includeArchived?: boolean }): Promise<QuestionnaireResponse[]>;
  saveQuestionnaireResponse(response: QuestionnaireResponse): Promise<void>;
  /** Autorise une reprise : la passation actuelle est archivée. */
  allowQuestionnaireRetake(studentId: string): Promise<void>;

  listTestCopies(filter?: { test?: TestId; studentId?: string }): Promise<TestCopy[]>;
  getTestCopy(studentId: string, test: TestId): Promise<TestCopy | null>;
  saveTestCopy(copy: TestCopy): Promise<void>;
  deleteTestCopy(id: string): Promise<void>;
}

export function createRepository(): Repository {
  return new LocalStorageRepository();
}

/** Instance unique utilisée par l'application. */
export const repo: Repository = createRepository();

export { newId, RepositoryError } from './ids';
