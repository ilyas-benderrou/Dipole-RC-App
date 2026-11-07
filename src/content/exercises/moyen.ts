import { pick, shuffle } from '../../engine/rng';
import { ENERGY_RATIO_AT_TAU } from '../../physics/rc';
import { isClean, roundSig } from '../../physics/units';
import type { ChoiceOption, ExerciseTemplate } from './types';
import { C_LIST, E_LIST, R_LIST, m, pickRC, rcPlot, tauZones, tq } from './values';

const SRC_COURS = 'Cours « Dipôle RC » 2ème Bac SM';

type Grandeur = 'u' | 'q';
type Phase = 'charge' | 'decharge';

/** Équations différentielles (gabarit M1) : la bonne et ses distracteurs codés E4. */
export function equationOptions(g: Grandeur, phase: Phase): ChoiceOption[] {
  const x = g === 'u' ? 'u_C' : 'q';
  const d = `\\dfrac{d${x}}{dt}`;
  const rhs = g === 'u' ? 'E' : 'CE';
  if (phase === 'charge') {
    return [
      { id: 'ok', text: `RC\\,${d} + ${x} = ${rhs}`, code: null, correct: true },
      { id: 'c', text: g === 'u' ? `R\\,${d} + ${x} = E` : `RC\\,${d} + q = E`, code: 'E4' },
      { id: 'zero', text: `RC\\,${d} + ${x} = 0`, code: 'E4' },
      { id: 'sign', text: `RC\\,${d} - ${x} = ${rhs}`, code: 'E4' },
    ];
  }
  return [
    { id: 'ok', text: `RC\\,${d} + ${x} = 0`, code: null, correct: true },
    { id: 'c', text: `R\\,${d} + ${x} = 0`, code: 'E4' },
    { id: 'rhs', text: `RC\\,${d} + ${x} = ${rhs}`, code: 'E4' },
    { id: 'sign', text: `RC\\,${d} - ${x} = 0`, code: 'E4' },
  ];
}

/** Expressions de i(t) (gabarit M5) : la bonne et ses distracteurs codés E6 / E4. */
export function currentOptions(phase: Phase, U = 'E', R = 'R', shift = 't'): ChoiceOption[] {
  const e = `e^{-${shift}/\\tau}`;
  const frac = `\\dfrac{${U}}{${R}}`;
  if (phase === 'decharge') {
    return [
      { id: 'ok', text: `i = -${frac}\\,${e}`, code: null, correct: true },
      { id: 'sign', text: `i = ${frac}\\,${e}`, code: 'E6' },
      { id: 'one', text: `i = ${frac}\\left(1 - ${e}\\right)`, code: 'E4' },
      { id: 'mone', text: `i = -${frac}\\left(1 - ${e}\\right)`, code: 'E4' },
    ];
  }
  return [
    { id: 'ok', text: `i = ${frac}\\,${e}`, code: null, correct: true },
    { id: 'sign', text: `i = -${frac}\\,${e}`, code: 'E6' },
    { id: 'one', text: `i = ${frac}\\left(1 - ${e}\\right)`, code: 'E4' },
    { id: 'mone', text: `i = ${U}\\left(1 - ${e}\\right)`, code: 'E4' },
  ];
}

export const M1: ExerciseTemplate = {
  id: 'M1',
  level: 'moyen',
  competences: ['C2'],
  testsErrors: ['E4'],
  title: 'Équation différentielle',
  formats: 'EXPR',
  source: `${SRC_COURS} §II.a et §III.b ; Bac 2013 NS (1.2) ; Bac 2017 NS (1-3-1)`,
  generate(rng) {
    const g = pick(rng, ['u', 'q'] as Grandeur[]);
    const phase = pick(rng, ['charge', 'decharge'] as Phase[]);
    const what = g === 'u' ? 'la tension $u_C$' : 'la charge $q$';
    const when = phase === 'charge' ? 'pendant la charge (K en position 1, condensateur initialement déchargé)' : 'pendant la décharge (K en position 2, condensateur initialement chargé sous $E$)';
    return {
      title: 'Équation différentielle',
      intro: `On considère le dipôle RC ${when}.`,
      figures: [{ kind: 'circuit', k: phase === 'charge' ? 1 : 2 }],
      values: { grandeur: g, phase },
      valueKey: `g=${g};p=${phase}`,
      generalHint: 'Loi d’additivité des tensions, puis $u_R = R\\,i$ et $i = C\\,\\dfrac{du_C}{dt}$ (ou $i = \\dfrac{dq}{dt}$, $u_C = \\dfrac{q}{C}$).',
      questions: [{ kind: 'EXPR', id: 'eq', prompt: `Quelle est l’équation différentielle vérifiée par ${what} ?`, options: shuffle(rng, equationOptions(g, phase)) }],
    };
  },
};

