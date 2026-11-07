export type Level = 'facile' | 'moyen' | 'difficile';
export const LEVELS: Level[] = ['facile', 'moyen', 'difficile'];

export type Competence = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';
export const COMPETENCES: Competence[] = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

/** E1 à E6 : erreurs fréquentes diagnostiquées ; EX : erreur hors des six (calcul, puissance de 10…). */
export type ErrorCode = 'E1' | 'E2' | 'E3' | 'E4' | 'E5' | 'E6' | 'EX';
export const ERROR_CODES: ErrorCode[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6', 'EX'];
export type MainError = Exclude<ErrorCode, 'EX'>;
export const MAIN_ERRORS: MainError[] = ['E1', 'E2', 'E3', 'E4', 'E5', 'E6'];

/** Sous-types de EX (l'indice dépend du sous-type). */
export type ExSubtype = 'puissance' | 'association' | 'energie' | 'calcul';

/** Groupes de l'expérimentation (section 4.2). */
export type Group = 'experimental' | 'temoin' | 'diagnostic';
export const GROUPS: Group[] = ['experimental', 'temoin', 'diagnostic'];

export type VideoId = 'V0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'M1' | 'M2' | 'M3' | 'M4' | 'M5' | 'M6';
export const VIDEO_IDS: VideoId[] = ['V0', 'L1', 'L2', 'L3', 'L4', 'L5', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6'];

export type LessonId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export const LESSON_IDS: LessonId[] = ['L1', 'L2', 'L3', 'L4', 'L5'];

export type MissionId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8';
export const MISSION_IDS: MissionId[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'];

export type TestId = 'pre' | 'post';
export const TEST_IDS: TestId[] = ['pre', 'post'];
