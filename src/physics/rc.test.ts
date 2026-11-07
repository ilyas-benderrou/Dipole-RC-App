import { describe, expect, it } from 'vitest';
import { ENERGY_RATIO_AT_TAU, RCTimeline, tauOf } from './rc';

const P = { E: 10, R: 1000, C: 100e-6 }; // τ = 0,1 s
const tau = tauOf(P);

describe('physique exacte du dipôle RC (section 6.3)', () => {
  it('τ = RC', () => {
    expect(tau).toBeCloseTo(0.1, 12);
  });

  it('u_C(τ) = 0,632 E en charge depuis 0', () => {
    const tl = RCTimeline.start(P, 2, 0).switchK(1, 0);
    expect(tl.uC(tau) / P.E).toBeCloseTo(0.632, 3);
    expect(tl.uC(5 * tau) / P.E).toBeGreaterThan(0.99);
  });

  it('u_C(τ) = 0,368 E en décharge depuis E', () => {
    const tl = RCTimeline.start(P, 2, P.E);
    expect(tl.uC(tau) / P.E).toBeCloseTo(0.368, 3);
  });

  it('i(0⁺) = E/R en charge, puis −E/R au basculement en décharge après une charge complète', () => {
    let tl = RCTimeline.start(P, 2, 0).switchK(1, 0);
    expect(tl.stateAt(0).i).toBeCloseTo(P.E / P.R, 12);
    const t1 = 20 * tau; // charge pratiquement terminée
    tl = tl.switchK(2, t1);
    expect(tl.stateAt(t1).i).toBeCloseTo(-P.E / P.R, 9);
    // juste avant le basculement, le courant est quasi nul : i est discontinue
    expect(Math.abs(tl.stateBefore(t1).i)).toBeLessThan(1e-9);
  });

  it('u_C est continue au basculement (charge partielle puis décharge, et retour)', () => {
    let tl = RCTimeline.start(P, 2, 0).switchK(1, 0);
    const t1 = 0.7 * tau;
    const before = tl.uC(t1);
    tl = tl.switchK(2, t1);
    expect(tl.stateBefore(t1).uC).toBeCloseTo(before, 12);
    expect(tl.stateAt(t1).uC).toBeCloseTo(before, 12);
    const t2 = t1 + 0.3 * tau;
    const mid = tl.uC(t2);
    tl = tl.switchK(1, t2);
    expect(tl.stateAt(t2).uC).toBeCloseTo(mid, 12);
    expect(tl.stateAt(t2).i).toBeCloseTo((P.E - mid) / P.R, 12);
  });

  it('u_R + u_C = E en charge et 0 en décharge, à tout instant', () => {
    let tl = RCTimeline.start(P, 2, 0).switchK(1, 0);
    for (const t of [0, 0.1, 0.5, 1, 2, 4].map((x) => x * tau)) {
      const s = tl.stateAt(t);
      expect(s.uR + s.uC).toBeCloseTo(P.E, 9);
    }
    tl = tl.switchK(2, 6 * tau);
    for (const t of [6, 6.2, 7, 9].map((x) => x * tau)) {
      const s = tl.stateAt(t);
      expect(s.uR + s.uC).toBeCloseTo(0, 9);
    }
  });

  it('i = C·du_C/dt (vérification numérique de la dérivée analytique)', () => {
    const tl = RCTimeline.start(P, 2, 3).switchK(1, 0.02);
    const t = 0.13;
    const h = 1e-7;
    const derivative = (tl.uC(t + h) - tl.uC(t - h)) / (2 * h);
    expect(tl.stateAt(t).i).toBeCloseTo(P.C * derivative, 6);
  });

  it('q = C·u_C et E_e = ½·C·u_C²', () => {
    const tl = RCTimeline.start(P, 2, 0).switchK(1, 0);
    const s = tl.stateAt(tau);
    expect(s.q).toBeCloseTo(P.C * s.uC, 15);
    expect(s.Ee).toBeCloseTo(0.5 * P.C * s.uC ** 2, 15);
    expect(tl.stateAt(tau).Ee / (0.5 * P.C * P.E ** 2)).toBeCloseTo(ENERGY_RATIO_AT_TAU, 9);
  });

  it('changement de R pendant une phase : repart de la valeur actuelle de u_C avec le nouveau τ', () => {
    let tl = RCTimeline.start(P, 2, 0).switchK(1, 0);
    const t1 = tau;
    const u1 = tl.uC(t1);
    tl = tl.setParams({ R: 2000 }, t1);
    expect(tl.stateAt(t1).uC).toBeCloseTo(u1, 12);
    expect(tl.stateAt(t1).tau).toBeCloseTo(0.2, 12);
    // une constante de temps (nouvelle) plus tard, 63 % du chemin restant est parcouru
    expect((tl.uC(t1 + 0.2) - u1) / (P.E - u1)).toBeCloseTo(0.632, 3);
  });

  it('l’échantillonnage contient les deux côtés de la discontinuité de i', () => {
    const tl = RCTimeline.start(P, 2, 0).switchK(1, 0).switchK(2, 3 * tau);
    const pts = tl.sample(0, 6 * tau, 60);
    const around = pts.filter((p) => Math.abs(p.t - 3 * tau) < 1e-12);
    expect(around.length).toBe(2);
    expect(around[0].i).toBeGreaterThan(0);
    expect(around[1].i).toBeLessThan(0);
  });
});
