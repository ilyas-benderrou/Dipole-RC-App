import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CHARGE_AT_TAU, DISCHARGE_AT_TAU, RCTimeline, phaseState, type CircuitState, type KPosition, type Phase } from '../../physics/rc';

/** Valeurs normalisées (section 6.2). */
export const E_MIN = 1;
export const E_MAX = 12;
export const E_STEP = 0.5;
export const R_VALUES = [100, 220, 470, 1e3, 2.2e3, 4.7e3, 10e3, 22e3, 47e3, 100e3];
export const C_VALUES = [1, 2.2, 4.7, 10, 22, 47, 100, 220, 470, 1000].map((x) => x * 1e-6);
export const SPEEDS = [0.25, 0.5, 1, 2, 4];

export type PlotKey = 'uC' | 'i' | 'uR' | 'q' | 'Ee';

export interface SimConfig {
  E?: number;
  rIndex?: number;
  cIndex?: number;
  /** Deux condensateurs identiques en parallèle (capacité doublée). */
  doubleC?: boolean;
  k?: KPosition;
  /** Tension initiale du condensateur (V). */
  u0?: number;
  lock?: { E?: boolean; R?: boolean; C?: boolean; K?: boolean; doubleC?: boolean };
  /** Repères (0,63E, 0,37E, τ, 5τ, tangente) autorisés ; cachés par défaut dans les missions où il faut les trouver. */
  markersAllowed?: boolean;
  plots?: PlotKey[];
  /** Laisser le temps courir après 10τ (sinon pause automatique en régime permanent). */
  noAutoPause?: boolean;
}

export interface Tools {
  cursor: boolean;
  tangent: boolean;
  markers: boolean;
  compare: boolean;
}

export interface GhostTrace {
  label: string;
  points: CircuitState[];
}

/** Durée réelle (s) de 6τ à la vitesse ×1 : la vitesse d'affichage s'adapte au circuit. */
const REAL_SECONDS_FOR_6TAU = 8;
const ELECTRON_MAX_SPEED = 150; // px/s sur le schéma

