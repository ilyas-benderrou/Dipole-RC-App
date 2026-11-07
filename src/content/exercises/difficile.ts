import { pick, shuffle } from '../../engine/rng';
import { isClean, niceStep, roundSig } from '../../physics/units';
import { currentOptions, equationOptions } from './moyen';
import type { ChoiceOption, ExerciseTemplate, PlotSpec } from './types';
import { E_LIST, R_LIST, m, pickRC, rcPlot, sampleFn, tauZones, timeAxisUnit, tq } from './values';

const ZONES_CHARGE = tauZones('charge');
const ZONES_DECHARGE = tauZones('decharge');

/** Distracteurs communs pour « C = τ/R » (ou « R = τ/C »). */
const divDistractors = (num: number, den: number) => [
  { value: den / num, code: 'E2' as const, label: 'inverse' },
  { value: num * den, code: 'EX' as const, sub: 'calcul' as const, label: 'produit' },
];

const CONTINUITY: ChoiceOption[] = [
  { id: 'ok', text: '$u_C$ est continue ; $i$ est discontinue', code: null, correct: true },
  { id: 'a', text: '$u_C$ et $i$ sont continues', code: 'E3' },
  { id: 'b', text: '$u_C$ est discontinue ; $i$ est continue', code: 'E3' },
  { id: 'c', text: '$u_C$ et $i$ sont discontinues', code: 'E3' },
];

export const D1: ExerciseTemplate = {
  id: 'D1',
  level: 'difficile',
  competences: ['C1', 'C2', 'C5'],
  testsErrors: ['E2', 'E3', 'E4', 'E6'],
  title: 'Charge à courant constant puis décharge',
  formats: 'ÉTAPES',
  source: 'Examen national du baccalauréat 2013 – session normale (adapté)',
  generate(rng) {
    const C = pick(rng, [0.1, 0.2]);
    const R = pick(rng, [5, 10, 20]);
    const Umax = 2.25;
    const k = pick(rng, [0.25, 0.5, 0.75]);
    const ta = roundSig(Umax / k);
    const t1 = roundSig(ta + pick(rng, [2, 3]));
    const tau = roundSig(R * C);
    const xMax = Math.ceil(t1 + 5 * tau);
    const I0 = roundSig(C * k);
    const f = (t: number) => (t <= ta ? k * t : t <= t1 ? Umax : Umax * Math.exp(-(t - t1) / tau));
    const plot: PlotSpec = {
      xLabel: 't',
      yLabel: 'u_C',
      xUnit: { label: 's', factor: 1 },
      yUnit: { label: 'V', factor: 1 },
      xMax,
      yMin: 0,
      yMax: 2.75,
      xStep: niceStep(xMax, 8),
      yStep: 0.25,
      xMinor: niceStep(xMax, 8) / 2,
      series: [{ points: [...sampleFn(f, 0, t1, 120), ...sampleFn(f, t1, xMax, 160)], color: '#1F6FD1', label: 'u_C' }],
      labels: [
        { x: ta * 0.45, y: k * ta * 0.45 + 0.35, text: '(a)' },
        { x: (ta + t1) / 2, y: Umax + 0.2, text: '(b)' },
        { x: t1 + tau * 1.2, y: Umax * Math.exp(-1.2) + 0.35, text: '(c)' },
      ],
    };
    return {
      title: 'Charge à courant constant puis décharge',
      intro: `Un générateur idéal de courant d’intensité $I_0$ charge un condensateur de capacité ${m(`C = ${tq(C, 'capacite')}`)} (K en position 1). À l’instant ${m(`t_1 = ${tq(t1, 'temps')}`)}, on bascule K en position 2 : le condensateur se décharge dans un conducteur ohmique de résistance ${m(`R = ${tq(R, 'resistance')}`)}. La courbe montre trois parties : (a) une droite, (b) un palier ${m(`U_{max} = 2{,}25\\,\\text{V}`)}, (c) une décroissance exponentielle à partir de $t_1$.`,
      figures: [{ kind: 'currentSource' }, { kind: 'plot', plot }],
      values: { C, R, k, t1 },
      generalHint: 'Traite chaque partie de la courbe séparément.',
      questions: [
        {
          kind: 'QCM',
          id: 'parties',
          prompt: 'Associe chaque partie de la courbe à la position de l’interrupteur K.',
          options: shuffle(rng, [
            { id: 'ok', text: '(a) et (b) : K en position 1 ; (c) : K en position 2', code: null, correct: true },
            { id: 'a', text: '(a) : K en position 1 ; (b) et (c) : K en position 2', code: 'E3' },
            { id: 'b', text: '(a) : K en position 2 ; (b) et (c) : K en position 1', code: 'E3' },
            { id: 'c', text: '(a) : K en position 1 ; (b) : K en position 2 ; (c) : K en position 1', code: 'E3' },
          ]),
          hint: 'Pendant le palier, $u_C$ reste constante : le condensateur se décharge-t-il ?',
        },
        {
          kind: 'NUM',
          id: 'I0',
          prompt: 'À partir de la pente $k$ de la partie (a), calcule l’intensité $I_0$.',
          quantity: 'courant',
          answer: I0,
          preferredUnit: 'mA',
          distractors: [
            { value: k / C, code: 'E2', label: 'k/C' },
            { value: C / k, code: 'E2', label: 'C/k' },
          ],
          hint: 'Lis la pente $k$ de la droite, puis relie $q = I_0\\,t$ et $q = C\\,u_C$.',
        },
        {
          kind: 'EXPR',
          id: 'eq',
          prompt: 'Quelle est l’équation différentielle vérifiée par la charge $q$ pendant la décharge ?',
          options: shuffle(rng, equationOptions('q', 'decharge')),
        },
        {
          kind: 'EXPR',
          id: 'i',
          prompt: 'Sachant que $u_C = U_{max}\\,e^{-(t - t_1)/\\tau}$, quelle est l’expression de $i(t)$ pendant la décharge (même orientation que pendant la charge) ?',
          options: shuffle(rng, currentOptions('decharge', 'U_{max}', 'R', '(t-t_1)')),
        },
      ],
    };
  },
};

