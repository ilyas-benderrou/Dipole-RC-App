import type { ErrorCode } from '../engine/types';

/** Banque de QCM conceptuels (section 7.6), utilisée par F5, F6 et la remédiation. */
export interface BankItem {
  id: string;
  question: string;
  correct: string;
  distractors: { text: string; code: ErrorCode }[];
}

export const QCM_BANK: BankItem[] = [
  {
    id: 'Q-E1a',
    question: 'Pendant la charge, que se passe-t-il entre les armatures ?',
    correct: 'Aucune charge ne traverse le diélectrique',
    distractors: [
      { text: 'Les électrons le traversent de A vers B', code: 'E1' },
      { text: 'Les électrons le traversent de B vers A', code: 'E1' },
      { text: 'Les électrons le traversent seulement au début de la charge', code: 'E1' },
    ],
  },
  {
    id: 'Q-E1b',
    question: 'Un condensateur chargé est débranché. Ses armatures portent :',
    correct: '$q_A = +q$ et $q_B = -q$',
    distractors: [
      { text: '$q_A = 0$ et $q_B = 0$', code: 'E1' },
      { text: '$q_A = +q$ et $q_B = 0$', code: 'E1' },
      { text: '$q_A = +2q$ et $q_B = 0$', code: 'E1' },
    ],
  },
  {
    id: 'Q-E1c',
    question: 'Longtemps après la fermeture de K, un courant traverse-t-il le condensateur ?',
    correct: 'Non, $i = 0$',
    distractors: [
      { text: 'Oui, $i = E/R$', code: 'E1' },
      { text: 'Oui, très faible et constant', code: 'E1' },
      { text: 'Oui, un courant qui traverse l’isolant', code: 'E1' },
    ],
  },
  {
    id: 'Q-E1d',
    question: 'D’où viennent les électrons accumulés sur B pendant la charge ?',
    correct: 'De l’armature A, par le circuit extérieur',
    distractors: [
      { text: 'Ils sont créés par le condensateur', code: 'E1' },
      { text: 'Ils traversent l’isolant', code: 'E1' },
      { text: 'Ils viennent de l’armature A, à travers le diélectrique', code: 'E1' },
    ],
  },
  {
    id: 'Q-E2a',
    question: 'On double la tension aux bornes d’un condensateur. Sa capacité :',
    correct: 'Ne change pas',
    distractors: [
      { text: 'Double', code: 'E2' },
      { text: 'Est divisée par deux', code: 'E2' },
      { text: 'Quadruple', code: 'E2' },
    ],
  },
  {
    id: 'Q-E2b',
    question: 'De quoi dépend la capacité C ?',
    correct: 'De la surface des armatures, de la distance entre elles et de l’isolant',
    distractors: [
      { text: 'De la tension', code: 'E2' },
      { text: 'De la charge', code: 'E2' },
      { text: 'De la durée de charge', code: 'E2' },
    ],
  },
  {
    id: 'Q-E3a',
    question: 'Juste après la fermeture de K (charge depuis 0) :',
    correct: '$u_C = 0$ et $i = E/R$',
    distractors: [
      { text: '$u_C = E$ et $i = 0$', code: 'E3' },
      { text: '$u_C = 0$ et $i = 0$', code: 'E3' },
      { text: '$u_C = E$ et $i = E/R$', code: 'E3' },
    ],
  },
  {
    id: 'Q-E3b',
    question: 'Longtemps après la fermeture de K :',
    correct: '$u_C = E$ et $i = 0$',
    distractors: [
      { text: '$u_C = E$ et $i = E/R$', code: 'E3' },
      { text: '$u_C = 0$ et $i = 0$', code: 'E3' },
      { text: '$u_C = E/2$', code: 'E3' },
    ],
  },
];

export const bankItem = (id: string): BankItem => {
  const it = QCM_BANK.find((q) => q.id === id);
  if (!it) throw new Error(`QCM inconnu : ${id}`);
  return it;
};