export const M2: ExerciseTemplate = {
  id: 'M2',
  level: 'moyen',
  competences: ['C3'],
  testsErrors: ['E4', 'EX'],
  title: 'Constantes de la solution',
  formats: 'NUM ×2',
  source: `${SRC_COURS} §II.b ; Bac 2013 NS (2.2) ; AlloSchool ex. 1`,
  generate(rng) {
    const phase = pick(rng, ['charge', 'decharge'] as Phase[]);
    const E = pick(rng, E_LIST);
    if (phase === 'charge') {
      const { R, C, tau } = pickRC(rng);
      return {
        title: 'Constantes de la solution (charge)',
        intro: `Pendant la charge du condensateur (initialement déchargé), la solution de l’équation différentielle s’écrit ${m('u_C = A\\,e^{-t/\\tau} + B')}. La courbe ci-dessous représente ${m('u_C(t)')}.`,
        figures: [{ kind: 'plot', plot: rcPlot({ E, tau, kind: 'charge', xMaxTau: 6 }) }],
        values: { phase, E, R, C },
        generalHint: 'Utilise la valeur atteinte en régime permanent ($t \\to \\infty$) et la condition initiale $u_C(0) = 0$.',
        questions: [
          {
            kind: 'NUM',
            id: 'A',
            prompt: 'Donne la valeur de $A$.',
            quantity: 'tension',
            answer: -E,
            preferredUnit: 'V',
            distractors: [
              { value: E, code: 'E4', label: 'A = E' },
              { value: 0, code: 'E4', label: 'A = 0' },
            ],
            hint: 'Quelle est la condition initiale $u_C(0)$ ? Remplace $t$ par 0 dans la solution.',
          },
          {
            kind: 'NUM',
            id: 'B',
            prompt: 'Donne la valeur de $B$.',
            quantity: 'tension',
            answer: E,
            preferredUnit: 'V',
            distractors: [
              { value: 0, code: 'E4', label: 'B = 0' },
              { value: -E, code: 'E4', label: 'B = −E' },
            ],
            hint: 'Que vaut $u_C$ quand $t \\to \\infty$ ?',
          },
        ],
      };
    }
    const { R, C, tau } = pickRC(rng, (r, c) => isClean(roundSig(1 / (r * c))));
    const alpha = roundSig(1 / tau);
    return {
      title: 'Constantes de la solution (décharge)',
      intro: `Le condensateur, chargé sous ${m(`E = ${tq(E, 'tension')}`)}, se décharge dans un conducteur ohmique de résistance ${m(`R = ${tq(R, 'resistance')}`)} ; ${m(`C = ${tq(C, 'capacite')}`)}. La solution s’écrit ${m('u_C = A\\,e^{-\\alpha t}')}.`,
      figures: [{ kind: 'plot', plot: rcPlot({ E, tau, kind: 'decharge', xMaxTau: 6 }) }],
      values: { phase, E, R, C },
      generalHint: 'Utilise la condition initiale pour $A$, et l’équation différentielle pour $\\alpha$.',
      questions: [
        {
          kind: 'NUM',
          id: 'A',
          prompt: 'Donne la valeur de $A$.',
          quantity: 'tension',
          answer: E,
          preferredUnit: 'V',
          distractors: [
            { value: 0, code: 'E4', label: 'A = 0' },
            { value: -E, code: 'E4', label: 'A = −E' },
          ],
          hint: 'Quelle est la condition initiale $u_C(0)$ ?',
        },
        {
          kind: 'NUM',
          id: 'alpha',
          prompt: 'Donne la valeur de $\\alpha$.',
          quantity: 'inverse_temps',
          answer: alpha,
          distractors: [{ value: tau, code: 'E4', label: 'α = τ' }],
          hint: 'Remplace $u_C = A\\,e^{-\\alpha t}$ dans $RC\\,\\dfrac{du_C}{dt} + u_C = 0$.',
        },
      ],
    };
  },
};