export const D2: ExerciseTemplate = {
  id: 'D2',
  level: 'difficile',
  competences: ['C1', 'C4', 'C5'],
  testsErrors: ['E2', 'E3', 'E5', 'EX'],
  title: 'Deux condensateurs en série',
  formats: 'ÉTAPES',
  source: 'Examen national du baccalauréat 2016 – session de rattrapage (adapté)',
  generate(rng) {
    const [c1, c2] = pick(rng, [
      [6, 3],
      [2, 2],
    ] as [number, number][]);
    const C1 = c1 * 1e-6;
    const C2 = c2 * 1e-6;
    const R = pick(rng, [1e3, 3e3, 5e3]);
    const E = pick(rng, [6, 9, 12]);
    const Ce = roundSig((C1 * C2) / (C1 + C2));
    const tau = roundSig(R * Ce);
    const u2 = roundSig((E * C1) / (C1 + C2));
    const u1 = roundSig((E * C2) / (C1 + C2));
    const xMax = roundSig(5 * tau);
    const xStep = niceStep(xMax, 5);
    const plot: PlotSpec = {
      xLabel: 't',
      yLabel: 'u',
      xUnit: timeAxisUnit(xMax),
      yUnit: { label: 'V', factor: 1 },
      xMax,
      yMin: 0,
      yMax: Math.ceil((E * 1.1) / niceStep(E, 5)) * niceStep(E, 5),
      xStep,
      yStep: niceStep(E, 5),
      xMinor: xStep / 5,
      yMinor: niceStep(E, 5) / 5,
      series: [
        { points: sampleFn((t) => u2 * (1 - Math.exp(-t / tau)), 0, xMax), color: '#1F6FD1', label: 'u₂' },
        { points: sampleFn((t) => E * Math.exp(-t / tau), 0, xMax), color: '#8b5cf6', label: 'u_R' },
      ],
      lines: [{ x1: 0, y1: E, x2: tau, y2: 0, dashed: true, color: '#64748b', label: 'tangente' }],
    };
    return {
      title: 'Deux condensateurs en série',
      intro: `Deux condensateurs de capacités $C_1$ (inconnue) et ${m(`C_2 = ${tq(C2, 'capacite')}`)}, initialement déchargés, sont montés en série avec un conducteur ohmique de résistance ${m(`R = ${tq(R, 'resistance')}`)} et un générateur de tension ${m(`E = ${tq(E, 'tension')}`)}. On enregistre $u_2(t)$ (aux bornes de $C_2$) et $u_R(t)$ ; la tangente à l’origine de $u_R(t)$ est tracée.`,
      figures: [
        { kind: 'seriesRC', c1: 'C_1', c2: 'C_2', r: 'R', e: 'E' },
        { kind: 'plot', plot },
      ],
      values: { C1, C2, R, E },
      generalHint: 'Les deux condensateurs en série portent la même charge $q$.',
      questions: [
        {
          kind: 'QCM',
          id: 'Ce-expr',
          prompt: 'Quelle est l’expression de la capacité équivalente $C_e$ des deux condensateurs en série ?',
          options: shuffle(rng, [
            { id: 'ok', text: '$C_e = \\dfrac{C_1 C_2}{C_1 + C_2}$', code: null, correct: true },
            { id: 'a', text: '$C_e = C_1 + C_2$', code: 'EX', sub: 'association' },
            { id: 'b', text: '$C_e = \\dfrac{C_1 + C_2}{C_1 C_2}$', code: 'EX', sub: 'association' },
            { id: 'c', text: '$\\dfrac{1}{C_e} = C_1 + C_2$', code: 'EX', sub: 'association' },
          ]),
        },
        {
          kind: 'COURBE',
          id: 'tau',
          prompt: 'Lis la constante de temps $\\tau$ à l’aide de la tangente à l’origine de $u_R(t)$ (clique sur la courbe ou saisis la valeur).',
          answer: tau,
          origin: 0,
          zones: ZONES_DECHARGE,
          figure: 1,
          hint: 'La tangente à l’origine coupe l’asymptote (ici l’axe des temps) à $t = \\tau$.',
        },
        {
          kind: 'NUM',
          id: 'Ce',
          prompt: 'En déduis la capacité équivalente $C_e$.',
          quantity: 'capacite',
          answer: Ce,
          preferredUnit: 'µF',
          distractors: divDistractors(tau, R),
          hint: 'Utilise $\\tau = R\\,C_e$.',
        },
        {
          kind: 'NUM',
          id: 'u2',
          prompt: 'En régime permanent, que vaut $u_2$ ?',
          quantity: 'tension',
          answer: u2,
          preferredUnit: 'V',
          distractors: [
            { value: E, code: 'E3', label: 'u₂ = E' },
            { value: 0, code: 'E3', label: 'u₂ = 0' },
          ],
          hint: 'Lis la valeur finale de $u_2$ sur la courbe : en régime permanent, $u_R = 0$.',
        },
        {
          kind: 'NUM',
          id: 'u1',
          prompt: 'En régime permanent, que vaut $u_1$ (aux bornes de $C_1$) ?',
          quantity: 'tension',
          answer: u1,
          preferredUnit: 'V',
          distractors: [
            { value: E, code: 'E3', label: 'u₁ = E' },
            { value: 0, code: 'E3', label: 'u₁ = 0' },
          ],
          hint: 'Loi d’additivité en régime permanent : $u_1 + u_2 + u_R = E$ avec $u_R = 0$.',
        },
        {
          kind: 'NUM',
          id: 'C1',
          prompt: 'En déduis $C_1$.',
          quantity: 'capacite',
          answer: C1,
          preferredUnit: 'µF',
          distractors: [
            { value: (C2 * u1) / u2, code: 'E2', label: 'C₂·u₁/u₂' },
            { value: Ce, code: 'E2', label: 'C_e' },
          ],
          hint: 'Les deux condensateurs portent la même charge : $q_1 = q_2$, soit $C_1 u_1 = C_2 u_2$.',
        },
      ],
    };
  },
};

