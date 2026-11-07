import type { Competence, ErrorCode, TestId } from '../engine/types';
import type { Quantity } from '../physics/units';

/**
 * Pré-test et post-test (section 12) — contenu exact. Passation sur papier, en classe, 30 min, noté sur 20.
 * Répartition : C1 = 4 pts ; C2-C3 = 6 pts (2.1 → C2, 2.2 → C3) ; C4 = 5 pts ; C5 = 3 pts ; C6 = 2 pts.
 * Chaque question est découpée en « éléments » notés séparément (une valeur, un choix, ou un critère de correction manuelle).
 */
export type ItemKind = 'num' | 'choice' | 'criterion';

export interface TestItem {
  id: string;
  question: string;
  label: string;
  kind: ItemKind;
  points: number;
  competence: Competence;
  /** NUM : grandeur, réponse SI et distracteurs (code proposé automatiquement). */
  quantity?: Quantity;
  answer?: number;
  distractors?: { value: number; code: ErrorCode }[];
  /** Choix : propositions (lettre → texte LaTeX ou texte), bonne lettre, code par lettre fausse. */
  options?: { key: string; text: string; tex?: boolean; code: ErrorCode | null }[];
  correctKey?: string;
  /** Code habituel si faux (rappel pour la correction manuelle). */
  usualCode?: ErrorCode;
  /** Réponse attendue (texte pour le corrigé). */
  expected: string;
}

export interface TestQuestion {
  id: string;
  statement: string;
  format: string;
  expected: string;
  bareme: string;
  codes: string;
  /** Lignes de réponse prévues sur la copie. */
  lines: number;
}

export interface TestDef {
  id: TestId;
  title: string;
  questions: TestQuestion[];
  items: TestItem[];
}

const iExpr = (sign: '-' | '') => `i = ${sign}\\dfrac{E}{R}\\,e^{-t/\\tau}`;

/** Propositions de 4.1 (reprennent les distracteurs du gabarit M5). */
function currentChoices(phase: 'charge' | 'decharge') {
  if (phase === 'decharge')
    return [
      { key: 'a', text: iExpr(''), tex: true, code: 'E6' as const },
      { key: 'b', text: iExpr('-'), tex: true, code: null },
      { key: 'c', text: 'i = -\\dfrac{E}{R}\\left(1 - e^{-t/\\tau}\\right)', tex: true, code: 'E4' as const },
      { key: 'd', text: 'i = \\dfrac{E}{R}\\left(1 - e^{-t/\\tau}\\right)', tex: true, code: 'E4' as const },
    ];
  return [
    { key: 'a', text: iExpr(''), tex: true, code: null },
    { key: 'b', text: iExpr('-'), tex: true, code: 'E6' as const },
    { key: 'c', text: 'i = \\dfrac{E}{R}\\left(1 - e^{-t/\\tau}\\right)', tex: true, code: 'E4' as const },
    { key: 'd', text: 'i = E\\left(1 - e^{-t/\\tau}\\right)', tex: true, code: 'E4' as const },
  ];
}

const SIGN = (good: 'négatif' | 'positif') => [
  { key: 'a', text: 'positif', code: good === 'positif' ? null : ('E6' as const) },
  { key: 'b', text: 'négatif', code: good === 'négatif' ? null : ('E6' as const) },
];