export const M3: ExerciseTemplate = {
  id: 'M3',
  level: 'moyen',
  competences: ['C4'],
  testsErrors: ['E5'],
  title: 'Lecture graphique de τ',
  formats: 'COURBE',
  source: `${SRC_COURS} §II.c et §III.d ; AlloSchool ex. 1 (q. 4)`,
  generate(rng) {
    const phase = pick(rng, ['charge', 'decharge'] as Phase[]);
    const E = pick(rng, E_LIST);
    const { R, C, tau } = pickRC(rng);
    return {
      title: `Lecture graphique de τ (${phase === 'charge' ? 'charge' : 'décharge'})`,
      intro: `La courbe représente la tension ${m('u_C(t)')} aux bornes du condensateur pendant ${phase === 'charge' ? 'sa charge sous' : 'sa décharge, après une charge sous'} ${m(`E = ${tq(E, 'tension')}`)}.`,
      figures: [{ kind: 'plot', plot: rcPlot({ E, tau, kind: phase, xMaxTau: 5 }) }],
      values: { phase, E, R, C },
      generalHint: 'À $t = \\tau$, $u_C$ a fait 63 % du chemin ; tu peux aussi utiliser la tangente à l’origine.',
      questions: [
        {
          kind: 'COURBE',
          id: 'tau',
          prompt: 'Détermine graphiquement la constante de temps $\\tau$ : clique sur la courbe à l’instant $t = \\tau$ (ou saisis la valeur lue).',
          answer: tau,
          origin: 0,
          zones: tauZones(phase),
        },
      ],
    };
  },
};

export const M4: ExerciseTemplate = {
  id: 'M4',
  level: 'moyen',
  competences: ['C4'],
  testsErrors: ['E2', 'EX'],
  title: 'Capacité à partir de τ',
  formats: 'NUM',
  source: 'Bac 2014 NS (1.4) ; AlloSchool ex. 1 (q. 5)',
  generate(rng) {
    const { R, C, tau } = pickRC(rng);
    const findC = rng() < 0.6;
    if (findC) {
      return {
        title: 'Capacité à partir de τ',
        intro: `La constante de temps d’un dipôle RC vaut ${m(`\\tau = ${tq(tau, 'temps')}`)} ; la résistance du conducteur ohmique est ${m(`R = ${tq(R, 'resistance')}`)}.`,
        figures: [],
        values: { tau, R, inconnue: 'C' } as Record<string, number | string>,
        generalHint: 'Utilise $\\tau = RC$ et isole la grandeur cherchée.',
        questions: [
          {
            kind: 'NUM',
            id: 'C',
            prompt: 'Calcule la capacité $C$.',
            quantity: 'capacite',
            answer: C,
            preferredUnit: C < 1e-6 ? 'nF' : 'µF',
            distractors: [
              { value: R / tau, code: 'E2', label: 'R/τ' },
              { value: tau * R, code: 'EX', sub: 'calcul', label: 'τ·R' },
            ],
          },
        ],
      };
    }
    return {
      title: 'Résistance à partir de τ',
      intro: `La constante de temps d’un dipôle RC vaut ${m(`\\tau = ${tq(tau, 'temps')}`)} ; la capacité du condensateur est ${m(`C = ${tq(C, 'capacite')}`)}.`,
      figures: [],
      values: { tau, C, inconnue: 'R' } as Record<string, number | string>,
      generalHint: 'Utilise $\\tau = RC$ et isole la grandeur cherchée.',
      questions: [
        {
          kind: 'NUM',
          id: 'R',
          prompt: 'Calcule la résistance $R$ du conducteur ohmique.',
          quantity: 'resistance',
          answer: R,
          preferredUnit: R >= 1e3 ? 'kΩ' : 'Ω',
          distractors: [
            { value: C / tau, code: 'E2', label: 'C/τ' },
            { value: tau * C, code: 'EX', sub: 'calcul', label: 'τ·C' },
          ],
        },
      ],
    };
  },
};