export const D3: ExerciseTemplate = {
  id: 'D3',
  level: 'difficile',
  competences: ['C2', 'C4', 'C6'],
  testsErrors: ['E2', 'E4', 'E5', 'EX'],
  title: 'Courbe ln(u_C) = f(t)',
  formats: 'ÉTAPES',
  source: 'Examen national du baccalauréat 2017 – session normale (adapté)',
  generate(rng) {
    const D3_R = [100e3, 200e3, 220e3, 470e3, 500e3];
    let C = 0;
    let R = 0;
    let tau = 0;
    do {
      C = pick(rng, [10e-9, 20e-9, 47e-9]);
      R = pick(rng, D3_R);
      tau = roundSig(R * C);
    } while (!isClean(tau) || !isClean(roundSig(tau / 2)) || tau < 1e-3);
    const U0 = pick(rng, E_LIST);
    const ln0 = Math.log(U0);
    const xMax = roundSig(2 * tau);
    const xStep = niceStep(xMax, 4);
    const yMin = Math.floor((ln0 - 2.2) * 2) / 2;
    const yMax = Math.ceil((ln0 + 0.3) * 2) / 2;
    const plot: PlotSpec = {
      xLabel: 't',
      yLabel: 'ln(u_C)',
      xUnit: timeAxisUnit(xMax),
      yUnit: { label: '', factor: 1 },
      xMax,
      yMin,
      yMax,
      xStep,
      yStep: 0.5,
      xMinor: xStep / 5,
      yMinor: 0.1,
      series: [{ points: sampleFn((t) => ln0 - t / tau, 0, xMax, 10), color: '#1F6FD1', label: 'ln(u_C)' }],
    };
    return {
      title: 'Courbe ln(u_C) = f(t)',
      intro: `Un condensateur de capacité ${m(`C = ${tq(C, 'capacite')}`)}, chargé sous la tension $U_0$, se décharge dans un conducteur ohmique de résistance $R$. On donne la droite ${m('\\ln(u_C) = f(t)')} ($u_C$ en volts) : son ordonnée à l’origine vaut ${m('\\ln U_0')} et sa pente ${m('-1/\\tau')}.`,
      figures: [{ kind: 'plot', plot }],
      values: { C, R, U0 },
      generalHint: 'Comme $u_C = U_0\\,e^{-t/\\tau}$, on a $\\ln(u_C) = \\ln U_0 - \\dfrac{t}{\\tau}$.',
      questions: [
        { kind: 'EXPR', id: 'eq', prompt: 'Quelle est l’équation différentielle vérifiée par $u_C$ pendant la décharge ?', options: shuffle(rng, equationOptions('u', 'decharge')) },
        {
          kind: 'NUM',
          id: 'tau',
          prompt: 'Déduis de la pente la constante de temps $\\tau$.',
          quantity: 'temps',
          answer: tau,
          preferredUnit: 'ms',
          distractors: [
            { value: 1 / tau, code: 'E5', label: 'τ = |pente|' },
            { value: -1 / tau, code: 'E5', label: 'τ = pente' },
          ],
          hint: 'La pente vaut $-1/\\tau$ : calcule-la avec deux points de la droite.',
        },
        {
          kind: 'NUM',
          id: 'U0',
          prompt: 'Déduis de l’ordonnée à l’origine la tension $U_0$.',
          quantity: 'tension',
          answer: U0,
          preferredUnit: 'V',
          distractors: [],
          hint: 'L’ordonnée à l’origine vaut $\\ln U_0$ : utilise la fonction exponentielle.',
        },
        {
          kind: 'NUM',
          id: 'R',
          prompt: 'Calcule la résistance $R$ du conducteur ohmique.',
          quantity: 'resistance',
          answer: R,
          preferredUnit: 'kΩ',
          distractors: divDistractors(tau, C),
          hint: 'Utilise $\\tau = RC$.',
        },
        {
          kind: 'NUM',
          id: 't1',
          prompt: 'Trouve la date $t_1$ à laquelle l’énergie emmagasinée vaut 37 % de sa valeur initiale.',
          quantity: 'temps',
          answer: roundSig(tau / 2),
          preferredUnit: 'ms',
          distractors: [{ value: tau, code: 'E5', label: 't₁ = τ' }],
          hint: 'L’énergie est proportionnelle à $u_C^2$ : $E_e(t) = E_e(0)\\,e^{-2t/\\tau}$.',
        },
      ],
    };
  },
};

