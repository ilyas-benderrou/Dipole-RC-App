import type { MainError } from '../engine/types';
import type { OptionKey } from '../data/types';

/**
 * Questionnaire diagnostique (section 11) — contenu exact.
 * But : confirmer la fréquence réelle des erreurs E1 à E6 (analyse des besoins). Durée : 20 min. Non noté.
 */
export interface QOption {
  text: string;
  /** Codes d'erreur attachés à la proposition (vide = bonne réponse, ou erreur de calcul non codée). */
  codes: MainError[];
}

export interface QQuestion {
  id: string;
  prompt: string;
  /** ✍ : champ « Explique ta réponse en une phrase ». */
  explain: boolean;
  options: Record<OptionKey, QOption>;
  correct: OptionKey;
}

export const QUESTIONNAIRE_CONTEXT =
  'Un générateur de tension E, un interrupteur K, un conducteur ohmique de résistance R et un condensateur de capacité C sont montés en série. Le courant $i$ est orienté dans le même sens pendant la charge et la décharge.';

export const CERTAINTY_LABELS = ['Je devine', 'Peu sûr', 'Assez sûr', 'Certain'] as const;

export const CRI_NOTE =
  'Échelle adaptée de l’indice de certitude CRI de Hasan, Bagayoko et Kelley (1999), Physics Education 34(5), dont l’échelle originale va de 0 à 5.';