export const M5: ExerciseTemplate = {
  id: 'M5',
  level: 'moyen',
  competences: ['C5'],
  testsErrors: ['E3', 'E4', 'E6'],
  title: 'Expression et valeur initiale de i',
  formats: 'EXPR + NUM',
  source: `${SRC_COURS} §II.d et §III.e ; Bac 2013 NS (1.3)`,
  generate(rng) {
    const phase = pick(rng, ['charge', 'decharge'] as Phase[]);
    let E = 0;
    let R = 0;
    do {
      E = pick(rng, E_LIST);
      R = pick(rng, R_LIST);
    } while (!isClean(E / R));
    const I0 = roundSig(E / R);
    const ans = phase === 'decharge' ? -I0 : I0;
    return {
      title: `Le courant pendant la ${phase === 'charge' ? 'charge' : 'décharge'}`,
      intro:
        phase === 'decharge'
          ? `Un condensateur chargé sous ${m(`E = ${tq(E, 'tension')}`)} se décharge (K en position 2) dans un conducteur ohmique de résistance ${m(`R = ${tq(R, 'resistance')}`)}. Le courant $i$ garde l’orientation de la charge.`
          : `Un condensateur initialement déchargé se charge (K en position 1) sous ${m(`E = ${tq(E, 'tension')}`)} à travers un conducteur ohmique de résistance ${m(`R = ${tq(R, 'resistance')}`)}.`,
      figures: [{ kind: 'circuit', k: phase === 'charge' ? 1 : 2 }],
      values: { phase, E, R },
      generalHint: 'Utilise $i = C\\,\\dfrac{du_C}{dt}$ avec l’expression de $u_C(t)$, et fais attention au signe.',
      questions: [
        { kind: 'EXPR', id: 'expr', prompt: 'Quelle est l’expression de $i(t)$ ?', options: shuffle(rng, currentOptions(phase)) },
        {
          kind: 'NUM',
          id: 'i0',
          prompt: `Calcule $i$ juste après ${phase === 'charge' ? 'la fermeture de K' : 'le basculement'} ($t = 0^+$).`,
          quantity: 'courant',
          answer: ans,
          preferredUnit: 'mA',
          distractors: [
            { value: 0, code: 'E3', label: 'i(0⁺) = 0' },
            { value: -ans, code: 'E6', label: 'signe opposé' },
          ],
        },
      ],
    };
  },
};

export const M6: ExerciseTemplate = {
  id: 'M6',
  level: 'moyen',
  competences: ['C6'],
  testsErrors: ['E5', 'EX'],
  title: 'Énergie emmagasinée',
  formats: 'NUM',
  source: `${SRC_COURS} §III ; Bac 2014 NS (1.5)`,
  generate(rng) {
    let C = 0;
    let E = 0;
    do {
      C = pick(rng, C_LIST.filter((c) => c >= 1e-6));
      E = pick(rng, E_LIST);
    } while (!isClean(0.5 * C * E * E));
    const ratio = rng() < 0.3;
    if (ratio) {
      return {
        title: 'Énergie à t = τ',
        intro: `Un condensateur de capacité ${m(`C = ${tq(C, 'capacite')}`)}, initialement déchargé, se charge sous ${m(`E = ${tq(E, 'tension')}`)}.`,
        figures: [],
        values: { C, E, variante: 'rapport' },
        generalHint: 'Exprime $u_C(\\tau)$ en fonction de $E$, puis utilise $E_e = \\tfrac12\\,C\\,u_C^2$.',
        questions: [
          {
            kind: 'NUM',
            id: 'ratio',
            prompt: 'Calcule le rapport $\\dfrac{E_e(\\tau)}{E_{e,\\max}}$ (deux chiffres significatifs).',
            quantity: 'ratio',
            answer: ENERGY_RATIO_AT_TAU,
            approximate: true,
            distractors: [
              { value: 1 - Math.exp(-1), code: 'E5', label: '0,63' },
              { value: Math.exp(-1), code: 'E5', label: '0,37' },
            ],
          },
        ],
      };
    }
    return {
      title: 'Énergie emmagasinée',
      intro: `Un condensateur de capacité ${m(`C = ${tq(C, 'capacite')}`)} est chargé sous la tension ${m(`E = ${tq(E, 'tension')}`)}.`,
      figures: [],
      values: { C, E, variante: 'energie' },
      generalHint: 'L’énergie emmagasinée vaut $E_e = \\tfrac12\\,C\\,u_C^2$.',
      questions: [
        {
          kind: 'NUM',
          id: 'Ee',
          prompt: 'Calcule l’énergie emmagasinée en fin de charge.',
          quantity: 'energie',
          answer: roundSig(0.5 * C * E * E),
          preferredUnit: 'mJ',
          distractors: [
            { value: C * E * E, code: 'EX', sub: 'energie', label: 'sans le ½' },
            { value: 0.5 * C * E, code: 'EX', sub: 'energie', label: 'sans le carré' },
            { value: C * E, code: 'EX', sub: 'energie', label: 'C·E' },
          ],
        },
      ],
    };
  },
};

export const MOYEN: ExerciseTemplate[] = [M1, M2, M3, M4, M5, M6];