export const D4: ExerciseTemplate = {
  id: 'D4',
  level: 'difficile',
  competences: ['C4', 'C5'],
  testsErrors: ['E2', 'E3', 'E5', 'EX'],
  title: 'Charge par R₁, décharge par R₂',
  formats: 'ÉTAPES',
  source: 'Séance 10 « Dipôle RC » – AlloSchool, exercice 2 (adapté)',
  generate(rng) {
    let R1 = 0;
    let C = 0;
    let R2 = 0;
    let tau1 = 0;
    let tau2 = 0;
    do {
      R1 = pick(rng, [20, 50, 100]);
      C = pick(rng, [100e-6, 220e-6, 470e-6]);
      R2 = R1 * pick(rng, [2, 3, 4, 5]);
      tau1 = roundSig(R1 * C);
      tau2 = roundSig(R2 * C);
    } while (!isClean(tau1) || !isClean(tau2) || tau1 < 1e-3 || tau2 > 10);
    const U = pick(rng, E_LIST);
    const ts = roundSig(7 * tau1);
    const xMax = roundSig(ts + 5 * tau2);
    const f = (t: number) => (t <= ts ? U * (1 - Math.exp(-t / tau1)) : U * (1 - Math.exp(-ts / tau1)) * Math.exp(-(t - ts) / tau2));
    const xStep = niceStep(xMax, 8);
    const yStep = niceStep(U, 5);
    const plot: PlotSpec = {
      xLabel: 't',
      yLabel: 'u_C',
      xUnit: timeAxisUnit(xMax),
      yUnit: { label: 'V', factor: 1 },
      xMax,
      yMin: 0,
      yMax: Math.ceil((U * 1.15) / yStep) * yStep,
      xStep,
      yStep,
      xMinor: xStep / 5,
      yMinor: yStep / 5,
      scope: true,
      series: [{ points: [...sampleFn(f, 0, ts, 160), ...sampleFn(f, ts, xMax, 200)], color: '#f4d35e', label: 'u_C' }],
      lines: [
        { x1: 0, y1: 0, x2: tau1, y2: U, dashed: true, color: '#9fe7e1' },
        { x1: ts, y1: U, x2: ts + tau2, y2: 0, dashed: true, color: '#9fe7e1' },
        { x1: 0, y1: U, x2: xMax, y2: U, dashed: true, color: 'rgba(255,255,255,0.35)' },
      ],
    };
    return {
      title: 'Charge par R₁, décharge par R₂',
      intro: `Un condensateur de capacité $C$ se charge à travers un conducteur ohmique de résistance ${m(`R_1 = ${tq(R1, 'resistance')}`)}, puis, à l’instant ${m(`t_s = ${tq(ts, 'temps')}`)}, se décharge à travers un conducteur ohmique de résistance $R_2$. L’oscillogramme montre $u_C(t)$ et les tangentes au début de la charge et au début de la décharge.`,
      figures: [{ kind: 'plot', plot }],
      values: { R1, C, R2, U },
      generalHint: 'La tangente au début d’une charge ou d’une décharge coupe l’asymptote une constante de temps plus tard.',
      questions: [
        { kind: 'NUM', id: 'U', prompt: 'Lis la tension $U$ du générateur.', quantity: 'tension', answer: U, preferredUnit: 'V', distractors: [], hint: 'C’est la valeur atteinte à la fin de la charge.' },
        {
          kind: 'COURBE',
          id: 'tau1',
          prompt: 'Avec la tangente au début de la charge, détermine $\\tau_1$ (clique sur la courbe ou saisis la valeur).',
          answer: tau1,
          origin: 0,
          zones: ZONES_CHARGE,
        },
        { kind: 'NUM', id: 'C', prompt: 'En déduis la capacité $C$.', quantity: 'capacite', answer: C, preferredUnit: 'µF', distractors: divDistractors(tau1, R1), hint: 'Utilise $\\tau_1 = R_1\\,C$.' },
        {
          kind: 'COURBE',
          id: 'tau2',
          prompt: 'Avec la tangente au début de la décharge, détermine $\\tau_2$ (durée mesurée depuis le basculement, à $t_s$).',
          answer: tau2,
          origin: ts,
          zones: ZONES_DECHARGE,
        },
        { kind: 'NUM', id: 'R2', prompt: 'En déduis la résistance $R_2$.', quantity: 'resistance', answer: R2, preferredUnit: 'Ω', distractors: divDistractors(tau2, C), hint: 'Utilise $\\tau_2 = R_2\\,C$.' },
        { kind: 'QCM', id: 'continuite', prompt: 'Au basculement, $u_C$ présente-t-elle une discontinuité ? Et $i$ ?', options: shuffle(rng, CONTINUITY) },
      ],
    };
  },
};

