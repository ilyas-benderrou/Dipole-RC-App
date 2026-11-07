import { useRef, useState } from 'react';
import type { Figure, PlotSpec } from '../content/exercises/types';
import { formatNumber } from '../physics/units';
import { CircuitDiagram } from './sim/CircuitDiagram';
import { Tex } from './Tex';

const W = 640;
const H = 340;
const PAD = { l: 56, r: 18, t: 18, b: 40 };

function ticks(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const start = Math.ceil(min / step - 1e-9) * step;
  for (let v = start; v <= max + step * 1e-6; v += step) out.push(Number(v.toPrecision(10)));
  return out;
}

function axisLabel(name: string): string {
  return name
    .replace(/u_C/g, 'u_C')
    .replace(/u_R/g, 'u_R');
}

/**
 * Courbe d'exercice générée par le code (quadrillage, graduations). Mode lecture : l'apprenant clique sur la courbe ;
 * un réticule affiche t et la valeur de la courbe à cet instant (comme une lecture graphique au papier calque).
 */
export function CurvePlot({ plot, onPick, picked, origin = 0, readingLabel = 'τ' }: { plot: PlotSpec; onPick?: (t: number) => void; picked?: number | null; origin?: number; readingLabel?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const sx = (t: number) => PAD.l + (t / plot.xMax) * (W - PAD.l - PAD.r);
  const sy = (v: number) => PAD.t + (1 - (v - plot.yMin) / (plot.yMax - plot.yMin)) * (H - PAD.t - PAD.b);
  const scope = !!plot.scope;
  const grid = scope ? 'rgba(159,231,225,0.22)' : '#e5ebf1';
  const minor = scope ? 'rgba(159,231,225,0.09)' : '#f1f5f9';
  const text = scope ? '#cfeeea' : '#6c8299';
  const main = plot.series[0];
  const valueAt = (t: number) => {
    const pts = main.points;
    for (let j = 1; j < pts.length; j++) {
      if (pts[j][0] >= t) {
        const [x0, y0] = pts[j - 1];
        const [x1, y1] = pts[j];
        return x1 === x0 ? y1 : y0 + ((t - x0) / (x1 - x0)) * (y1 - y0);
      }
    }
    return pts[pts.length - 1][1];
  };
  const toT = (clientX: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * W;
    return Math.max(0, Math.min(plot.xMax, ((x - PAD.l) / (W - PAD.l - PAD.r)) * plot.xMax));
  };
  const cross = picked ?? hover;
  const fmtT = (t: number) => `${formatNumber(t * plot.xUnit.factor, 3)} ${plot.xUnit.label}`;
  const path = (pts: [number, number][]) => pts.map(([t, v], j) => `${j ? 'L' : 'M'}${sx(t).toFixed(1)},${sy(Math.max(plot.yMin, Math.min(plot.yMax, v))).toFixed(1)}`).join(' ');

  return (
    <div className={`overflow-hidden rounded-2xl ${scope ? 'bg-[#0d2b2c]' : 'bg-white/70'} p-1.5 ring-1 ring-white/70`}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full touch-none ${onPick ? 'cursor-crosshair' : ''}`}
        role="img"
        aria-label={`Courbe ${plot.yLabel} en fonction de ${plot.xLabel}`}
        onPointerMove={(e) => onPick && setHover(toT(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onPointerDown={(e) => onPick && onPick(toT(e.clientX))}
      >
        {plot.xMinor && ticks(0, plot.xMax, plot.xMinor).map((v) => <line key={`xm${v}`} x1={sx(v)} x2={sx(v)} y1={PAD.t} y2={H - PAD.b} stroke={minor} />)}
        {plot.yMinor && ticks(plot.yMin, plot.yMax, plot.yMinor).map((v) => <line key={`ym${v}`} x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke={minor} />)}
        {ticks(0, plot.xMax, plot.xStep).map((v) => (
          <g key={`x${v}`}>
            <line x1={sx(v)} x2={sx(v)} y1={PAD.t} y2={H - PAD.b} stroke={grid} />
            <text x={sx(v)} y={H - PAD.b + 15} textAnchor="middle" fontSize={11} fill={text}>
              {formatNumber(v * plot.xUnit.factor, 3)}
            </text>
          </g>
        ))}
        {ticks(plot.yMin, plot.yMax, plot.yStep).map((v) => (
          <g key={`y${v}`}>
            <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke={Math.abs(v) < 1e-12 ? (scope ? '#9fe7e1' : '#94a3b8') : grid} />
            <text x={PAD.l - 7} y={sy(v) + 4} textAnchor="end" fontSize={11} fill={text}>
              {formatNumber(v / plot.yUnit.factor, 3)}
            </text>
          </g>
        ))}
        <line x1={PAD.l} x2={PAD.l} y1={PAD.t} y2={H - PAD.b} stroke={scope ? '#9fe7e1' : '#94a3b8'} />
        <text x={W - PAD.r} y={H - 6} textAnchor="end" fontSize={12} fill={scope ? '#e6fffb' : '#3d5873'} fontWeight={600}>
          {plot.xLabel} ({plot.xUnit.label})
        </text>
        <text x={8} y={PAD.t - 4} fontSize={12} fill={scope ? '#e6fffb' : '#3d5873'} fontWeight={600}>
          {axisLabel(plot.yLabel)}
          {plot.yUnit.label ? ` (${plot.yUnit.label})` : ''}
        </text>
        {plot.lines?.map((l, j) => (
          <line key={`l${j}`} x1={sx(l.x1)} y1={sy(l.y1)} x2={sx(l.x2)} y2={sy(l.y2)} stroke={l.color ?? '#64748b'} strokeWidth={1.6} strokeDasharray={l.dashed ? '6 4' : undefined} />
        ))}
        {plot.series.map((s, j) => (
          <g key={`s${j}`}>
            <path d={path(s.points)} fill="none" stroke={s.color} strokeWidth={2.6} strokeLinejoin="round" strokeDasharray={s.dashed ? '6 4' : undefined} />
            {plot.series.length > 1 && (
              <text x={sx(s.points[Math.floor(s.points.length * 0.82)][0]) + 4} y={sy(s.points[Math.floor(s.points.length * 0.82)][1]) - 6} fontSize={12} fontWeight={700} fill={s.color}>
                {s.label}
              </text>
            )}
          </g>
        ))}
        {plot.labels?.map((l, j) => (
          <text key={`t${j}`} x={sx(l.x)} y={sy(l.y)} fontSize={12} fontWeight={700} fill={l.color ?? (scope ? '#f4d35e' : '#16324F')}>
            {l.text}
          </text>
        ))}
        {onPick && cross !== null && (
          <g pointerEvents="none">
            <line x1={sx(cross)} x2={sx(cross)} y1={PAD.t} y2={H - PAD.b} stroke={picked !== null && picked !== undefined ? '#E67E22' : '#16324F'} strokeWidth={1.4} strokeDasharray="4 3" />
            <line x1={PAD.l} x2={sx(cross)} y1={sy(valueAt(cross))} y2={sy(valueAt(cross))} stroke="#94a3b8" strokeDasharray="3 3" />
            <circle cx={sx(cross)} cy={sy(valueAt(cross))} r={4.5} fill="#fff" stroke="#E67E22" strokeWidth={2.4} />
            <rect x={Math.min(sx(cross) + 6, W - 150)} y={PAD.t + 4} width={142} height={36} rx={8} fill="rgba(22,50,79,0.85)" />
            <text x={Math.min(sx(cross) + 14, W - 142)} y={PAD.t + 19} fontSize={11.5} fill="#fff">
              t = {fmtT(cross)}
              {origin ? `  (${readingLabel} = ${fmtT(cross - origin)})` : ''}
            </text>
            <text x={Math.min(sx(cross) + 14, W - 142)} y={PAD.t + 33} fontSize={11.5} fill="#cfeeea">
              {axisLabel(plot.yLabel)} = {formatNumber(valueAt(cross) / plot.yUnit.factor, 3)} {plot.yUnit.label}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}

/** Deux condensateurs en série ou en parallèle entre A et B (gabarit F3). */
export function CapacitorsFigure({ mode, c1, c2 }: { mode: 'serie' | 'parallele'; c1: string; c2: string }) {
  const ink = '#16324F';
  const cap = (x: number, y: number, vertical = false) =>
    vertical ? (
      <g>
        <line x1={x - 18} y1={y - 5} x2={x + 18} y2={y - 5} stroke={ink} strokeWidth={4} />
        <line x1={x - 18} y1={y + 5} x2={x + 18} y2={y + 5} stroke={ink} strokeWidth={4} />
      </g>
    ) : (
      <g>
        <line x1={x - 5} y1={y - 18} x2={x - 5} y2={y + 18} stroke={ink} strokeWidth={4} />
        <line x1={x + 5} y1={y - 18} x2={x + 5} y2={y + 18} stroke={ink} strokeWidth={4} />
      </g>
    );
  return (
    <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-white/70">
      <svg viewBox="0 0 360 140" className="mx-auto w-full max-w-md" role="img" aria-label={`Deux condensateurs en ${mode === 'serie' ? 'série' : 'parallèle'}`}>
        {mode === 'serie' ? (
          <g stroke={ink} strokeWidth={2.4} fill="none">
            <line x1={30} y1={70} x2={125} y2={70} />
            <line x1={135} y1={70} x2={225} y2={70} />
            <line x1={235} y1={70} x2={330} y2={70} />
            {cap(130, 70)}
            {cap(230, 70)}
          </g>
        ) : (
          <g stroke={ink} strokeWidth={2.4} fill="none">
            <line x1={30} y1={70} x2={110} y2={70} />
            <line x1={250} y1={70} x2={330} y2={70} />
            <polyline points="110,70 110,35 175,35" />
            <polyline points="185,35 250,35 250,70" />
            <polyline points="110,70 110,105 175,105" />
            <polyline points="185,105 250,105 250,70" />
            {cap(180, 35)}
            {cap(180, 105)}
          </g>
        )}
        <circle cx={30} cy={70} r={4} fill={ink} />
        <circle cx={330} cy={70} r={4} fill={ink} />
        <text x={22} y={95} fontSize={14} fontWeight={700} fill={ink}>
          A
        </text>
        <text x={326} y={95} fontSize={14} fontWeight={700} fill={ink}>
          B
        </text>
      </svg>
      <p className="mt-1 text-center text-sm text-ink-soft">
        <Tex math={`C_1 = ${c1}`} /> · <Tex math={`C_2 = ${c2}`} />
      </p>
    </div>
  );
}

/** C₁ et C₂ en série avec R et le générateur E (gabarit D2). */
export function SeriesRCFigure() {
  const ink = '#16324F';
  return (
    <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-white/70">
      <svg viewBox="0 0 380 200" className="mx-auto w-full max-w-md" role="img" aria-label="Générateur, conducteur ohmique et deux condensateurs en série">
        <g stroke={ink} strokeWidth={2.4} fill="none">
          <polyline points="50,80 50,30 150,30" />
          <rect x={150} y={20} width={60} height={20} rx={3} fill="#fff" />
          <polyline points="210,30 330,30 330,62" />
          <polyline points="330,72 330,128" />
          <polyline points="330,138 330,175 50,175 50,124" />
          <line x1={312} y1={62} x2={348} y2={62} strokeWidth={4} />
          <line x1={312} y1={72} x2={348} y2={72} strokeWidth={4} />
          <line x1={312} y1={128} x2={348} y2={128} strokeWidth={4} />
          <line x1={312} y1={138} x2={348} y2={138} strokeWidth={4} />
          <circle cx={50} cy={102} r={22} fill="#fff" />
          <line x1={50} y1={80} x2={50} y2={124} strokeWidth={2} />
        </g>
        <text x={180} y={58} fontSize={14} textAnchor="middle" fontStyle="italic" fill={ink}>
          R
        </text>
        <text x={356} y={72} fontSize={13} fontStyle="italic" fill={ink}>
          C₁
        </text>
        <text x={356} y={138} fontSize={13} fontStyle="italic" fill="#1F6FD1">
          C₂ (u₂)
        </text>
        <text x={82} y={106} fontSize={14} fontStyle="italic" fill={ink}>
          E
        </text>
      </svg>
    </div>
  );
}

/** Générateur idéal de courant (gabarit D1). */
export function CurrentSourceFigure() {
  const ink = '#16324F';
  return (
    <div className="rounded-2xl bg-white/70 p-3 ring-1 ring-white/70">
      <svg viewBox="0 0 380 190" className="mx-auto w-full max-w-md" role="img" aria-label="Générateur de courant, interrupteur K, condensateur et conducteur ohmique">
        <g stroke={ink} strokeWidth={2.4} fill="none">
          <polyline points="50,72 50,30 150,30" />
          <polyline points="50,118 50,165 330,165 330,115" />
          <circle cx={50} cy={95} r={23} fill="#fff" />
          <line x1={38} y1={95} x2={62} y2={95} strokeWidth={2} />
          <polyline points="190,30 250,30 250,88" />
          <line x1={226} y1={88} x2={274} y2={88} strokeWidth={4} />
          <line x1={226} y1={100} x2={274} y2={100} strokeWidth={4} />
          <polyline points="250,100 250,165" />
          <polyline points="210,30 330,30 330,55" />
          <rect x={320} y={55} width={20} height={60} rx={3} fill="#fff" />
        </g>
        <line x1={150} y1={30} x2={185} y2={20} stroke={ink} strokeWidth={3} strokeLinecap="round" />
        <circle cx={150} cy={30} r={4} fill={ink} />
        <text x={165} y={14} fontSize={12} fill={ink}>
          K (1) / (2)
        </text>
        <text x={80} y={100} fontSize={13} fontStyle="italic" fill={ink}>
          I₀
        </text>
        <text x={282} y={98} fontSize={13} fontStyle="italic" fill={ink}>
          C
        </text>
        <text x={348} y={90} fontSize={13} fontStyle="italic" fill={ink}>
          R
        </text>
      </svg>
    </div>
  );
}

export function FigureView({ figure, onPick, picked, origin, readingLabel }: { figure: Figure; onPick?: (t: number) => void; picked?: number | null; origin?: number; readingLabel?: string }) {
  switch (figure.kind) {
    case 'plot':
      return <CurvePlot plot={figure.plot} onPick={onPick} picked={picked} origin={origin} readingLabel={readingLabel} />;
    case 'capacitors':
      return <CapacitorsFigure mode={figure.mode} c1={figure.c1} c2={figure.c2} />;
    case 'circuit':
      return (
        <div className="rounded-2xl bg-white/70 p-2 ring-1 ring-white/70">
          <CircuitDiagram k={figure.k} uC={0} i={0} E={1} R={1} C={1} offsetRef={{ current: 0 }} showValues={false} reducedMotion />
        </div>
      );
    case 'seriesRC':
      return <SeriesRCFigure />;
    case 'currentSource':
      return <CurrentSourceFigure />;
  }
}
