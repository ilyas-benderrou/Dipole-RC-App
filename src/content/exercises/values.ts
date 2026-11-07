import { type Rng, pick } from '../../engine/rng';
import { isClean, niceStep, roundSig, texQuantity, type Quantity } from '../../physics/units';
import type { PlotSpec } from './types';

/** Valeurs utilisées par les générateurs (section 7.2). */
export const E_LIST = [5, 6, 9, 10, 12];
export const R_LIST = [100, 220, 470, 1e3, 2e3, 2.2e3, 4.7e3, 5e3, 10e3, 22e3, 47e3, 100e3];
export const C_LIST = [...[1, 2, 2.2, 4.7, 10, 20, 22, 47, 100, 220, 470].map((x) => roundSig(x * 1e-6)), ...[10, 20, 47, 100].map((x) => roundSig(x * 1e-9))];

/** Combinaison retenue seulement si τ a au plus 3 chiffres significatifs et tombe entre 1 ms et 10 s. */
export function validTau(R: number, C: number): boolean {
  const tau = roundSig(R * C);
  return tau >= 1e-3 - 1e-15 && tau <= 10 + 1e-12 && isClean(tau);
}

export const RC_PAIRS: [number, number][] = R_LIST.flatMap((R) => C_LIST.map((C) => [R, C] as [number, number])).filter(([R, C]) => validTau(R, C));

export function pickRC(rng: Rng, extra?: (R: number, C: number) => boolean): { R: number; C: number; tau: number } {
  const pairs = extra ? RC_PAIRS.filter(([R, C]) => extra(R, C)) : RC_PAIRS;
  const [R, C] = pick(rng, pairs);
  return { R, C, tau: roundSig(R * C) };
}

/** Raccourci LaTeX : « C = 4{,}7\,\text{µF} ». */
export const tq = (v: number, q: Quantity) => texQuantity(v, q);
export const m = (s: string) => `$${s}$`;

/** Signature stable des valeurs d'une instance. */
export function valueKeyOf(values: Record<string, number | string>): string {
  return Object.keys(values)
    .sort()
    .map((k) => `${k}=${typeof values[k] === 'number' ? roundSig(values[k] as number, 6) : values[k]}`)
    .join(';');
}

/** Points d'une courbe y = f(t) sur [a, b]. */
export function sampleFn(f: (t: number) => number, a: number, b: number, n = 200): [number, number][] {
  const pts: [number, number][] = [];
  for (let j = 0; j <= n; j++) {
    const t = a + ((b - a) * j) / n;
    pts.push([t, f(t)]);
  }
  return pts;
}

export function timeAxisUnit(xMax: number): { label: string; factor: number } {
  return xMax < 2 ? { label: 'ms', factor: 1e3 } : { label: 's', factor: 1 };
}

/** Axes d'une courbe de charge/décharge : graduations régulières, quadrillage fin pour la lecture. */
export function rcPlot(opts: { E: number; tau: number; kind: 'charge' | 'decharge'; xMaxTau?: number; yLabel?: string; color?: string; label?: string }): PlotSpec {
  const { E, tau, kind } = opts;
  const xMax = roundSig((opts.xMaxTau ?? 5) * tau);
  const xStep = niceStep(xMax, 5);
  const yStep = niceStep(E, 5);
  const f = kind === 'charge' ? (t: number) => E * (1 - Math.exp(-t / tau)) : (t: number) => E * Math.exp(-t / tau);
  return {
    xLabel: 't',
    yLabel: opts.yLabel ?? 'u_C',
    xUnit: timeAxisUnit(xMax),
    yUnit: { label: 'V', factor: 1 },
    xMax,
    yMin: 0,
    yMax: Math.ceil((E * 1.1) / yStep) * yStep,
    xStep,
    yStep,
    xMinor: xStep / 5,
    yMinor: yStep / 5,
    series: [{ points: sampleFn(f, 0, xMax, 240), color: opts.color ?? '#1F6FD1', label: opts.label ?? (opts.yLabel ?? 'u_C') }],
  };
}

/** Zones de lecture fausse de τ (section 7.4, M3), en multiples de τ. */
export function tauZones(kind: 'charge' | 'decharge') {
  return [
    { from: 0.4, to: 0.53, code: 'E5' as const, label: kind === 'charge' ? 'lecture à 0,37E en charge' : 'lecture à 0,63E en décharge' },
    { from: 0.62, to: 0.76, code: 'E5' as const, label: 'lecture à E/2' },
    { from: 2.9, to: 8, code: 'E5' as const, label: 'lecture au plateau' },
  ];
}