const D5_PAIRS: [number, number][] = [
  [2.2, 4.7],
  [4.7, 10],
  [10, 22],
  [10, 47],
  [22, 47],
  [22, 100],
  [47, 100],
  [47, 220],
  [100, 220],
  [100, 470],
];

export const D5: ExerciseTemplate = {
  id: 'D5',
  level: 'difficile',
  competences: ['C1', 'C4'],
  testsErrors: ['E2', 'E5', 'EX'],
  title: 'Deux dipôles RC',
  formats: 'ÉTAPES',
  source: 'Séance 10 « Dipôle RC » – AlloSchool, exercice 3 (adapté)',
  generate(rng) {
    let C1 = 0;
    let C2 = 0;
    let R = 0;
    let t1 = 0;
    let t2 = 0;
    do {
      const [a, b] = pick(rng, D5_PAIRS);
      C1 = roundSig(a * 1e-6);
      C2 = roundSig(b * 1e-6);
      R = pick(rng, R_LIST);
      t1 = roundSig(R * C1);
      t2 = roundSig(R * C2);
    } while (!isClean(t1) || !isClean(t2) || t1 < 1e-3 || t2 > 10);
    const E = pick(rng, E_LIST);
    const xMax = roundSig(2.5 * t2);
    const xStep = niceStep(xMax, 6);
    const yStep = niceStep(E, 5);
    const plot: PlotSpec = {
      xLabel: 't',
      yLabel: 'u_C',
      xUnit: timeAxisUnit(xMax),
      yUnit: { label: 'V', factor: 1 },
      xMax,
      yMin: 0,
      yMax: Math.ceil((E * 1.1) / yStep) * yStep,
      xStep,
      yStep,
      xMinor: xStep / 5,
      yMinor: yStep / 5,
      series: [
        { points: sampleFn((t) => E * (1 - Math.exp(-t / t1)), 0, xMax, 260), color: '#1F6FD1', label: '(1)' },
        { points: sampleFn((t) => E * (1 - Math.exp(-t / t2)), 0, xMax, 260), color: '#0f7c7c', label: '(2)' },
      ],
    };
    return {
      title: 'Deux dipôles RC',
      intro: `Deux condensateurs de capacités $C_1$ et $C_2$, initialement déchargés, sont chargés chacun sous ${m(`E = ${tq(E, 'tension')}`)} à travers le même conducteur ohmique de résistance ${m(`R = ${tq(R, 'resistance')}`)}. On enregistre $u_{C1}(t)$ (courbe 1) et $u_{C2}(t)$ (courbe 2).`,
      figures: [{ kind: 'plot', plot }],
      values: { C1, C2, R, E },
      generalHint: 'Une charge n’est pratiquement terminée qu’après environ 5τ.',
      questions: [
        {
          kind: 'QCM',
          id: 'charges',
          prompt: 'À la fin de l’enregistrement, les deux condensateurs sont-ils chargés ?',
          options: shuffle(rng, [
            { id: 'ok', text: 'Seul le condensateur 1 est pratiquement chargé', code: null, correct: true },
            { id: 'a', text: 'Oui, les deux sont chargés', code: 'E5' },
            { id: 'b', text: 'Seul le condensateur 2 est chargé', code: 'E5' },
            { id: 'c', text: 'Aucun des deux n’est chargé', code: 'E5' },
          ]),
        },
        { kind: 'COURBE', id: 'tau1', prompt: 'Détermine $\\tau_1$ sur la courbe 1.', answer: t1, origin: 0, zones: ZONES_CHARGE },
        { kind: 'COURBE', id: 'tau2', prompt: 'Détermine $\\tau_2$ sur la courbe 2.', answer: t2, origin: 0, zones: ZONES_CHARGE.slice(0, 2) },
        { kind: 'NUM', id: 'C1', prompt: 'Calcule $C_1$.', quantity: 'capacite', answer: C1, preferredUnit: 'µF', distractors: divDistractors(t1, R), hint: 'Utilise $\\tau_1 = R\\,C_1$.' },
        { kind: 'NUM', id: 'C2', prompt: 'Calcule $C_2$.', quantity: 'capacite', answer: C2, preferredUnit: 'µF', distractors: divDistractors(t2, R), hint: 'Utilise $\\tau_2 = R\\,C_2$.' },
        {
          kind: 'QCM',
          id: 'vf',
          prompt: 'Vrai ou faux : « Plus la capacité est grande, plus le condensateur se charge rapidement. »',
          options: [
            { id: 'vrai', text: 'Vrai', code: 'E5' },
            { id: 'ok', text: 'Faux', code: null, correct: true },
          ],
        },
      ],
    };
  },
};

