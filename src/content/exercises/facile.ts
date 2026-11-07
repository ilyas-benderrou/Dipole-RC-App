import { type Rng, pick, shuffle } from '../../engine/rng';
import { isClean, roundSig, sigFigs } from '../../physics/units';
import { bankItem } from '../qcm';
import type { ChoiceOption, ExerciseTemplate } from './types';
import { C_LIST, E_LIST, R_LIST, m, pickRC, sampleFn, timeAxisUnit, tq } from './values';

const SRC_COURS = 'Cours « Dipôle RC » 2ème Bac SM – Pr. Ismaili-Alaoui';

/** Options d'un item de la banque 7.6 (la bonne réponse et ses distracteurs codés). */
function bankOptions(id: string): { prompt: string; options: ChoiceOption[] } {
  const it = bankItem(id);
  return {
    prompt: it.question,
    options: [{ id: 'ok', text: it.correct, code: null, correct: true }, ...it.distractors.map((d, j) => ({ id: `d${j}`, text: d.text, code: d.code }))],
  };
}

export const F1: ExerciseTemplate = {
  id: 'F1',
  level: 'facile',
  competences: ['C1'],
  testsErrors: ['E2', 'EX'],
  title: 'Charge d’un condensateur',
  formats: 'NUM',
  source: `${SRC_COURS} §I.4`,
  generate(rng) {
    let C = 0;
    let U = 0;
    do {
      C = pick(rng, C_LIST);
      U = pick(rng, E_LIST);
    } while (!isClean(C * U));
    const q = roundSig(C * U);
    return {
      title: 'Charge d’un condensateur',
      intro: `Un condensateur de capacité ${m(`C = ${tq(C, 'capacite')}`)} est soumis à la tension ${m(`u_C = ${tq(U, 'tension')}`)}.`,
      figures: [],
      values: { C, u_C: U },
      generalHint: 'Utilise la relation $q = C\\,u_C$ et vérifie les unités.',
      questions: [
        {
          kind: 'NUM',
          id: 'q',
          prompt: 'Calcule sa charge $q$.',
          quantity: 'charge',
          answer: q,
          preferredUnit: 'µC',
          distractors: [
            { value: C / U, code: 'E2', label: 'C/u_C' },
            { value: U / C, code: 'E2', label: 'u_C/C' },
          ],
        },
      ],
    };
  },
};

export const F2: ExerciseTemplate = {
  id: 'F2',
  level: 'facile',
  competences: ['C1'],
  testsErrors: ['E2', 'EX'],
  title: 'Charge à courant constant',
  formats: 'NUM',
  source: `${SRC_COURS} §I.4 ; Bac 2017 NS (1-1)`,
  generate(rng) {
    const I_LIST = [10e-6, 20e-6, 50e-6, 100e-6, 200e-6, 500e-6, 1e-3, 2e-3, 5e-3];
    const CAPS = [10e-6, 20e-6, 22e-6, 47e-6, 100e-6, 220e-6, 470e-6];
    let I0 = 0;
    let C = 0;
    let k = 0;
    do {
      I0 = pick(rng, I_LIST);
      C = pick(rng, CAPS);
      k = roundSig(I0 / C);
    } while (!isClean(k) || k < 0.1 || k > 200);
    const uEnd = pick(rng, [5, 6, 8, 10]);
    const tEnd = roundSig(uEnd / k);
    const xUnit = timeAxisUnit(tEnd);
    return {
      title: 'Charge à courant constant',
      intro: `Un générateur idéal de courant d’intensité ${m(`I_0 = ${tq(I0, 'courant')}`)} charge un condensateur initialement déchargé. La courbe ${m('u_C = f(t)')} est une droite de pente ${m(`k = ${tq(k, 'pente')}`)}.`,
      figures: [
        {
          kind: 'plot',
          plot: {
            xLabel: 't',
            yLabel: 'u_C',
            xUnit,
            yUnit: { label: 'V', factor: 1 },
            xMax: tEnd,
            yMin: 0,
            yMax: uEnd * 1.2,
            xStep: tEnd / 4,
            yStep: uEnd / 4,
            series: [{ points: sampleFn((t) => k * t, 0, tEnd, 20), color: '#1F6FD1', label: 'u_C' }],
            labels: [{ x: tEnd * 0.55, y: uEnd * 0.85, text: `pente k`, color: '#1F6FD1' }],
          },
        },
      ],
      values: { I0, k },
      generalHint: 'Pendant une charge à courant constant, $q = I_0\\,t$ et $q = C\\,u_C$ : relie la pente $k$ à $I_0$ et $C$.',
      questions: [
        {
          kind: 'NUM',
          id: 'C',
          prompt: 'Calcule la capacité $C$ du condensateur.',
          quantity: 'capacite',
          answer: roundSig(I0 / k),
          preferredUnit: 'µF',
          distractors: [{ value: k / I0, code: 'E2', label: 'k/I₀' }],
        },
      ],
    };
  },
};

const F3_COMBOS: [number, number][] = [
  [1, 1],
  [2, 2],
  [3, 6],
  [4, 12],
  [6, 12],
  [2, 6],
  [12, 4],
];

