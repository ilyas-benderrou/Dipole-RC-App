import { useMemo, useRef, type ReactNode } from 'react';
import type { CircuitState } from '../../physics/rc';
import { bestUnit, formatNumber, niceStep, type Quantity } from '../../physics/units';
import type { PlotKey, Simulation } from './useSimulation';

export const PLOT_META: Record<PlotKey, { label: string; sub: string; color: string; quantity: Quantity; get: (s: CircuitState) => number }> = {
  uC: { label: 'u', sub: 'C', color: '#1F6FD1', quantity: 'tension', get: (s) => s.uC },
  i: { label: 'i', sub: '', color: '#E67E22', quantity: 'courant', get: (s) => s.i },
  uR: { label: 'u', sub: 'R', color: '#8b5cf6', quantity: 'tension', get: (s) => s.uR },
  q: { label: 'q', sub: '', color: '#0f7c7c', quantity: 'charge', get: (s) => s.q },
  Ee: { label: 'E', sub: 'e', color: '#d9468f', quantity: 'energie', get: (s) => s.Ee },
};

const W = 640;
const PAD = { l: 52, r: 14, t: 14, b: 22 };

function niceCeil(x: number): number {
  if (x <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(x));
  const m = x / p;
  const nice = m <= 1 ? 1 : m <= 1.2 ? 1.2 : m <= 1.5 ? 1.5 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 3 ? 3 : m <= 4 ? 4 : m <= 5 ? 5 : m <= 6 ? 6 : m <= 8 ? 8 : 10;
  return nice * p;
}

/** Unité de l'axe des temps : ms ou s selon τ. */
export function timeUnit(span: number): { label: string; factor: number } {
  return span < 2 ? { label: 'ms', factor: 1e3 } : { label: 's', factor: 1 };
}

interface MiniPlotProps {
  keyName: PlotKey;
  points: CircuitState[];
  ghost: CircuitState[] | null;
  range: [number, number];
  yMin: number;
  yMax: number;
  height: number;
  tLabel: { label: string; factor: number };
  cursor: number | null;
  cursorEnabled: boolean;
  onCursor: (t: number) => void;
  maxT: number;
  extras?: (sx: (t: number) => number, sy: (v: number) => number) => ReactNode;
  showTimeAxis: boolean;
}

function MiniPlot({ keyName, points, ghost, range, yMin, yMax, height, tLabel, cursor, cursorEnabled, onCursor, maxT, extras, showTimeAxis }: MiniPlotProps) {
  const meta = PLOT_META[keyName];
  const H = height;
  const [a, b] = range;
  const sx = (t: number) => PAD.l + ((t - a) / (b - a)) * (W - PAD.l - PAD.r);
  const sy = (v: number) => PAD.t + (1 - (v - yMin) / (yMax - yMin)) * (H - PAD.t - PAD.b);
  const unit = bestUnit(Math.max(Math.abs(yMin), Math.abs(yMax)), meta.quantity);
  const yStep = niceStep(yMax - yMin, 4);
  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax + yStep * 1e-6; v += yStep) yTicks.push(Number(v.toPrecision(10)));
  const tStep = niceStep(b - a, 6);
  const tTicks: number[] = [];
  for (let v = Math.ceil(a / tStep) * tStep; v <= b + tStep * 1e-6; v += tStep) tTicks.push(Number(v.toPrecision(10)));
  const path = (pts: CircuitState[]) =>
    pts
      .filter((p) => p.t >= a - 1e-12 && p.t <= b + 1e-12)
      .map((p, j) => `${j ? 'L' : 'M'}${sx(p.t).toFixed(1)},${sy(Math.max(yMin, Math.min(yMax, meta.get(p)))).toFixed(1)}`)
      .join(' ');
  const svgRef = useRef<SVGSVGElement>(null);
  const pointerToT = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    const t = a + ((x - PAD.l) / (W - PAD.l - PAD.r)) * (b - a);
    return Math.max(a, Math.min(maxT, t));
  };
  const cursorPoint = cursor !== null ? points.reduce<CircuitState | null>((best, p) => (best === null || Math.abs(p.t - cursor) < Math.abs(best.t - cursor) ? p : best), null) : null;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      className={`w-full touch-none ${cursorEnabled ? 'cursor-crosshair' : ''}`}
      role="img"
      aria-label={`Courbe ${meta.label}${meta.sub ? '_' + meta.sub : ''}(t)`}
      onPointerDown={(e) => {
        if (!cursorEnabled) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        onCursor(pointerToT(e.clientX));
      }}
      onPointerMove={(e) => {
        if (!cursorEnabled || e.buttons !== 1) return;
        onCursor(pointerToT(e.clientX));
      }}
    >
      <rect x={PAD.l} y={PAD.t} width={W - PAD.l - PAD.r} height={H - PAD.t - PAD.b} fill="rgba(255,255,255,0.55)" rx={6} />
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? '#94a3b8' : '#e2e8f0'} strokeWidth={v === 0 ? 1.2 : 1} />
          <text x={PAD.l - 6} y={sy(v) + 4} textAnchor="end" fontSize={10.5} fill="#6c8299">
            {formatNumber(v / unit.factor, 3)}
          </text>
        </g>
      ))}
      {tTicks.map((v) => (
        <g key={`t${v}`}>
          <line x1={sx(v)} x2={sx(v)} y1={PAD.t} y2={H - PAD.b} stroke="#eef2f6" />
          {showTimeAxis && (
            <text x={sx(v)} y={H - 6} textAnchor="middle" fontSize={10.5} fill="#6c8299">
              {formatNumber(v * tLabel.factor, 3)}
            </text>
          )}
        </g>
      ))}
      {showTimeAxis && (
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize={10.5} fill="#3d5873" fontWeight={600}>
          t ({tLabel.label})
        </text>
      )}
      <text x={6} y={PAD.t + 10} fontSize={12} fill={meta.color} fontWeight={700} fontStyle="italic">
        {meta.label}
        {meta.sub && (
          <tspan fontSize={9} dy={3}>
            {meta.sub}
          </tspan>
        )}
      </text>
      <text x={6} y={PAD.t + 25} fontSize={10} fill="#6c8299">
        ({unit.label})
      </text>
      {extras?.(sx, sy)}
      {ghost && <path d={path(ghost)} fill="none" stroke="#9aa9b8" strokeWidth={2} strokeDasharray="1 0" opacity={0.75} />}
      <path d={path(points)} fill="none" stroke={meta.color} strokeWidth={2.6} strokeLinejoin="round" />
      {cursorEnabled && cursor !== null && (
        <g pointerEvents="none">
          <line x1={sx(cursor)} x2={sx(cursor)} y1={PAD.t} y2={H - PAD.b} stroke="#16324F" strokeWidth={1.2} strokeDasharray="4 3" />
          {cursorPoint && <circle cx={sx(cursorPoint.t)} cy={sy(meta.get(cursorPoint))} r={4.5} fill="#fff" stroke={meta.color} strokeWidth={2.5} />}
        </g>
      )}
    </svg>
  );
}

