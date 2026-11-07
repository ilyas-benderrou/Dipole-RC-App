/**
 * Physique exacte du dipôle RC (section 6.3), sans intégration numérique.
 *
 * À chaque basculement de K à l'instant t₀, avec u₀ = u_C(t₀) (continuité de u_C) :
 *   K en 1 (charge)   : u_C(t) = E + (u₀ − E)·e^(−(t−t₀)/τ)
 *   K en 2 (décharge) : u_C(t) = u₀·e^(−(t−t₀)/τ)
 * i = C·du_C/dt (calculé analytiquement, discontinu au basculement) ; u_R = R·i ; q = C·u_C ; E_e = ½·C·u_C².
 * Si R, C ou E change pendant une phase, une nouvelle phase repart de la valeur actuelle de u_C.
 */

export type KPosition = 1 | 2;

export interface CircuitParams {
  /** Tension du générateur (V). */
  E: number;
  /** Résistance R du conducteur ohmique (Ω). */
  R: number;
  /** Capacité (F). */
  C: number;
}

export interface Phase extends CircuitParams {
  t0: number;
  u0: number;
  k: KPosition;
}

export interface CircuitState extends CircuitParams {
  t: number;
  k: KPosition;
  uC: number;
  uR: number;
  i: number;
  q: number;
  Ee: number;
  tau: number;
}

export const tauOf = (p: { R: number; C: number }): number => p.R * p.C;

export function phaseUc(ph: Phase, t: number): number {
  const x = Math.exp(-(t - ph.t0) / tauOf(ph));
  return ph.k === 1 ? ph.E + (ph.u0 - ph.E) * x : ph.u0 * x;
}

/** i = C·du_C/dt, exact. */
export function phaseCurrent(ph: Phase, t: number): number {
  const x = Math.exp(-(t - ph.t0) / tauOf(ph));
  return ph.k === 1 ? ((ph.E - ph.u0) / ph.R) * x : (-ph.u0 / ph.R) * x;
}

export function phaseState(ph: Phase, t: number): CircuitState {
  const uC = phaseUc(ph, t);
  const i = phaseCurrent(ph, t);
  return { t, k: ph.k, E: ph.E, R: ph.R, C: ph.C, uC, i, uR: ph.R * i, q: ph.C * uC, Ee: 0.5 * ph.C * uC * uC, tau: tauOf(ph) };
}

/** Suite de phases (immuable) : l'historique complet du circuit depuis t = 0. */
export class RCTimeline {
  private constructor(readonly phases: readonly Phase[]) {}

  /** Condensateur initialement chargé sous u₀ (0 par défaut), K dans la position donnée. */
  static start(params: CircuitParams, k: KPosition = 2, u0 = 0): RCTimeline {
    return new RCTimeline([{ ...params, t0: 0, u0, k }]);
  }

  get last(): Phase {
    return this.phases[this.phases.length - 1];
  }

  phaseAt(t: number): Phase {
    for (let j = this.phases.length - 1; j >= 0; j--) if (this.phases[j].t0 <= t) return this.phases[j];
    return this.phases[0];
  }

  uC(t: number): number {
    return phaseUc(this.phaseAt(t), t);
  }

  stateAt(t: number): CircuitState {
    return phaseState(this.phaseAt(t), t);
  }

  /** État juste avant t (limite à gauche), utile pour vérifier la continuité. */
  stateBefore(t: number): CircuitState {
    const prev = [...this.phases].reverse().find((p) => p.t0 < t) ?? this.phases[0];
    return phaseState(prev, t);
  }

  private append(t: number, change: Partial<CircuitParams> & { k?: KPosition }): RCTimeline {
    const kept = this.phases.filter((p) => p.t0 < t || p === this.phases[0]);
    const current = phaseState(this.phaseAt(t), t);
    const base = kept[kept.length - 1];
    const next: Phase = { E: base.E, R: base.R, C: base.C, k: base.k, ...change, t0: t, u0: current.uC };
    const phases = kept[kept.length - 1].t0 === t ? [...kept.slice(0, -1), next] : [...kept, next];
    return new RCTimeline(phases.length ? phases : [next]);
  }

  /** Bascule K à l'instant t (u_C est continue). */
  switchK(k: KPosition, t: number): RCTimeline {
    return this.append(t, { k });
  }

  /** Change E, R ou C à l'instant t : la phase repart de la valeur actuelle de u_C avec le nouveau τ. */
  setParams(params: Partial<CircuitParams>, t: number): RCTimeline {
    return this.append(t, params);
  }

  /** Instants de basculement (début de chaque phase sauf la première). */
  get switchTimes(): number[] {
    return this.phases.slice(1).map((p) => p.t0);
  }

  /**
   * Échantillonne l'intervalle [a, b] en n points, en ajoutant les points juste avant et juste après
   * chaque discontinuité (i saute au basculement).
   */
  sample(a: number, b: number, n = 240): CircuitState[] {
    if (b <= a) return [this.stateAt(a)];
    const pts: CircuitState[] = [];
    const bounds = this.phases.map((p) => p.t0).filter((t0) => t0 > a && t0 < b);
    const times = new Set<number>();
    for (let j = 0; j <= n; j++) times.add(a + ((b - a) * j) / n);
    bounds.forEach((t0) => times.add(t0));
    const sorted = [...times].sort((x, y) => x - y);
    for (const t of sorted) {
      if (bounds.includes(t)) pts.push(this.stateBefore(t));
      pts.push(this.stateAt(t));
    }
    return pts;
  }
}

/** Quelques repères utiles pour la lecture de τ (section 5.2). */
export const CHARGE_AT_TAU = 1 - Math.exp(-1); // 0,632
export const DISCHARGE_AT_TAU = Math.exp(-1); // 0,368
/** Rapport E_e(τ)/E_e,max en charge : ((e − 1)/e)² ≈ 0,40. */
export const ENERGY_RATIO_AT_TAU = CHARGE_AT_TAU ** 2;