export const F3: ExerciseTemplate = {
  id: 'F3',
  level: 'facile',
  competences: ['C1'],
  testsErrors: ['EX'],
  title: 'Association de condensateurs',
  formats: 'NUM',
  source: `${SRC_COURS} §IV ; AlloSchool §II`,
  generate(rng) {
    const [a, b] = pick(rng, F3_COMBOS);
    const scale = pick(rng, [1e-6, 10e-6, 10e-9, 100e-9]);
    const C1 = roundSig(a * scale);
    const C2 = roundSig(b * scale);
    const mode = pick(rng, ['serie', 'parallele'] as const);
    const serie = roundSig((C1 * C2) / (C1 + C2));
    const par = roundSig(C1 + C2);
    const answer = mode === 'serie' ? serie : par;
    const other = mode === 'serie' ? par : serie;
    return {
      title: 'Association de condensateurs',
      intro: `Deux condensateurs de capacités ${m(`C_1 = ${tq(C1, 'capacite')}`)} et ${m(`C_2 = ${tq(C2, 'capacite')}`)} sont associés ${mode === 'serie' ? 'en série' : 'en parallèle'} (voir le schéma).`,
      figures: [{ kind: 'capacitors', mode, c1: tq(C1, 'capacite'), c2: tq(C2, 'capacite') }],
      values: { C1, C2, mode },
      generalHint: 'En série, on additionne les inverses des capacités ; en parallèle, on additionne les capacités.',
      questions: [
        {
          kind: 'NUM',
          id: 'Ce',
          prompt: 'Calcule la capacité équivalente $C_e$.',
          quantity: 'capacite',
          answer,
          preferredUnit: scale < 1e-6 ? 'nF' : 'µF',
          distractors: [{ value: other, code: 'EX', sub: 'association', label: 'règle d’association inversée' }],
        },
      ],
    };
  },
};

export const F4: ExerciseTemplate = {
  id: 'F4',
  level: 'facile',
  competences: ['C4'],
  testsErrors: ['E5', 'EX'],
  title: 'Constante de temps et durée de charge',
  formats: 'NUM ×2',
  source: `${SRC_COURS} §II.c ; Bac 2013 NS (2.4)`,
  generate(rng) {
    const { R, C, tau } = pickRC(rng, (r, c) => isClean(roundSig(5 * r * c)));
    return {
      title: 'Constante de temps',
      intro: `Un dipôle RC est formé d’un conducteur ohmique de résistance ${m(`R = ${tq(R, 'resistance')}`)} et d’un condensateur de capacité ${m(`C = ${tq(C, 'capacite')}`)}.`,
      figures: [],
      values: { R, C },
      generalHint: 'La constante de temps vaut $\\tau = RC$ (en secondes si R est en ohms et C en farads).',
      questions: [
        {
          kind: 'NUM',
          id: 'tau',
          prompt: 'Calcule la constante de temps $\\tau$.',
          quantity: 'temps',
          answer: tau,
          preferredUnit: 'ms',
          distractors: [],
        },
        {
          kind: 'NUM',
          id: 'duree',
          prompt: 'Au bout de quelle durée la charge est-elle pratiquement terminée ?',
          quantity: 'temps',
          answer: roundSig(5 * tau),
          preferredUnit: 'ms',
          distractors: [{ value: tau, code: 'E5', label: 'durée = τ' }],
          hint: 'Quelle durée faut-il pour que la charge soit pratiquement terminée, en nombre de $\\tau$ ?',
        },
      ],
    };
  },
};

export const F5: ExerciseTemplate = {
  id: 'F5',
  level: 'facile',
  competences: ['C1'],
  testsErrors: ['E1'],
  title: 'QCM : le condensateur',
  formats: 'QCM',
  source: 'Recherche (E1) – banque 7.6',
  generate(rng) {
    const id = pick(rng, ['Q-E1a', 'Q-E1b', 'Q-E1c', 'Q-E1d']);
    const b = bankOptions(id);
    return {
      title: 'QCM : le condensateur',
      intro: 'Choisis la bonne proposition.',
      figures: [],
      values: { item: id, ordre: Math.floor(rng() * 1000) },
      valueKey: `item=${id}`,
      generalHint: 'Entre les armatures, il y a un isolant : le diélectrique.',
      questions: [{ kind: 'QCM', id: 'qcm', prompt: b.prompt, options: shuffle(rng, b.options) }],
    };
  },
};

type Situation = 'charge-debut' | 'charge-fin' | 'decharge-debut' | 'decharge-fin';

