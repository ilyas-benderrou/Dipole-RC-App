import type { ErrorCode, LessonId } from '../engine/types';
import { bankItem } from './qcm';

/**
 * Questions flash (après chaque leçon) et question de compréhension de V0.
 * Elles reprennent les énoncés et distracteurs du cahier des charges (banque 7.6, gabarits M1, M5, M6, erreur E5).
 */
export interface FlashQuestion {
  prompt: string;
  /** « tex » : propositions affichées en LaTeX. */
  render?: 'tex';
  options: { id: string; text: string; code: ErrorCode | null; correct?: boolean }[];
}

/** V0 : « K en position 1 : charge ou décharge ? » (si faux, revoir la scène de la charge). */
export const V0_QUESTION: FlashQuestion = {
  prompt: 'L’interrupteur K est basculé en position 1. Le condensateur :',
  options: [
    { id: 'charge', text: 'se charge', code: null, correct: true },
    { id: 'decharge', text: 'se décharge', code: null },
  ],
};
export const V0_REPLAY_SCENE = 'V0-S6';

const e2a = bankItem('Q-E2a');

export const FLASH: Record<LessonId, FlashQuestion> = {
  L1: {
    prompt: e2a.question,
    options: [{ id: 'ok', text: e2a.correct, code: null, correct: true }, ...e2a.distractors.map((d, j) => ({ id: `d${j}`, text: d.text, code: d.code }))],
  },
  L2: {
    prompt: 'Pendant la charge, $u_C$ vérifie :',
    render: 'tex',
    options: [
      { id: 'ok', text: 'RC\\,\\dfrac{du_C}{dt} + u_C = E', code: null, correct: true },
      { id: 'a', text: 'R\\,\\dfrac{du_C}{dt} + u_C = E', code: 'E4' },
      { id: 'b', text: 'RC\\,\\dfrac{du_C}{dt} + u_C = 0', code: 'E4' },
      { id: 'c', text: 'RC\\,\\dfrac{du_C}{dt} - u_C = E', code: 'E4' },
    ],
  },
  L3: {
    prompt: 'En charge, à $t = \\tau$, la tension $u_C$ vaut environ :',
    options: [
      { id: 'ok', text: '$0{,}63\\,E$', code: null, correct: true },
      { id: 'a', text: '$0{,}37\\,E$', code: 'E5' },
      { id: 'b', text: '$E/2$', code: 'E5' },
      { id: 'c', text: '$E$ : la charge est terminée', code: 'E5' },
    ],
  },
  L4: {
    prompt: 'Pendant la décharge (même orientation que pendant la charge), $i$ s’écrit :',
    render: 'tex',
    options: [
      { id: 'ok', text: 'i = -\\dfrac{E}{R}\\,e^{-t/\\tau}', code: null, correct: true },
      { id: 'a', text: 'i = \\dfrac{E}{R}\\,e^{-t/\\tau}', code: 'E6' },
      { id: 'b', text: 'i = \\dfrac{E}{R}\\left(1 - e^{-t/\\tau}\\right)', code: 'E4' },
      { id: 'c', text: 'i = -\\dfrac{E}{R}\\left(1 - e^{-t/\\tau}\\right)', code: 'E4' },
    ],
  },
  L5: {
    prompt: 'L’énergie emmagasinée dans le condensateur vaut :',
    render: 'tex',
    options: [
      { id: 'ok', text: 'E_e = \\tfrac12\\,C\\,u_C^2', code: null, correct: true },
      { id: 'a', text: 'E_e = C\\,u_C^2', code: 'EX' },
      { id: 'b', text: 'E_e = \\tfrac12\\,C\\,u_C', code: 'EX' },
      { id: 'c', text: 'E_e = \\tfrac12\\,C^2\\,u_C', code: 'EX' },
    ],
  },
};
