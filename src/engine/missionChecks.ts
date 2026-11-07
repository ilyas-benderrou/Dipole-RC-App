import { ADAPTIVE } from '../config/adaptive';
import type { RCTimeline } from '../physics/rc';
import { isClose } from '../physics/units';

/** Écart absolu toléré : 5 % de l'échelle (E pour les tensions, E/R pour les courants). */
export function withinScale(x: number | null, target: number, scale: number, tol = ADAPTIVE.missionReadTolerance): boolean {
  return x !== null && Number.isFinite(x) && Math.abs(x - target) <= tol * Math.abs(scale);
}

/** S3 : u_C et i juste après la fermeture de K, puis après 5τ (lectures au curseur, tolérance 5 %). */
export function checkS3(read: { uc0: number | null; i0: number | null; uc5: number | null; i5: number | null }, E: number, R: number) {
  const I0 = E / R;
  const e5 = Math.exp(-5);
  return {
    uc0: withinScale(read.uc0, 0, E),
    i0: withinScale(read.i0, I0, I0),
    uc5: withinScale(read.uc5, E * (1 - e5), E),
    i5: withinScale(read.i5, I0 * e5, I0),
  };
}

/** S4 : τ lu sur la courbe à ±5 %. */
export function checkTau(read: number | null, tau: number): boolean {
  return read !== null && isClose(read, tau, ADAPTIVE.missionReadTolerance);
}

/** S5 : τ pour C puis pour 2C, rapport ≈ 2. */
export function checkS5(t1: number | null, t2: number | null, tau: number) {
  const ok1 = checkTau(t1, tau);
  const ok2 = checkTau(t2, 2 * tau);
  const ratio = t1 && t2 ? t2 / t1 : null;
  return { ok1, ok2, ratio, ratioOk: ratio !== null && isClose(ratio, 2, ADAPTIVE.missionReadTolerance) };
}

/** S2 : charge q₂ sous la même tension avec 2C, et capacité q₂/u_C. */
export function checkS2(q2: number | null, c2: number | null, C0: number, E: number) {
  return {
    q: q2 !== null && isClose(q2, 2 * C0 * E, ADAPTIVE.numTolerance),
    c: c2 !== null && isClose(c2, 2 * C0, ADAPTIVE.numTolerance),
  };
}

/** S7 : deux lectures (u_R, u_C) à deux instants différents pendant la charge, cohérentes avec la simulation. */
export function checkS7(readings: { t: number; uR: number | null; uC: number | null }[], timeline: RCTimeline) {
  const res = readings.map((r) => {
    const s = timeline.stateAt(r.t);
    const charging = timeline.phaseAt(r.t).k === 1;
    return {
      charging,
      uR: withinScale(r.uR, s.uR, s.E),
      uC: withinScale(r.uC, s.uC, s.E),
      sum: r.uR !== null && r.uC !== null ? r.uR + r.uC : null,
      E: s.E,
    };
  });
  const distinct = readings.length === 2 && Math.abs(readings[0].t - readings[1].t) >= 0.1 * timeline.phaseAt(readings[0].t).R * timeline.phaseAt(readings[0].t).C;
  return { res, distinct, ok: readings.length === 2 && distinct && res.every((r) => r.charging && r.uR && r.uC) };
}

/** S8 : énergie en fin de charge, ±2 % ; « sans le ½ » ou « sans le carré » → EX (énergie). */
export function checkS8(value: number | null, C: number, E: number): { ok: boolean; code: 'EX' | null } {
  const target = 0.5 * C * E * E;
  if (value === null) return { ok: false, code: null };
  if (isClose(value, target, ADAPTIVE.missionEnergyTolerance)) return { ok: true, code: null };
  const wrong = [C * E * E, 0.5 * C * E, C * E];
  return { ok: false, code: wrong.some((w) => isClose(value, w, ADAPTIVE.numTolerance)) ? 'EX' : null };
}