export const F6: ExerciseTemplate = {
  id: 'F6',
  level: 'facile',
  competences: ['C5'],
  testsErrors: ['E3', 'E6'],
  title: 'Instants initial et final',
  formats: 'QCM',
  source: `${SRC_COURS} §VII ; AlloSchool ex. 2 (q. 4-5)`,
  generate(rng) {
    let E = 0;
    let R = 0;
    do {
      E = pick(rng, E_LIST);
      R = pick(rng, R_LIST.filter((r) => r >= 1e3));
    } while (!isClean(E / R) || sigFigs(E / R) > 2);
    const I = roundSig(E / R);
    const sit = pick(rng, ['charge-debut', 'charge-fin', 'decharge-debut', 'decharge-fin'] as Situation[]);
    const v = (u: string, i: string) => `$u_C = ${u}$ et $i = ${i}$`;
    const Etx = tq(E, 'tension');
    const Itx = tq(I, 'courant');
    const mItx = `-${Itx}`;
    const z = '0';
    const OPTIONS: Record<Situation, ChoiceOption[]> = {
      'charge-debut': [
        { id: 'ok', text: v(z, Itx), code: null, correct: true },
        { id: 'a', text: v(Etx, z), code: 'E3' },
        { id: 'b', text: v(z, z), code: 'E3' },
        { id: 'c', text: v(Etx, Itx), code: 'E3' },
      ],
      'charge-fin': [
        { id: 'ok', text: v(Etx, z), code: null, correct: true },
        { id: 'a', text: v(Etx, Itx), code: 'E3' },
        { id: 'b', text: v(z, z), code: 'E3' },
        { id: 'c', text: v(z, Itx), code: 'E3' },
      ],
      'decharge-debut': [
        { id: 'ok', text: v(Etx, mItx), code: null, correct: true },
        { id: 'a', text: v(Etx, Itx), code: 'E6' },
        { id: 'b', text: v(z, mItx), code: 'E3' },
        { id: 'c', text: v(Etx, z), code: 'E3' },
      ],
      'decharge-fin': [
        { id: 'ok', text: v(z, z), code: null, correct: true },
        { id: 'a', text: v(z, mItx), code: 'E3' },
        { id: 'b', text: v(Etx, z), code: 'E3' },
        { id: 'c', text: v(z, Itx), code: 'E3' },
      ],
    };
    const charge = sit.startsWith('charge');
    const debut = sit.endsWith('debut');
    const moment = charge
      ? debut
        ? 'Juste après la fermeture de K (position 1), le condensateur étant initialement déchargé'
        : 'Longtemps après la fermeture de K (position 1)'
      : debut
        ? 'Le condensateur est chargé sous $E$. Juste après le basculement de K en position 2'
        : 'Longtemps après le basculement de K en position 2';
    return {
      title: 'Instants initial et final',
      intro: `Le dipôle RC (${m(`R = ${tq(R, 'resistance')}`)}) est alimenté par un générateur de tension ${m(`E = ${Etx}`)}. Le courant $i$ est orienté dans le même sens pendant la charge et la décharge.`,
      figures: [{ kind: 'circuit', k: charge ? 1 : 2 }],
      values: { E, R, situation: sit },
      generalHint: '$u_C$ ne peut pas sauter d’un coup ; à la fin, plus aucun courant ne circule.',
      questions: [{ kind: 'QCM', id: 'qcm', prompt: `${moment}, que valent $u_C$ et $i$ ?`, options: shuffle(rng, OPTIONS[sit]) }],
    };
  },
};

/** Remédiation E2 : QCM Q-E2 (banque 7.6). */
export const QE2: ExerciseTemplate = {
  id: 'QE2',
  level: 'facile',
  competences: ['C1'],
  testsErrors: ['E2'],
  remediationOnly: true,
  title: 'QCM : la capacité',
  formats: 'QCM',
  source: 'Banque 7.6 (Q-E2)',
  generate(rng: Rng) {
    const id = pick(rng, ['Q-E2a', 'Q-E2b']);
    const b = bankOptions(id);
    return {
      title: 'QCM : la capacité',
      intro: 'Choisis la bonne proposition.',
      figures: [],
      values: { item: id },
      valueKey: `item=${id}`,
      generalHint: 'La capacité est une caractéristique du condensateur.',
      questions: [{ kind: 'QCM', id: 'qcm', prompt: b.prompt, options: shuffle(rng, b.options) }],
    };
  },
};

/** Remédiation E3 : QCM Q-E3 (banque 7.6). */
export const QE3: ExerciseTemplate = {
  id: 'QE3',
  level: 'facile',
  competences: ['C5'],
  testsErrors: ['E3'],
  remediationOnly: true,
  title: 'QCM : début et fin de la charge',
  formats: 'QCM',
  source: 'Banque 7.6 (Q-E3)',
  generate(rng: Rng) {
    const id = pick(rng, ['Q-E3a', 'Q-E3b']);
    const b = bankOptions(id);
    return {
      title: 'QCM : début et fin de la charge',
      intro: 'Choisis la bonne proposition.',
      figures: [{ kind: 'circuit', k: 1 }],
      values: { item: id },
      valueKey: `item=${id}`,
      generalHint: '$u_C$ ne peut pas sauter d’un coup.',
      questions: [{ kind: 'QCM', id: 'qcm', prompt: b.prompt, options: shuffle(rng, b.options) }],
    };
  },
};

export const FACILE: ExerciseTemplate[] = [F1, F2, F3, F4, F5, F6, QE2, QE3];
