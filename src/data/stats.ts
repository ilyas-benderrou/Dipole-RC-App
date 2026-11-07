/**
 * Statistiques de l'expérimentation (section 14.5) : moyenne, écart-type, test t de Welch
 * (loi de Student par la fonction bêta incomplète régularisée), d de Cohen, gain normalisé.
 */

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : NaN;
}

/** Écart-type corrigé (n − 1). */
export function sd(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

export function variance(xs: number[]): number {
  const s = sd(xs);
  return s * s;
}

/** ln Γ(x) (approximation de Lanczos, g = 7). */
export function lnGamma(x: number): number {
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const xx = x - 1;
  let a = c[0];
  const t = xx + 7.5;
  for (let i = 1; i < 9; i++) a += c[i] / (xx + i);
  return 0.5 * Math.log(2 * Math.PI) + (xx + 0.5) * Math.log(t) - t + Math.log(a);
}

/** Fraction continue de la fonction bêta incomplète (algorithme de Lentz modifié). */
function betacf(a: number, b: number, x: number): number {
  const MAXIT = 300;
  const EPS = 3e-14;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

/** Fonction bêta incomplète régularisée I_x(a, b). */
export function regIncBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}

/** p-value bilatérale de la loi de Student à df degrés de liberté. */
export function studentTwoTailedP(t: number, df: number): number {
  if (!Number.isFinite(t) || !(df > 0)) return NaN;
  return regIncBeta(df / (df + t * t), df / 2, 0.5);
}

export interface WelchResult {
  t: number;
  df: number;
  p: number;
  meanA: number;
  meanB: number;
  diff: number;
}

/** Test t de Welch (variances inégales) entre deux échantillons. */
export function welch(a: number[], b: number[]): WelchResult {
  const na = a.length;
  const nb = b.length;
  const ma = mean(a);
  const mb = mean(b);
  if (na < 2 || nb < 2) return { t: NaN, df: NaN, p: NaN, meanA: ma, meanB: mb, diff: ma - mb };
  const va = variance(a) / na;
  const vb = variance(b) / nb;
  const se = Math.sqrt(va + vb);
  if (se === 0) return { t: ma === mb ? 0 : Infinity * Math.sign(ma - mb), df: na + nb - 2, p: ma === mb ? 1 : 0, meanA: ma, meanB: mb, diff: ma - mb };
  const t = (ma - mb) / se;
  const df = (va + vb) ** 2 / (va ** 2 / (na - 1) + vb ** 2 / (nb - 1));
  return { t, df, p: studentTwoTailedP(t, df), meanA: ma, meanB: mb, diff: ma - mb };
}

/** d de Cohen avec l'écart-type combiné. */
export function cohenD(a: number[], b: number[]): number {
  const na = a.length;
  const nb = b.length;
  if (na < 2 || nb < 2) return NaN;
  const sp = Math.sqrt(((na - 1) * variance(a) + (nb - 1) * variance(b)) / (na + nb - 2));
  return sp === 0 ? 0 : (mean(a) - mean(b)) / sp;
}

/** Interprétation conventionnelle de |d| (Cohen, 1988). */
export function effectSizeLabel(d: number): string {
  const x = Math.abs(d);
  if (!Number.isFinite(x)) return '—';
  if (x < 0.2) return 'négligeable';
  if (x < 0.5) return 'petit';
  if (x < 0.8) return 'moyen';
  return 'grand';
}

/** Gain normalisé de Hake : g = (post − pré) / (max − pré). */
export function normalizedGain(pre: number, post: number, max = 20): number {
  if (pre >= max) return NaN;
  return (post - pre) / (max - pre);
}

export function significanceText(p: number, alpha = 0.05): string {
  if (!Number.isFinite(p)) return 'Effectif insuffisant pour conclure.';
  return p < alpha ? `La différence est significative (p < ${String(alpha).replace('.', ',')}).` : 'La différence n’est pas significative.';
}

export const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '—');
export const fmtP = (p: number) => (!Number.isFinite(p) ? '—' : p < 0.001 ? '< 0,001' : p.toFixed(3).replace('.', ','));