export const D6: ExerciseTemplate = {
  id: 'D6',
  level: 'difficile',
  competences: ['C2', 'C3', 'C4', 'C5'],
  testsErrors: ['E4', 'E5', 'E6', 'EX'],
  title: 'Même durée de charge',
  formats: 'ÉTAPES',
  source: 'Examen national du baccalauréat 2013 – session normale, partie 2 (adapté)',
  generate(rng) {
    const E = pick(rng, E_LIST);
    const r0Options = (Ra: number, C: number) => R_LIST.filter((r) => r !== Ra && isClean(roundSig(5 * r * C)) && r * C >= 1e-3 && r * C <= 10);
    const { R: Ra, C, tau } = pickRC(rng, (r, c) => r >= 1e3 && r0Options(r, c).length > 0);
    const R0 = pick(rng, r0Options(Ra, C));
    const U0 = pick(rng, E_LIST);
    const dt = roundSig(5 * R0 * C);
    return {
      title: 'Même durée de charge',
      intro: `Un condensateur de capacité ${m(`C = ${tq(C, 'capacite')}`)}, initialement déchargé, se charge sous ${m(`E = ${tq(E, 'tension')}`)} à travers un conducteur ohmique de résistance ${m(`R_a = ${tq(Ra, 'resistance')}`)}. La courbe montre $u_C(t)$.`,
      figures: [{ kind: 'plot', plot: rcPlot({ E, tau, kind: 'charge', xMaxTau: 6 }) }],
      values: { E, Ra, C, R0, U0 },
      generalHint: 'Reprends les étapes : additivité, $u_R = R\\,i$, $i = C\\,\\dfrac{du_C}{dt}$, puis conditions initiale et finale.',
      questions: [
        { kind: 'EXPR', id: 'eq', prompt: 'Quelle est l’équation différentielle de la charge vérifiée par $u_C$ ?', options: shuffle(rng, equationOptions('u', 'charge').map((o) => ({ ...o, text: o.text.replace(/RC/g, 'R_aC').replace(/R\\,\\dfrac/g, 'R_a\\,\\dfrac') }))) },
        {
          kind: 'NUM',
          id: 'A',
          prompt: 'La solution s’écrit $u_C = A\\,e^{-t/\\tau} + B$. Donne $A$.',
          quantity: 'tension',
          answer: -E,
          preferredUnit: 'V',
          distractors: [
            { value: E, code: 'E4', label: 'A = E' },
            { value: 0, code: 'E4', label: 'A = 0' },
          ],
          hint: 'Utilise la condition initiale $u_C(0) = 0$.',
        },
        {
          kind: 'NUM',
          id: 'B',
          prompt: 'Donne $B$.',
          quantity: 'tension',
          answer: E,
          preferredUnit: 'V',
          distractors: [
            { value: 0, code: 'E4', label: 'B = 0' },
            { value: -E, code: 'E4', label: 'B = −E' },
          ],
          hint: 'Que vaut $u_C$ quand $t \\to \\infty$ ?',
        },
        { kind: 'EXPR', id: 'i', prompt: 'Quelle est l’expression de $i(t)$ pendant la charge ?', options: shuffle(rng, currentOptions('charge', 'E', 'R_a')) },
        {
          kind: 'QCM',
          id: 'allure',
          prompt: 'Quelle est l’allure de $i(t)$ pendant la charge ?',
          options: shuffle(rng, [
            { id: 'ok', text: '$i$ décroît de $E/R_a$ vers 0', code: null, correct: true },
            { id: 'a', text: '$i$ croît de 0 vers $E/R_a$', code: 'E4' },
            { id: 'b', text: '$i$ décroît de 0 vers $-E/R_a$', code: 'E6' },
            { id: 'c', text: '$i$ reste constante', code: 'E4' },
          ]),
        },
        {
          kind: 'NUM',
          id: 'R0',
          prompt: `Dans un second montage, le même condensateur est chargé par un générateur de tension ${m(`U_0 = ${tq(U0, 'tension')}`)} à travers un conducteur ohmique de résistance $R_0$. On veut que la charge soit pratiquement terminée au bout de ${m(`\\Delta t = ${tq(dt, 'temps')}`)}. Calcule $R_0$.`,
          quantity: 'resistance',
          answer: R0,
          preferredUnit: R0 >= 1e3 ? 'kΩ' : 'Ω',
          distractors: [{ value: dt / C, code: 'E5', label: 'durée = τ' }],
          hint: 'La charge est pratiquement terminée au bout de combien de constantes de temps ?',
        },
      ],
    };
  },
};

export const DIFFICILE: ExerciseTemplate[] = [D1, D2, D3, D4, D5, D6];