export const QUESTIONS: QQuestion[] = [
  {
    id: 'Q1',
    prompt: 'Pendant la charge, que se passe-t-il entre les deux armatures ?',
    explain: true,
    options: {
      a: { text: 'Les électrons traversent le diélectrique de B vers A', codes: ['E1'] },
      b: { text: 'Les électrons traversent le diélectrique de A vers B', codes: ['E1'] },
      c: { text: 'Aucune charge ne traverse le diélectrique', codes: [] },
      d: { text: 'Les électrons traversent le diélectrique seulement au début de la charge', codes: ['E1'] },
    },
    correct: 'c',
  },
  {
    id: 'Q2',
    prompt: 'Un condensateur chargé est débranché. Ses armatures portent :',
    explain: false,
    options: {
      a: { text: '$q_A = 0$ et $q_B = 0$', codes: ['E1'] },
      b: { text: '$q_A = +q$ et $q_B = -q$', codes: [] },
      c: { text: '$q_A = +q$ et $q_B = 0$', codes: ['E1'] },
      d: { text: '$q_A = +2q$ et $q_B = 0$', codes: ['E1'] },
    },
    correct: 'b',
  },
  {
    id: 'Q3',
    prompt: 'On double la tension aux bornes d’un condensateur de 10 µF. Sa capacité :',
    explain: false,
    options: {
      a: { text: 'double', codes: ['E2'] },
      b: { text: 'est divisée par deux', codes: ['E2'] },
      c: { text: 'ne change pas', codes: [] },
      d: { text: 'est multipliée par quatre', codes: ['E2'] },
    },
    correct: 'c',
  },
  {
    id: 'Q4',
    prompt: '$q = 40\\,\\mu\\text{C}$ sous 8 V. Sous 4 V, le condensateur porte :',
    explain: false,
    options: {
      a: { text: '20 µC', codes: [] },
      b: { text: '40 µC', codes: ['E2'] },
      c: { text: '80 µC', codes: ['E2'] },
      d: { text: '10 µC', codes: [] },
    },
    correct: 'a',
  },
  {
    id: 'Q5',
    prompt: 'Condensateur déchargé ; on ferme K à $t = 0$ ($E = 6$ V ; $R = 1$ kΩ). Juste après :',
    explain: true,
    options: {
      a: { text: '$u_C = 0$ et $i = 6$ mA', codes: [] },
      b: { text: '$u_C = 6$ V et $i = 0$', codes: ['E3'] },
      c: { text: '$u_C = 0$ et $i = 0$', codes: ['E3'] },
      d: { text: '$u_C = 6$ V et $i = 6$ mA', codes: ['E3'] },
    },
    correct: 'a',
  },
  {
    id: 'Q6',
    prompt: 'Même circuit, longtemps après la fermeture de K :',
    explain: false,
    options: {
      a: { text: '$u_C = E$ et $i = 0$', codes: [] },
      b: { text: '$u_C = E$ et $i = E/R$', codes: ['E1', 'E3'] },
      c: { text: '$u_C = 0$ et $i = 0$', codes: ['E3'] },
      d: { text: '$u_C = E/2$ et $i = E/(2R)$', codes: ['E3'] },
    },
    correct: 'a',
  },
  {
    id: 'Q7',
    prompt: 'Pendant la charge, $u_C$ vérifie :',
    explain: false,
    options: {
      a: { text: '$RC\\,\\dfrac{du_C}{dt} + u_C = E$', codes: [] },
      b: { text: '$R\\,\\dfrac{du_C}{dt} + u_C = E$', codes: ['E4'] },
      c: { text: '$RC\\,\\dfrac{du_C}{dt} + u_C = 0$', codes: ['E4'] },
      d: { text: '$RC\\,\\dfrac{du_C}{dt} - u_C = E$', codes: ['E4'] },
    },
    correct: 'a',
  },
  {
    id: 'Q8',
    prompt: 'Chargé sous E, le condensateur se décharge dans R à partir de $t = 0$ :',
    explain: false,
    options: {
      a: { text: '$u_C = E\\,e^{-t/\\tau}$', codes: [] },
      b: { text: '$u_C = E\\left(1 - e^{-t/\\tau}\\right)$', codes: ['E4'] },
      c: { text: '$u_C = -E\\,e^{-t/\\tau}$', codes: ['E6'] },
      d: { text: '$u_C = E\\,e^{t/\\tau}$', codes: ['E4'] },
    },
    correct: 'a',
  },
  {
    id: 'Q9',
    prompt: 'Charge sous $E = 10$ V : on détermine τ à l’instant où $u_C$ vaut :',
    explain: true,
    options: {
      a: { text: '3,7 V', codes: ['E5'] },
      b: { text: '6,3 V', codes: [] },
      c: { text: '5 V', codes: ['E5'] },
      d: { text: '10 V', codes: ['E5'] },
    },
    correct: 'b',
  },
  {
    id: 'Q10',
    prompt: 'Pendant la charge, à $t = \\tau$, le condensateur est :',
    explain: false,
    options: {
      a: { text: 'complètement chargé', codes: ['E5'] },
      b: { text: 'chargé à 63 %', codes: [] },
      c: { text: 'chargé à 37 %', codes: ['E5'] },
      d: { text: 'chargé à 50 %', codes: ['E5'] },
    },
    correct: 'b',
  },
  {
    id: 'Q11',
    prompt: 'Pendant la décharge, avec la même orientation que pendant la charge, $i$ est :',
    explain: true,
    options: {
      a: { text: 'positive', codes: ['E6'] },
      b: { text: 'négative', codes: [] },
      c: { text: 'nulle', codes: ['E3'] },
      d: { text: 'constante', codes: ['E3'] },
    },
    correct: 'b',
  },
  {
    id: 'Q12',
    prompt: 'Pendant la décharge, $i$ s’écrit :',
    explain: false,
    options: {
      a: { text: '$\\dfrac{E}{R}\\,e^{-t/\\tau}$', codes: ['E6'] },
      b: { text: '$-\\dfrac{E}{R}\\,e^{-t/\\tau}$', codes: [] },
      c: { text: '$-\\dfrac{E}{R}\\left(1 - e^{-t/\\tau}\\right)$', codes: ['E4'] },
      d: { text: '$\\dfrac{E}{R}\\left(1 - e^{-t/\\tau}\\right)$', codes: ['E4'] },
    },
    correct: 'b',
  },
];

export const EXPLAIN_QUESTIONS = QUESTIONS.filter((q) => q.explain).map((q) => q.id);