export function useSimulation(config: SimConfig = {}) {
  const [E, setEState] = useState(config.E ?? 6);
  const [rIndex, setRIndexState] = useState(config.rIndex ?? 3);
  const [cIndex, setCIndexState] = useState(config.cIndex ?? 6);
  const [doubleC, setDoubleCState] = useState(config.doubleC ?? false);
  const C = C_VALUES[cIndex] * (doubleC ? 2 : 1);
  const R = R_VALUES[rIndex];
  const initialK: KPosition = config.k ?? 2;
  const initialU0 = config.u0 ?? 0;

  const [timeline, setTimeline] = useState(() => RCTimeline.start({ E, R, C }, initialK, initialU0));
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [cursor, setCursor] = useState<number | null>(null);
  const [tools, setTools] = useState<Tools>({ cursor: true, tangent: false, markers: false, compare: false });
  const [ghost, setGhost] = useState<GhostTrace | null>(null);
  const [plots, setPlots] = useState<PlotKey[]>(config.plots ?? ['uC', 'i']);
  const [markersAllowed, setMarkersAllowed] = useState(config.markersAllowed ?? true);
  const [revision, setRevision] = useState(0);

  const tRef = useRef(0);
  const tlRef = useRef(timeline);
  const playingRef = useRef(false);
  const speedRef = useRef(1);
  const electronOffset = useRef(0);
  tlRef.current = timeline;
  playingRef.current = playing;
  speedRef.current = speed;

  const state = useMemo(() => timeline.stateAt(t), [timeline, t]);
  const phase: Phase = timeline.phaseAt(t);
  const tau = R * C;

  // Boucle d'animation : temps du circuit = temps réel × (6τ / 8 s) × vitesse.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const tl = tlRef.current;
      const ph = tl.phaseAt(tRef.current);
      const phTau = ph.R * ph.C;
      const rate = ((6 * phTau) / REAL_SECONDS_FOR_6TAU) * speedRef.current;
      let next = tRef.current + dt * rate;
      const stopAt = tl.last.t0 + 10 * (tl.last.R * tl.last.C);
      let stop = false;
      if (!config.noAutoPause && next >= stopAt && tRef.current < stopAt) {
        next = stopAt;
        stop = true;
      }
      const s = phaseState(ph, next);
      const iRef = Math.max(1e-12, ph.E / ph.R);
      const v = ELECTRON_MAX_SPEED * Math.max(-1.5, Math.min(1.5, (ph.k === 1 ? s.i : -s.i) / iRef));
      electronOffset.current += v * dt;
      tRef.current = next;
      setT(next);
      if (stop) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, config.noAutoPause]);

  const play = useCallback(() => {
    const tl = tlRef.current;
    const stopAt = tl.last.t0 + 10 * (tl.last.R * tl.last.C);
    if (tRef.current >= stopAt - 1e-12 && !config.noAutoPause) return;
    setPlaying(true);
  }, [config.noAutoPause]);
  const pause = useCallback(() => setPlaying(false), []);

  const switchK = useCallback(
    (k: KPosition) => {
      setTimeline((tl) => tl.switchK(k, tRef.current));
      setRevision((r) => r + 1);
      setPlaying(true);
    },
    [],
  );

  const changeParams = useCallback((p: { E?: number; R?: number; C?: number }) => {
    setTimeline((tl) => tl.setParams(p, tRef.current));
    setRevision((r) => r + 1);
  }, []);

  const setE = useCallback(
    (v: number) => {
      setEState(v);
      changeParams({ E: v });
    },
    [changeParams],
  );
  const setRIndex = useCallback(
    (i: number) => {
      setRIndexState(i);
      changeParams({ R: R_VALUES[i] });
    },
    [changeParams],
  );
  const setCIndex = useCallback(
    (i: number) => {
      setCIndexState(i);
      changeParams({ C: C_VALUES[i] * (doubleC ? 2 : 1) });
    },
    [changeParams, doubleC],
  );
  const setDoubleC = useCallback(
    (d: boolean) => {
      setDoubleCState(d);
      changeParams({ C: C_VALUES[cIndex] * (d ? 2 : 1) });
    },
    [changeParams, cIndex],
  );

  /** Remise à zéro : condensateur déchargé, K en 2, t = 0. Avec l'outil « comparaison », la courbe précédente reste en gris. */
  const reset = useCallback(
    (opts: { u0?: number; k?: KPosition } = {}) => {
      if (tools.compare && tRef.current > 0) {
        const tl = tlRef.current;
        const ph = tl.last;
        const label = `R = ${formatShort(ph.R, 'Ω')}, C = ${formatShort(ph.C, 'F')}, E = ${String(ph.E).replace('.', ',')} V`;
        setGhost({ label, points: tl.sample(0, tRef.current, 300) });
      }
      setPlaying(false);
      tRef.current = 0;
      electronOffset.current = 0;
      setT(0);
      setCursor(null);
      setTimeline(RCTimeline.start({ E, R, C }, opts.k ?? 2, opts.u0 ?? 0));
      setRevision((r) => r + 1);
    },
    [E, R, C, tools.compare],
  );

  const setTool = useCallback((key: keyof Tools, value: boolean) => setTools((tl) => ({ ...tl, [key]: value })), []);

  // Fenêtre de temps affichée : 10τ, qui défile si la simulation continue.
  const lastTau = timeline.last.R * timeline.last.C;
  const span = 10 * lastTau;
  const range: [number, number] = t <= span ? [0, Math.max(span, 1e-9)] : [t - span, t];

  const cursorState = cursor !== null ? timeline.stateAt(Math.min(cursor, t)) : null;

  /** Repères de la phase en cours : niveau à τ, instants τ et 5τ, tangente à l'origine de la phase. */
  const markers = useMemo(() => {
    const ph = phase;
    const phTau = ph.R * ph.C;
    if (ph.k === 1) {
      return {
        kind: 'charge' as const,
        level: ph.u0 + CHARGE_AT_TAU * (ph.E - ph.u0),
        levelLabel: ph.u0 === 0 ? '0,63E' : '63 %',
        asymptote: ph.E,
        t0: ph.t0,
        tTau: ph.t0 + phTau,
        t5: ph.t0 + 5 * phTau,
        tangent: { x1: ph.t0, y1: ph.u0, x2: ph.t0 + phTau, y2: ph.E },
      };
    }
    return {
      kind: 'decharge' as const,
      level: DISCHARGE_AT_TAU * ph.u0,
      levelLabel: '0,37E',
      asymptote: 0,
      t0: ph.t0,
      tTau: ph.t0 + phTau,
      t5: ph.t0 + 5 * phTau,
      tangent: { x1: ph.t0, y1: ph.u0, x2: ph.t0 + phTau, y2: 0 },
    };
  }, [phase]);

  /** Une charge complète (depuis un condensateur vide, pendant au moins 5τ) a-t-elle eu lieu ? */
  const fullChargeDone = useMemo(() => {
    const ph = timeline.phases;
    return ph.some((p, j) => {
      if (p.k !== 1 || Math.abs(p.u0) > 0.05 * p.E) return false;
      const end = j + 1 < ph.length ? ph[j + 1].t0 : t;
      return end - p.t0 >= 5 * p.R * p.C - 1e-12;
    });
  }, [timeline, t]);

  return {
    E,
    R,
    C,
    rIndex,
    cIndex,
    doubleC,
    tau,
    setE,
    setRIndex,
    setCIndex,
    setDoubleC,
    k: phase.k,
    switchK,
    t,
    playing,
    play,
    pause,
    speed,
    setSpeed,
    reset,
    timeline,
    state,
    phase,
    range,
    cursor,
    setCursor,
    cursorState,
    tools,
    setTool,
    ghost,
    setGhost,
    plots,
    setPlots,
    markers,
    markersAllowed,
    setMarkersAllowed,
    fullChargeDone,
    electronOffset,
    revision,
    lock: config.lock ?? {},
  };
}

export type Simulation = ReturnType<typeof useSimulation>;

function formatShort(v: number, unit: 'Ω' | 'F'): string {
  if (unit === 'Ω') return v >= 1000 ? `${String(v / 1000).replace('.', ',')} kΩ` : `${v} Ω`;
  return `${String(Math.round(v * 1e6 * 100) / 100).replace('.', ',')} µF`;
}
