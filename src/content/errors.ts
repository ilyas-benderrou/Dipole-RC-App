import type { Competence, ErrorCode, ExSubtype, MissionId, VideoId } from '../engine/types';

/**
 * Base des erreurs (section 8.2). Textes repris tels quels du cahier des charges.
 * Les études qui appuient E1 à E4 sont dans `references.ts`.
 */
export interface ErrorInfo {
  code: ErrorCode;
  name: string;
  /** Indice donné à la 1re occurrence (formules entre $…$). */
  hint: string;
  /** Micro-vidéo de remédiation (2e occurrence). */
  video: VideoId | null;
  /** Missions de simulation liées. */
  missions: MissionId[];
  /** Gabarits d'exercices de remédiation (nouvelles valeurs). */
  remediation: string[];
  competences: Competence[];
}

export const ERRORS: Record<ErrorCode, ErrorInfo> = {
  E1: {
    code: 'E1',
    name: 'Le courant traverse le condensateur',
    hint: 'Entre les armatures, il y a un isolant. Les charges peuvent-elles le traverser ? Où circule alors le courant ?',
    video: 'M1',
    missions: ['S1'],
    remediation: ['F5'],
    competences: ['C1'],
  },
  E2: {
    code: 'E2',
    name: 'Capacité confondue avec la charge ou la tension',
    hint: 'La capacité dépend-elle de la tension, ou de la fabrication du condensateur ? Si $u_C$ double, qu’est-ce qui double ?',
    video: 'M2',
    missions: ['S2'],
    remediation: ['F1', 'F2', 'QE2'],
    competences: ['C1'],
  },
  E3: {
    code: 'E3',
    name: 'Instants initial et final faux',
    hint: '$u_C$ peut-elle sauter d’un coup ? Au tout début, quelle tension reste-t-il aux bornes du conducteur ohmique ?',
    video: 'M3',
    missions: ['S3'],
    remediation: ['F6', 'QE3'],
    competences: ['C5'],
  },
  E4: {
    code: 'E4',
    name: 'Mise en équation incorrecte',
    hint: 'Reprends les trois étapes : loi d’additivité, $u_R = R\\,i$, $i = C\\,\\dfrac{du_C}{dt}$. As-tu gardé le C ? Quelle est la condition initiale ?',
    video: 'M4',
    missions: ['S7'],
    remediation: ['M1', 'M2'],
    competences: ['C2', 'C3'],
  },
  E5: {
    code: 'E5',
    name: 'τ mal lu ou mal interprété',
    hint: 'En charge, à τ, $u_C$ a fait 63 % du chemin ; en décharge, il en reste 37 %. La charge n’est finie qu’après environ 5τ.',
    video: 'M5',
    missions: ['S4', 'S5'],
    remediation: ['M3', 'F4'],
    competences: ['C4'],
  },
  E6: {
    code: 'E6',
    name: 'Signe de i oublié en décharge',
    hint: 'Pendant la décharge, les charges repartent dans l’autre sens. Avec la même orientation, quel est le signe de $i$ ?',
    video: 'M6',
    missions: ['S6'],
    remediation: ['M5'],
    competences: ['C5'],
  },
  EX: {
    code: 'EX',
    name: 'Erreur hors des six (calcul, puissance de 10, association, énergie)',
    hint: 'Ta méthode est juste ; vérifie ton calcul.',
    video: null,
    missions: [],
    remediation: [],
    competences: [],
  },
};

const EX_HINTS: Record<ExSubtype, string> = {
  puissance: 'Ta méthode est juste ; vérifie les puissances de 10.',
  association: 'Ta méthode est juste ; vérifie la règle d’association.',
  energie: 'Ta méthode est juste ; vérifie le ½ et le carré.',
  calcul: 'Ta méthode est juste ; vérifie ton calcul.',
};

/** Indice d'une erreur (le texte de EX dépend du sous-type). */
export function errorHint(code: ErrorCode, sub?: ExSubtype | null): string {
  if (code === 'EX') return EX_HINTS[sub ?? 'calcul'];
  return ERRORS[code].hint;
}

/** Vidéo à revoir à la 2e erreur EX : L5 pour l'énergie, L1 sinon. */
export function exReviewVideo(sub?: ExSubtype | null): VideoId {
  return sub === 'energie' ? 'L5' : 'L1';
}

export const EX_SUB_LABELS: Record<ExSubtype, string> = {
  puissance: 'puissances de 10',
  association: 'règle d’association',
  energie: 'formule de l’énergie',
  calcul: 'calcul',
};
