import type { LearnerModel } from '../engine/adaptive';
import type { Competence, ErrorCode, ExSubtype, Group, Level, MissionId, TestId, VideoId } from '../engine/types';

/** Données minimales (apprenants mineurs) : prénom, nom, classe, groupe. Rien d'autre. */
export interface ClassRoom {
  code: string;
  name: string;
}

export interface Student {
  id: string;
  /** Code anonyme (ex. A-07), utilisé dans les analyses et les exports. */
  anonCode: string;
  firstName: string;
  lastName: string;
  classCode: string;
  group: Group;
  /** Créé par le professeur (groupe témoin) ou à la première connexion. */
  createdBy: 'self' | 'teacher';
  /** Groupe témoin : parcours complet ouvert par le professeur après le post-test (équité). */
  accessOpened: boolean;
  createdAt: string;
  lastActive: string | null;
  model: LearnerModel;
  /** Apprenant fictif des données de démonstration. */
  demo?: boolean;
}

/** Une réponse donnée pendant un exercice (chaque question est diagnostiquée séparément). */
export interface StepLog {
  /** Millisecondes depuis le début de l'exercice. */
  t: number;
  questionId: string;
  answer: string;
  ok: boolean;
  code: ErrorCode | null;
  sub?: ExSubtype | null;
}

export type AttemptOutcome = 'success' | 'helped' | 'remediation' | 'alert' | 'abandoned';

export interface Attempt {
  id: string;
  studentId: string;
  sessionId: string;
  templateId: string;
  level: Level;
  seed: number;
  values: Record<string, number | string>;
  remediation: boolean;
  review: boolean;
  steps: StepLog[];
  questionsTotal: number;
  questionsOk: number;
  errors: ErrorCode[];
  success: boolean;
  outcome: AttemptOutcome;
  hintsUsed: number;
  videosWatched: VideoId[];
  missionsUsed: MissionId[];
  startedAt: string;
  endedAt: string;
  durationSec: number;
  competencesAfter: Record<Competence, number>;
  levelAfter: Level;
}

export interface Alert {
  id: string;
  studentId: string;
  code: ErrorCode;
  count: number;
  templateId?: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface TeacherMessage {
  id: string;
  studentId: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface VideoView {
  id: string;
  studentId: string;
  videoId: VideoId;
  at: string;
  /** Parcours normal, micro-vidéo de remédiation, ou revue volontaire. */
  reason: 'parcours' | 'remediation' | 'replay';
  percent: number;
}

export interface MissionRun {
  id: string;
  studentId: string;
  missionId: MissionId;
  context: 'lesson' | 'lab' | 'remediation';
  success: boolean;
  at: string;
  durationSec: number;
}

// ---------------------------------------------------------------------------
// Questionnaire diagnostique (section 11, 13.1)
// ---------------------------------------------------------------------------

export type OptionKey = 'a' | 'b' | 'c' | 'd';
export type Certainty = 0 | 1 | 2 | 3;

export interface QuestionnaireWindow {
  classCode: string;
  open: boolean;
  openedAt: string | null;
  closedAt: string | null;
  /** Date limite facultative (ISO). */
  deadline: string | null;
}

export interface QuestionnaireAnswer {
  choice: OptionKey | null;
  certainty: Certainty | null;
  explanation?: string;
  /** Code d'erreur attribué par le professeur à une explication écrite. */
  teacherTag?: ErrorCode | null;
}

export interface QuestionnaireResponse {
  id: string;
  studentId: string;
  startedAt: string;
  submittedAt: string | null;
  autoSubmitted: boolean;
  /** Ordre des propositions affiché à cet apprenant (le code reste attaché à la proposition). */
  order: Record<string, OptionKey[]>;
  answers: Record<string, QuestionnaireAnswer>;
  /** Le professeur a autorisé une reprise : la passation précédente est archivée. */
  archived?: boolean;
}

// ---------------------------------------------------------------------------
// Pré-test / post-test sur papier, saisis par le professeur (section 12, 13.2)
// ---------------------------------------------------------------------------

export interface CopyItem {
  /** Réponse brute saisie (nombre + unité, lettre de choix, ou vide). */
  raw: string;
  points: number;
  code: ErrorCode | null;
  /** Code proposé automatiquement (et non modifié à la main). */
  codeAuto: boolean;
}

export interface TestCopy {
  id: string;
  studentId: string;
  test: TestId;
  items: Record<string, CopyItem>;
  /** Questions à correction manuelle (2.1, 2.2) pas encore corrigées → « À corriger ». */
  pendingManual: boolean;
  source: 'saisie' | 'csv';
  enteredAt: string;
  updatedAt: string;
}

export interface Settings {
  teacherPin: string;
  /** Seuil « erreur confirmée » du questionnaire (0–1). */
  confirmThreshold: number;
}

export interface Database {
  version: 1;
  classes: ClassRoom[];
  students: Student[];
  attempts: Attempt[];
  alerts: Alert[];
  messages: TeacherMessage[];
  videoViews: VideoView[];
  missionRuns: MissionRun[];
  questionnaireWindows: QuestionnaireWindow[];
  questionnaireResponses: QuestionnaireResponse[];
  testCopies: TestCopy[];
  settings: Settings;
  /** Prochain numéro de code anonyme. */
  nextAnon: number;
}