/** Courbes en temps réel : u_C(t) (bleu) et i(t) (orange), avec option u_R(t), q(t) et E_e(t). */
export function SimPlots({ sim }: { sim: Simulation }) {
  const { timeline, t, range, plots, ghost, tools, cursor, setCursor, markers, markersAllowed } = sim;
  const points = useMemo(() => timeline.sample(range[0], Math.min(t, range[1]), 260), [timeline, t, range]);
  const ghostPts = ghost?.points ?? null;
  const all = [...points, ...(ghostPts ?? [])];
  const Emax = Math.max(1, ...timeline.phases.map((p) => p.E), ...all.map((p) => Math.abs(p.uC)));
  const tLabel = timeUnit(range[1] - range[0]);
  const showMarkers = tools.markers && markersAllowed;
  const showTangent = tools.tangent && markersAllowed;

  const bounds = (key: PlotKey): [number, number] => {
    const vals = all.map((p) => PLOT_META[key].get(p));
    const ph = timeline.last;
    switch (key) {
      case 'uC':
        return [0, niceCeil(Emax)];
      case 'uR': {
        const m = niceCeil(Math.max(Emax, ...vals.map(Math.abs)));
        return [-m, m];
      }
      case 'i': {
        const m = niceCeil(Math.max(ph.E / ph.R, ...vals.map(Math.abs)));
        return [-m, m];
      }
      case 'q':
        return [0, niceCeil(Math.max(ph.C * Emax, ...vals))];
      case 'Ee':
        return [0, niceCeil(Math.max(0.5 * ph.C * Emax * Emax, ...vals))];
    }
  };

  return (
    <div className="space-y-1">
      {plots.map((key, idx) => {
        const [yMin, yMax] = bounds(key);
        const isLast = idx === plots.length - 1;
        return (
          <MiniPlot
            key={key}
            keyName={key}
            points={points}
            ghost={ghostPts}
            range={range}
            yMin={yMin}
            yMax={yMax}
            height={key === 'uC' ? (plots.length > 2 ? 150 : 175) : plots.length > 2 ? 110 : 140}
            tLabel={tLabel}
            cursor={cursor}
            cursorEnabled={tools.cursor}
            onCursor={setCursor}
            maxT={t}
            showTimeAxis={isLast || key === 'uC'}
            extras={
              key === 'uC'
                ? (sx, sy) => (
                    <g pointerEvents="none" fontSize={10.5} fontWeight={600}>
                      {showTangent && (
                        <>
                          <line x1={sx(markers.tangent.x1)} y1={sy(markers.tangent.y1)} x2={sx(markers.tangent.x2)} y2={sy(markers.tangent.y2)} stroke="#64748b" strokeWidth={1.6} strokeDasharray="6 4" />
                          {markers.kind === 'charge' && (
                            <line x1={sx(range[0])} x2={sx(range[1])} y1={sy(markers.asymptote)} y2={sy(markers.asymptote)} stroke="#94a3b8" strokeDasharray="2 4" />
                          )}
                        </>
                      )}
                      {showMarkers && (
                        <>
                          <line x1={sx(range[0])} x2={sx(range[1])} y1={sy(markers.level)} y2={sy(markers.level)} stroke="#64748b" strokeDasharray="5 4" />
                          <text x={sx(range[1]) - 4} y={sy(markers.level) - 4} textAnchor="end" fill="#475569">
                            {markers.levelLabel}
                          </text>
                          {[markers.tTau, markers.t5].map((tm, j) =>
                            tm >= range[0] && tm <= range[1] ? (
                              <g key={j}>
                                <line x1={sx(tm)} x2={sx(tm)} y1={sy(0)} y2={sy(j === 0 ? markers.level : markers.asymptote || markers.level)} stroke="#64748b" strokeDasharray="5 4" />
                                <text x={sx(tm) + 4} y={sy(0) - 5} fill="#475569">
                                  {j === 0 ? 'τ' : '5τ'}
                                </text>
                              </g>
                            ) : null,
                          )}
                        </>
                      )}
                    </g>
                  )
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