export const PRE_TEST: TestDef = {
  id: 'pre',
  title: 'Pré-test – Dipôle RC',
  questions: [
    { id: '1.1', statement: '$C = 4{,}7\\,\\mu\\text{F}$ ; $u_C = 12\\,\\text{V}$. Calcule $q$.', format: 'NUM', expected: '56,4 µC (5,64×10⁻⁵ C)', bareme: '2', codes: 'E2 / EX', lines: 2 },
    { id: '1.2', statement: '$C_1 = 2\\,\\mu\\text{F}$ et $C_2 = 6\\,\\mu\\text{F}$. Capacité équivalente en série, puis en parallèle.', format: 'NUM ×2', expected: '1,5 µF ; 8 µF', bareme: '1 + 1', codes: 'EX', lines: 3 },
    { id: '2.1', statement: 'Échelon montant E à $t = 0$, condensateur déchargé. Établis l’équation différentielle vérifiée par $u_C$.', format: 'Texte libre', expected: '$u_R + u_C = E$ ; $u_R = R\\,i$ ; $i = C\\,\\dfrac{du_C}{dt}$ ⇒ $RC\\,\\dfrac{du_C}{dt} + u_C = E$', bareme: '1 + 1 + 1', codes: 'E4', lines: 5 },
    { id: '2.2', statement: 'Vérifie que $u_C = E\\left(1 - e^{-t/\\tau}\\right)$ est solution et donne τ en fonction de R et C.', format: 'Texte libre', expected: '$\\dfrac{du_C}{dt} = \\dfrac{E}{\\tau}\\,e^{-t/\\tau}$ ; en remplaçant, l’égalité est vraie pour tout t si $\\tau = RC$', bareme: '2 + 1', codes: 'E4', lines: 5 },
    { id: '3.1', statement: '$R = 10\\,\\text{k}\\Omega$ ; $C = 100\\,\\mu\\text{F}$. Calcule τ, puis la durée de charge pratique.', format: 'NUM ×2', expected: '1 s ; 5 s', bareme: '2 + 1', codes: 'E5 si « 1 s » ; EX', lines: 3 },
    { id: '3.2', statement: 'Charge sous $E = 10\\,\\text{V}$ : $u_C = 6{,}3\\,\\text{V}$ à $t = 20\\,\\text{ms}$. Déduis τ, puis C ($R = 2\\,\\text{k}\\Omega$).', format: 'NUM ×2', expected: '20 ms ; 10 µF', bareme: '1 + 1', codes: 'E5 ; E2 / EX', lines: 3 },
    { id: '4.1', statement: 'Décharge depuis $E = 10\\,\\text{V}$ dans $R = 2\\,\\text{k}\\Omega$, même orientation. Expression de $i(t)$ et signe.', format: 'EXPR', expected: '$-\\dfrac{E}{R}\\,e^{-t/\\tau}$ ; négatif', bareme: '1 + 1', codes: 'E6 ; E4', lines: 3 },
    { id: '4.2', statement: 'Calcule $i$ juste après le début de la décharge.', format: 'NUM', expected: '−5 mA', bareme: '1', codes: 'E3 si 0 ; E6 si +5 mA', lines: 2 },
    { id: '5', statement: 'Énergie emmagasinée : $C = 10\\,\\mu\\text{F}$ chargé sous $E = 10\\,\\text{V}$.', format: 'NUM', expected: '5×10⁻⁴ J (0,5 mJ)', bareme: '2', codes: 'EX', lines: 2 },
  ],
  items: [
    { id: '1.1', question: '1.1', label: 'q', kind: 'num', points: 2, competence: 'C1', quantity: 'charge', answer: 56.4e-6, distractors: [{ value: 4.7e-6 / 12, code: 'E2' }, { value: 12 / 4.7e-6, code: 'E2' }], usualCode: 'E2', expected: '56,4 µC' },
    { id: '1.2a', question: '1.2', label: 'Série', kind: 'num', points: 1, competence: 'C1', quantity: 'capacite', answer: 1.5e-6, distractors: [{ value: 8e-6, code: 'EX' }], usualCode: 'EX', expected: '1,5 µF' },
    { id: '1.2b', question: '1.2', label: 'Parallèle', kind: 'num', points: 1, competence: 'C1', quantity: 'capacite', answer: 8e-6, distractors: [{ value: 1.5e-6, code: 'EX' }], usualCode: 'EX', expected: '8 µF' },
    { id: '2.1a', question: '2.1', label: 'Additivité : u_R + u_C = E', kind: 'criterion', points: 1, competence: 'C2', usualCode: 'E4', expected: '$u_R + u_C = E$' },
    { id: '2.1b', question: '2.1', label: 'u_R = R·i et i = C·du_C/dt', kind: 'criterion', points: 1, competence: 'C2', usualCode: 'E4', expected: '$u_R = R\\,i$ ; $i = C\\,\\dfrac{du_C}{dt}$' },
    { id: '2.1c', question: '2.1', label: 'RC·du_C/dt + u_C = E', kind: 'criterion', points: 1, competence: 'C2', usualCode: 'E4', expected: '$RC\\,\\dfrac{du_C}{dt} + u_C = E$' },
    { id: '2.2a', question: '2.2', label: 'Dérivée et remplacement', kind: 'criterion', points: 2, competence: 'C3', usualCode: 'E4', expected: '$\\dfrac{du_C}{dt} = \\dfrac{E}{\\tau}\\,e^{-t/\\tau}$, égalité vérifiée' },
    { id: '2.2b', question: '2.2', label: 'τ = RC', kind: 'criterion', points: 1, competence: 'C3', usualCode: 'E4', expected: '$\\tau = RC$' },
    { id: '3.1a', question: '3.1', label: 'τ', kind: 'num', points: 2, competence: 'C4', quantity: 'temps', answer: 1, distractors: [], usualCode: 'EX', expected: '1 s' },
    { id: '3.1b', question: '3.1', label: 'Durée de charge', kind: 'num', points: 1, competence: 'C4', quantity: 'temps', answer: 5, distractors: [{ value: 1, code: 'E5' }], usualCode: 'E5', expected: '5 s' },
    { id: '3.2a', question: '3.2', label: 'τ', kind: 'num', points: 1, competence: 'C4', quantity: 'temps', answer: 0.02, distractors: [], usualCode: 'E5', expected: '20 ms' },
    { id: '3.2b', question: '3.2', label: 'C', kind: 'num', points: 1, competence: 'C4', quantity: 'capacite', answer: 10e-6, distractors: [{ value: 2000 / 0.02, code: 'E2' }, { value: 0.02 * 2000, code: 'EX' }], usualCode: 'E2', expected: '10 µF' },
    { id: '4.1a', question: '4.1', label: 'Expression de i(t)', kind: 'choice', points: 1, competence: 'C5', options: currentChoices('decharge'), correctKey: 'b', usualCode: 'E4', expected: '$-\\dfrac{E}{R}\\,e^{-t/\\tau}$' },
    { id: '4.1b', question: '4.1', label: 'Signe de i', kind: 'choice', points: 1, competence: 'C5', options: SIGN('négatif'), correctKey: 'b', usualCode: 'E6', expected: 'négatif' },
    { id: '4.2', question: '4.2', label: 'i(0⁺)', kind: 'num', points: 1, competence: 'C5', quantity: 'courant', answer: -5e-3, distractors: [{ value: 0, code: 'E3' }, { value: 5e-3, code: 'E6' }], usualCode: 'E3', expected: '−5 mA' },
    { id: '5', question: '5', label: 'E_e', kind: 'num', points: 2, competence: 'C6', quantity: 'energie', answer: 5e-4, distractors: [{ value: 1e-3, code: 'EX' }, { value: 5e-5, code: 'EX' }], usualCode: 'EX', expected: '5×10⁻⁴ J' },
  ],
};

