import { describe, expect, it } from 'vitest';
import { cohenD, mean, normalizedGain, regIncBeta, sd, studentTwoTailedP, welch } from './stats';

/*
 * Valeurs de référence calculées avec SciPy 1.16 (scipy.stats.ttest_ind(equal_var=False), scipy.stats.t.sf,
 * scipy.stats.beta.cdf) :
 *  - « simple »  : a = 1..5, b = 2, 4, …, 10 → t = −1,897367, df = 5,882353, p = 0,107531, d = −1,2
 *  - « Welch 1 » (exemple de Wikipédia, n = 15 / 15) → t = −2,455356, df = 24,988529, p = 0,021378, d = −0,896569
 *  - « Welch 2 » (exemple de Wikipédia, n = 10 / 20) → t = −1,565434, df = 9,904741, p = 0,148842, d = −0,813346
 *  - loi de Student : p(|T| > 2,228 ; 10) = 0,050012 ; p(|T| > 2,086 ; 20) = 0,049996 ; p(|T| > 2,776 ; 4) = 0,050023 ;
 *    p(|T| > 1 ; 3) = 0,391002 ; p(|T| > 0,5 ; 7,5) = 0,631411
 *  - bêta : I_0,3(2, 5) = 0,579825 ; I_0,7(0,5 ; 0,5) = 0,630990
 */

const SIMPLE_A = [1, 2, 3, 4, 5];
const SIMPLE_B = [2, 4, 6, 8, 10];
const W1A = [27.5, 21.0, 19.0, 23.6, 17.0, 17.9, 16.9, 20.1, 21.9, 22.6, 23.1, 19.6, 19.0, 21.7, 21.4];
const W1B = [27.1, 22.0, 20.8, 23.4, 23.4, 23.5, 25.8, 22.0, 24.8, 20.2, 21.9, 22.1, 22.9, 20.5, 24.4];
const W2A = [17.2, 20.9, 22.6, 18.1, 21.7, 21.4, 23.5, 24.2, 14.7, 21.8];
const W2B = [21.5, 22.8, 21.0, 23.0, 21.6, 23.6, 22.5, 20.7, 23.4, 21.8, 20.7, 21.7, 21.5, 22.5, 23.6, 21.5, 22.5, 23.5, 21.5, 21.8];

describe('statistiques (section 14.5)', () => {
  it('moyenne et écart-type corrigé', () => {
    expect(mean(SIMPLE_A)).toBe(3);
    expect(sd(SIMPLE_A)).toBeCloseTo(1.5811388, 6);
    expect(sd(W1A)).toBeCloseTo(2.8048937, 6);
    expect(sd(W2B)).toBeCloseTo(0.9477258, 6);
    expect(Number.isNaN(sd([3]))).toBe(true);
  });

  it('fonction bêta incomplète régularisée', () => {
    expect(regIncBeta(0.3, 2, 5)).toBeCloseTo(0.579825, 6);
    expect(regIncBeta(0.7, 0.5, 0.5)).toBeCloseTo(0.6309899, 6);
  });

  it('loi de Student (p-values bilatérales des tables)', () => {
    expect(studentTwoTailedP(2.228, 10)).toBeCloseTo(0.0500118, 5);
    expect(studentTwoTailedP(2.086, 20)).toBeCloseTo(0.0499964, 5);
    expect(studentTwoTailedP(2.776, 4)).toBeCloseTo(0.0500228, 5);
    expect(studentTwoTailedP(1, 3)).toBeCloseTo(0.3910022, 5);
    expect(studentTwoTailedP(0.5, 7.5)).toBeCloseTo(0.6314110, 5);
  });

  it('test t de Welch – jeu « simple »', () => {
    const r = welch(SIMPLE_A, SIMPLE_B);
    expect(r.t).toBeCloseTo(-1.8973666, 6);
    expect(r.df).toBeCloseTo(5.8823529, 6);
    expect(r.p).toBeCloseTo(0.1075312, 5);
    expect(cohenD(SIMPLE_A, SIMPLE_B)).toBeCloseTo(-1.2, 9);
  });

  it('test t de Welch – exemple 1 (effectifs égaux)', () => {
    const r = welch(W1A, W1B);
    expect(r.t).toBeCloseTo(-2.4553564, 5);
    expect(r.df).toBeCloseTo(24.9885293, 4);
    expect(r.p).toBeCloseTo(0.021378, 5);
    expect(cohenD(W1A, W1B)).toBeCloseTo(-0.8965694, 5);
  });

  it('test t de Welch – exemple 2 (effectifs et variances inégaux)', () => {
    const r = welch(W2A, W2B);
    expect(r.t).toBeCloseTo(-1.5654335, 5);
    expect(r.df).toBeCloseTo(9.9047412, 4);
    expect(r.p).toBeCloseTo(0.1488417, 5);
    expect(cohenD(W2A, W2B)).toBeCloseTo(-0.8133457, 5);
  });

  it('gain normalisé', () => {
    expect(normalizedGain(8, 14)).toBeCloseTo(0.5, 12);
    expect(normalizedGain(10, 10)).toBe(0);
    expect(Number.isNaN(normalizedGain(20, 20))).toBe(true);
  });
});
