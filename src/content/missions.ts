import type { SimConfig } from '../components/sim/useSimulation';
import type { ErrorCode, LessonId, MissionId } from '../engine/types';

/** Missions de simulation (section 6.4) : une consigne + une action dans la simulation + une vérification automatique. */
export interface MissionDef {
  id: MissionId;
  title: string;
  /** Consigne exacte du cahier des charges. */
  consigne: string;
  /** Erreur (ou compétence) travaillée. */
  link: ErrorCode | 'C6';
  lesson: LessonId;
  config: SimConfig;
}

export const MISSIONS: Record<MissionId, MissionDef> = {
  S1: {
    id: 'S1',
    title: 'Le diélectrique',
    consigne: 'Charge le condensateur et observe le diélectrique. Les électrons le traversent-ils ?',
    link: 'E1',
    lesson: 'L1',
    config: { E: 6, rIndex: 3, cIndex: 6, k: 2, u0: 0 },
  },
  S2: {
    id: 'S2',
    title: 'Doubler C',
    consigne: 'Double C. Que devient la charge q pour la même tension ? Et la capacité ?',
    link: 'E2',
    lesson: 'L1',
    config: { E: 6, rIndex: 6, cIndex: 3, k: 2, u0: 0, lock: { E: true, R: true, C: true }, plots: ['uC', 'q'] },
  },
  S3: {
    id: 'S3',
    title: 'Début et fin de la charge',
    consigne: 'Ferme K et relève u_C et i juste après, puis après 5τ.',
    link: 'E3',
    lesson: 'L2',
    config: { E: 6, rIndex: 3, cIndex: 6, k: 2, u0: 0, lock: { E: true, R: true, C: true, doubleC: true } },
  },
  S4: {
    id: 'S4',
    title: 'Trouver τ',
    consigne: 'Trouve τ sur la courbe de charge sans les repères.',
    link: 'E5',
    lesson: 'L3',
    config: { E: 8, rIndex: 3, cIndex: 5, k: 2, u0: 0, markersAllowed: false, lock: { R: true, C: true, doubleC: true } },
  },
  S5: {
    id: 'S5',
    title: 'τ pour C puis pour 2C',
    consigne: 'Mesure τ pour C, puis pour 2C. Que remarques-tu ?',
    link: 'E5',
    lesson: 'L3',
    config: { E: 6, rIndex: 4, cIndex: 4, k: 2, u0: 0, lock: { R: true, C: true } },
  },
  S6: {
    id: 'S6',
    title: 'Le signe de i en décharge',
    consigne: 'Bascule K en position 2. Quel est le signe de i ? Pourquoi ?',
    link: 'E6',
    lesson: 'L4',
    config: { E: 6, rIndex: 3, cIndex: 6, k: 1, u0: 6, lock: { E: true } },
  },
  S7: {
    id: 'S7',
    title: 'Loi d’additivité',
    consigne: 'Écris l’équation qui relie u_R, u_C et E pendant la charge, puis vérifie-la avec le curseur à deux instants.',
    link: 'E4',
    lesson: 'L2',
    config: { E: 9, rIndex: 5, cIndex: 4, k: 2, u0: 0, lock: { E: true, R: true, C: true, doubleC: true }, plots: ['uC', 'uR', 'i'] },
  },
  S8: {
    id: 'S8',
    title: 'Énergie stockée',
    consigne: 'Quelle énergie est stockée en fin de charge ? Vérifie avec la jauge.',
    link: 'C6',
    lesson: 'L5',
    config: { E: 10, rIndex: 3, cIndex: 6, k: 2, u0: 0, lock: { E: true, R: true, C: true, doubleC: true }, plots: ['uC', 'Ee'] },
  },
};

/** Mini-mission proposée après chaque leçon. */
export const LESSON_MISSION: Record<LessonId, MissionId> = { L1: 'S1', L2: 'S3', L3: 'S4', L4: 'S6', L5: 'S8' };

/** Consigne avec formules LaTeX (u_C → $u_C$, τ). */
export function missionText(m: MissionDef): string {
  return m.consigne.replace(/u_C/g, '$u_C$').replace(/u_R/g, '$u_R$').replace(/\bi\b(?= )/g, '$i$');
}