export const POST_TEST: TestDef = {
  id: 'post',
  title: 'Post-test – Dipôle RC',
  questions: [
    { id: '1.1', statement: '$C = 22\\,\\mu\\text{F}$ ; $u_C = 5\\,\\text{V}$. Calcule $q$.', format: 'NUM', expected: '110 µC', bareme: '2', codes: 'E2 / EX', lines: 2 },
    { id: '1.2', statement: '$C_1 = 3\\,\\mu\\text{F}$ et $C_2 = 6\\,\\mu\\text{F}$. Série, puis parallèle.', format: 'NUM ×2', expected: '2 µF ; 9 µF', bareme: '1 + 1', codes: 'EX', lines: 3 },
    { id: '2.1', statement: 'Décharge dans R, condensateur chargé sous E. Établis l’équation différentielle vérifiée par $q$.', format: 'Texte libre', expected: '$u_R + u_C = 0$ ; $u_R = R\\,\\dfrac{dq}{dt}$ ; $u_C = \\dfrac{q}{C}$ ⇒ $RC\\,\\dfrac{dq}{dt} + q = 0$', bareme: '1 + 1 + 1', codes: 'E4', lines: 5 },
    { id: '2.2', statement: 'Vérifie que $u_C = E\\,e^{-t/\\tau}$ est solution et justifie la constante E par la condition initiale.', format: 'Texte libre', expected: '$\\dfrac{du_C}{dt} = -\\dfrac{E}{\\tau}\\,e^{-t/\\tau}$ ; l’égalité est vraie si $\\tau = RC$ ; $u_C(0) = E$ car le condensateur part chargé', bareme: '2 + 1', codes: 'E4', lines: 5 },
    { id: '3.1', statement: '$R = 47\\,\\text{k}\\Omega$ ; $C = 10\\,\\mu\\text{F}$. Calcule τ, puis la durée de charge pratique.', format: 'NUM ×2', expected: '0,47 s ; 2,35 s', bareme: '2 + 1', codes: 'E5 ; EX', lines: 3 },
    { id: '3.2', statement: 'Décharge depuis $E = 10\\,\\text{V}$ : $u_C = 3{,}7\\,\\text{V}$ à $t = 50\\,\\text{ms}$. Déduis τ, puis C ($R = 5\\,\\text{k}\\Omega$).', format: 'NUM ×2', expected: '50 ms ; 10 µF', bareme: '1 + 1', codes: 'E5 ; E2 / EX', lines: 3 },
    { id: '4.1', statement: 'Charge sous $E = 12\\,\\text{V}$ à travers $R = 4\\,\\text{k}\\Omega$. Expression de $i(t)$ et signe.', format: 'EXPR', expected: '$\\dfrac{E}{R}\\,e^{-t/\\tau}$ ; positif', bareme: '1 + 1', codes: 'E6 ; E4', lines: 3 },
    { id: '4.2', statement: 'Calcule $i$ juste après la fermeture de K.', format: 'NUM', expected: '3 mA', bareme: '1', codes: 'E3 si 0', lines: 2 },
    { id: '5', statement: 'Énergie : $C = 100\\,\\mu\\text{F}$ sous 20 V.', format: 'NUM', expected: '0,02 J', bareme: '2', codes: 'EX', lines: 2 },
  ],
  items: [
    { id: '1.1', question: '1.1', label: 'q', kind: 'num', points: 2, competence: 'C1', quantity: 'charge', answer: 110e-6, distractors: [{ value: 22e-6 / 5, code: 'E2' }, { value: 5 / 22e-6, code: 'E2' }], usualCode: 'E2', expected: '110 µC' },
    { id: '1.2a', question: '1.2', label: 'Série', kind: 'num', points: 1, competence: 'C1', quantity: 'capacite', answer: 2e-6, distractors: [{ value: 9e-6, code: 'EX' }], usualCode: 'EX', expected: '2 µF' },
    { id: '1.2b', question: '1.2', label: 'Parallèle', kind: 'num', points: 1, competence: 'C1', quantity: 'capacite', answer: 9e-6, distractors: [{ value: 2e-6, code: 'EX' }], usualCode: 'EX', expected: '9 µF' },
    { id: '2.1a', question: '2.1', label: 'Additivité : u_R + u_C = 0', kind: 'criterion', points: 1, competence: 'C2', usualCode: 'E4', expected: '$u_R + u_C = 0$' },
    { id: '2.1b', question: '2.1', label: 'u_R = R·dq/dt et u_C = q/C', kind: 'criterion', points: 1, competence: 'C2', usualCode: 'E4', expected: '$u_R = R\\,\\dfrac{dq}{dt}$ ; $u_C = \\dfrac{q}{C}$' },
    { id: '2.1c', question: '2.1', label: 'RC·dq/dt + q = 0', kind: 'criterion', points: 1, competence: 'C2', usualCode: 'E4', expected: '$RC\\,\\dfrac{dq}{dt} + q = 0$' },
    { id: '2.2a', question: '2.2', label: 'Dérivée et égalité (τ = RC)', kind: 'criterion', points: 2, competence: 'C3', usualCode: 'E4', expected: '$\\dfrac{du_C}{dt} = -\\dfrac{E}{\\tau}\\,e^{-t/\\tau}$, vraie si $\\tau = RC$' },
    { id: '2.2b', question: '2.2', label: 'Condition initiale u_C(0) = E', kind: 'criterion', points: 1, competence: 'C3', usualCode: 'E4', expected: '$u_C(0) = E$' },
    { id: '3.1a', question: '3.1', label: 'τ', kind: 'num', points: 2, competence: 'C4', quantity: 'temps', answer: 0.47, distractors: [], usualCode: 'EX', expected: '0,47 s' },
    { id: '3.1b', question: '3.1', label: 'Durée de charge', kind: 'num', points: 1, competence: 'C4', quantity: 'temps', answer: 2.35, distractors: [{ value: 0.47, code: 'E5' }], usualCode: 'E5', expected: '2,35 s' },
    { id: '3.2a', question: '3.2', label: 'τ', kind: 'num', points: 1, competence: 'C4', quantity: 'temps', answer: 0.05, distractors: [], usualCode: 'E5', expected: '50 ms' },
    { id: '3.2b', question: '3.2', label: 'C', kind: 'num', points: 1, competence: 'C4', quantity: 'capacite', answer: 10e-6, distractors: [{ value: 5000 / 0.05, code: 'E2' }, { value: 0.05 * 5000, code: 'EX' }], usualCode: 'E2', expected: '10 µF' },
    { id: '4.1a', question: '4.1', label: 'Expression de i(t)', kind: 'choice', points: 1, competence: 'C5', options: currentChoices('charge'), correctKey: 'a', usualCode: 'E4', expected: '$\\dfrac{E}{R}\\,e^{-t/\\tau}$' },
    { id: '4.1b', question: '4.1', label: 'Signe de i', kind: 'choice', points: 1, competence: 'C5', options: SIGN('positif'), correctKey: 'a', usualCode: 'E6', expected: 'positif' },
    { id: '4.2', question: '4.2', label: 'i(0⁺)', kind: 'num', points: 1, competence: 'C5', quantity: 'courant', answer: 3e-3, distractors: [{ value: 0, code: 'E3' }, { value: -3e-3, code: 'E6' }], usualCode: 'E3', expected: '3 mA' },
    { id: '5', question: '5', label: 'E_e', kind: 'num', points: 2, competence: 'C6', quantity: 'energie', answer: 0.02, distractors: [{ value: 0.04, code: 'EX' }, { value: 1e-3, code: 'EX' }], usualCode: 'EX', expected: '0,02 J' },
  ],
};

export const TESTS: Record<TestId, TestDef> = { pre: PRE_TEST, post: POST_TEST };
export const TEST_LABELS: Record<TestId, string> = { pre: 'Pré-test', post: 'Post-test' };
export const TEST_MAX = 20;
