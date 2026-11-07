import type { Competence, Group, Level } from '../engine/types';

/** Modèle du domaine (section 5.1). */
export const COMPETENCE_INFO: Record<Competence, { name: string; short: string; knows: string; lessons: string }> = {
  C1: {
    name: 'Relations du condensateur',
    short: 'Condensateur',
    knows: 'utiliser $q = C\\,u_C$ et $i = \\dfrac{dq}{dt}$, convertir µF/nF, associer des condensateurs',
    lessons: 'L1',
  },
  C2: {
    name: 'Équation différentielle',
    short: 'Équation',
    knows: 'établir l’équation en $u_C$ ou en $q$, en charge et en décharge',
    lessons: 'L2, L4',
  },
  C3: {
    name: 'Solution et u_C(t)',
    short: 'Solution',
    knows: 'vérifier une solution, trouver A, B, α avec la condition initiale',
    lessons: 'L2, L4',
  },
  C4: {
    name: 'Constante de temps τ',
    short: 'τ',
    knows: 'calculer $\\tau = RC$, la lire sur une courbe (0,63E, 0,37E, tangente), prévoir l’effet de R et C',
    lessons: 'L3',
  },
  C5: {
    name: 'Courant, continuité, décharge',
    short: 'Courant',
    knows: 'exprimer $i(t)$ avec son signe, savoir que $u_C$ est continue et $i$ discontinue',
    lessons: 'L2, L4',
  },
  C6: {
    name: 'Énergie',
    short: 'Énergie',
    knows: 'calculer $E_e = \\tfrac12\\,C\\,u_C^2$',
    lessons: 'L5',
  },
};

export const LEVEL_LABELS: Record<Level, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };

export const GROUP_LABELS: Record<Group, string> = {
  experimental: 'Expérimental',
  temoin: 'Témoin',
  diagnostic: 'Diagnostic',
};

/** Formules de référence (section 5.2), affichées en LaTeX. */
export const REFERENCE_FORMULAS: { label: string; tex: string }[] = [
  { label: 'Charge et capacité', tex: 'q = C\\,u_C' },
  { label: 'Intensité', tex: 'i = \\dfrac{dq}{dt} = C\\,\\dfrac{du_C}{dt}' },
  { label: 'Loi d’Ohm', tex: 'u_R = R\\,i' },
  { label: 'Association en série', tex: '\\dfrac{1}{C_e} = \\sum \\dfrac{1}{C_i}' },
  { label: 'Association en parallèle', tex: 'C_e = \\sum C_i' },
  { label: 'Charge : équation', tex: 'RC\\,\\dfrac{du_C}{dt} + u_C = E' },
  { label: 'Charge : solution', tex: 'u_C = E\\left(1 - e^{-t/\\tau}\\right)' },
  { label: 'Charge : courant', tex: 'i = \\dfrac{E}{R}\\,e^{-t/\\tau}' },
  { label: 'Décharge : équation', tex: 'RC\\,\\dfrac{du_C}{dt} + u_C = 0' },
  { label: 'Décharge : solution', tex: 'u_C = E\\,e^{-t/\\tau}' },
  { label: 'Décharge : courant', tex: 'i = -\\dfrac{E}{R}\\,e^{-t/\\tau}' },
  { label: 'En q (charge)', tex: 'RC\\,\\dfrac{dq}{dt} + q = CE' },
  { label: 'En q (décharge)', tex: 'RC\\,\\dfrac{dq}{dt} + q = 0' },
  { label: 'Constante de temps', tex: '\\tau = RC' },
  { label: 'Lecture de τ', tex: 'u_C(\\tau) \\approx 0{,}63E \\text{ (charge)} \\quad u_C(\\tau) \\approx 0{,}37E \\text{ (décharge)}' },
  { label: 'Fin pratique', tex: 't \\approx 5\\tau' },
  { label: 'Énergie', tex: 'E_e = \\tfrac12\\,C\\,u_C^2 = \\tfrac12\\,\\dfrac{q^2}{C}' },
];
