import type { MutableRefObject } from 'react';
import { formatQuantity } from '../../physics/units';
import type { KPosition } from '../../physics/rc';

/**
 * Le schéma commun (section 6.1) : générateur E à gauche, interrupteur K en haut — position (1) reliée au générateur,
 * position (2) reliée à une branche qui contourne le générateur —, au centre le conducteur ohmique R puis le condensateur C.
 * Flèches en convention récepteur (i vers le bas, u_R et u_C vers le haut). Armature A en haut, B en bas.
 */

type Pt = [number, number];

const X_GEN = 56;
const Y_TOP = 46;
const Y_BOT = 282;
const X_MID = 226;
const X_RIGHT = 392;
const C1: Pt = [168, Y_TOP];
const C2: Pt = [284, Y_TOP];
const R_TOP = 86;
const R_BOT = 146;
const PLATE_A = 192;
const PLATE_B = 208;

/** Trajet des électrons pendant la charge : de A vers B en passant par le générateur. */
const CHARGE_PATH: Pt[] = [
  [X_MID, PLATE_A - 2],
  [X_MID, Y_TOP],
  [C1[0], Y_TOP],
  [X_GEN, Y_TOP],
  [X_GEN, Y_BOT],
  [X_MID, Y_BOT],
  [X_MID, PLATE_B + 2],
];
/** Trajet des électrons pendant la décharge : de B vers A par la branche (2) et le conducteur ohmique. */
const DISCHARGE_PATH: Pt[] = [
  [X_MID, PLATE_B + 2],
  [X_MID, Y_BOT],
  [X_RIGHT, Y_BOT],
  [X_RIGHT, Y_TOP],
  [C2[0], Y_TOP],
  [X_MID, Y_TOP],
  [X_MID, PLATE_A - 2],
];

function pathLength(p: Pt[]): number {
  let L = 0;
  for (let j = 1; j < p.length; j++) L += Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]);
  return L;
}

function pointAt(p: Pt[], s: number): Pt {
  let rest = s;
  for (let j = 1; j < p.length; j++) {
    const seg = Math.hypot(p[j][0] - p[j - 1][0], p[j][1] - p[j - 1][1]);
    if (rest <= seg) {
      const f = rest / seg;
      return [p[j - 1][0] + f * (p[j][0] - p[j - 1][0]), p[j - 1][1] + f * (p[j][1] - p[j - 1][1])];
    }
    rest -= seg;
  }
  return p[p.length - 1];
}

const SPACING = 24;

function Electrons({ k, offsetRef, reduced }: { k: KPosition; offsetRef: MutableRefObject<number>; reduced: boolean }) {
  const path = k === 1 ? CHARGE_PATH : DISCHARGE_PATH;
  const L = pathLength(path);
  const n = Math.floor(L / SPACING);
  // La boucle de simulation provoque déjà un rendu par image : on lit simplement l'offset courant.
  const off = reduced ? 0 : ((offsetRef.current % SPACING) + SPACING) % SPACING;
  const dots: Pt[] = [];
  for (let j = 0; j < n; j++) {
    const s = (j * SPACING + off) % L;
    dots.push(pointAt(path, s));
  }
  return (
    <g aria-hidden="true">
      {dots.map(([x, y], j) => (
        <circle key={j} cx={x} cy={y} r={3.4} fill="url(#electron-grad)" />
      ))}
    </g>
  );
}

function Arrow({ x1, y1, x2, y2, color, width = 1.8, head = 7 }: { x1: number; y1: number; x2: number; y2: number; color: string; width?: number; head?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hx1 = x2 - head * Math.cos(a - 0.45);
  const hy1 = y2 - head * Math.sin(a - 0.45);
  const hx2 = x2 - head * Math.cos(a + 0.45);
  const hy2 = y2 - head * Math.sin(a + 0.45);
  return (
    <g>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
      <path d={`M${x2},${y2} L${hx1},${hy1} L${hx2},${hy2} Z`} fill={color} />
    </g>
  );
}

export interface CircuitDiagramProps {
  k: KPosition;
  uC: number;
  i: number;
  E: number;
  R: number;
  C: number;
  offsetRef: MutableRefObject<number>;
  showValues?: boolean;
  reducedMotion?: boolean;
  className?: string;
  onToggleK?: (k: KPosition) => void;
  kLocked?: boolean;
}

export function CircuitDiagram({ k, uC, i, E, R, C, offsetRef, showValues = true, reducedMotion = false, className = '', onToggleK, kLocked }: CircuitDiagramProps) {
  const iRef = Math.max(1e-12, E / R);
  const rel = Math.min(1.2, Math.abs(i) / iRef);
  const showReal = rel > 0.004;
  const qRef = Math.max(E, Math.abs(uC), 1e-9);
  const nSigns = Math.round(6 * Math.min(1, Math.abs(uC) / qRef));
  const positiveA = uC >= 0;
  const genActive = k === 1;
  const ink = '#16324F';
  const wire = '#2a4a68';
  const bladeEnd: Pt = k === 1 ? [C1[0] + 4, Y_TOP - 7] : [C2[0] - 4, Y_TOP - 7];

  return (
    <svg viewBox="0 0 440 310" className={`h-auto w-full select-none ${className}`} role="img" aria-label={`Schéma du circuit RC, interrupteur K en position ${k}, u_C = ${uC.toFixed(2)} V`}>
      <defs>
        <radialGradient id="electron-grad" cx="35%" cy="35%" r="65%">
          <stop offset="0" stopColor="#bfe0ff" />
          <stop offset="0.55" stopColor="#3b8cf0" />
          <stop offset="1" stopColor="#1849a8" />
        </radialGradient>
      </defs>

      {/* Fils */}
      <g stroke={wire} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round">
        <polyline points={`${X_GEN},141 ${X_GEN},${Y_TOP} ${C1[0]},${Y_TOP}`} opacity={genActive ? 1 : 0.45} />
        <polyline points={`${X_GEN},189 ${X_GEN},${Y_BOT} ${X_MID},${Y_BOT}`} opacity={genActive ? 1 : 0.45} />
        <polyline points={`${C2[0]},${Y_TOP} ${X_RIGHT},${Y_TOP} ${X_RIGHT},${Y_BOT} ${X_MID},${Y_BOT}`} opacity={k === 2 ? 1 : 0.55} />
        <line x1={X_MID} y1={Y_TOP} x2={X_MID} y2={R_TOP} />
        <line x1={X_MID} y1={R_BOT} x2={X_MID} y2={PLATE_A} />
        <line x1={X_MID} y1={PLATE_B} x2={X_MID} y2={Y_BOT} />
      </g>

      <Electrons k={k} offsetRef={offsetRef} reduced={reducedMotion} />

      {/* Générateur E */}
      <g opacity={genActive ? 1 : 0.4}>
        <circle cx={X_GEN} cy={165} r={24} fill="#ffffff" stroke={ink} strokeWidth={2.4} />
        <line x1={X_GEN} y1={141} x2={X_GEN} y2={189} stroke={ink} strokeWidth={2} />
        <Arrow x1={94} y1={186} x2={94} y2={146} color={ink} />
        <text x={103} y={170} fontSize={15} fontStyle="italic" fill={ink} fontWeight={600}>
          E
        </text>
        {showValues && (
          <text x={X_GEN} y={215} fontSize={11} textAnchor="middle" fill="#3d5873">
            {String(E).replace('.', ',')} V
          </text>
        )}
      </g>

      {/* Interrupteur K */}
      <g>
        <circle cx={C1[0]} cy={Y_TOP} r={4} fill="#fff" stroke={ink} strokeWidth={2} />
        <circle cx={C2[0]} cy={Y_TOP} r={4} fill="#fff" stroke={ink} strokeWidth={2} />
        <circle cx={X_MID} cy={Y_TOP} r={4.5} fill={ink} />
        <line x1={X_MID} y1={Y_TOP} x2={bladeEnd[0]} y2={bladeEnd[1]} stroke={ink} strokeWidth={3} strokeLinecap="round" style={{ transition: 'all 0.25s ease' }} />
        <text x={X_MID} y={24} fontSize={15} textAnchor="middle" fontWeight={700} fill={ink}>
          K
        </text>
        <text x={C1[0]} y={30} fontSize={12} textAnchor="middle" fill={ink}>
          (1)
        </text>
        <text x={C2[0]} y={30} fontSize={12} textAnchor="middle" fill={ink}>
          (2)
        </text>
        {onToggleK && !kLocked && (
          <>
            <rect x={C1[0] - 22} y={14} width={44} height={44} fill="transparent" className="cursor-pointer" onClick={() => onToggleK(1)}>
              <title>Basculer K en position 1</title>
            </rect>
            <rect x={C2[0] - 22} y={14} width={44} height={44} fill="transparent" className="cursor-pointer" onClick={() => onToggleK(2)}>
              <title>Basculer K en position 2</title>
            </rect>
          </>
        )}
      </g>

      {/* Orientation de i (flèche fine, vers le bas) */}
      <Arrow x1={X_MID} y1={56} x2={X_MID} y2={78} color={ink} width={1.6} />
      <text x={X_MID - 12} y={74} fontSize={14} fontStyle="italic" textAnchor="end" fill={ink} fontWeight={600}>
        i
      </text>

      {/* Conducteur ohmique R */}
      <rect x={X_MID - 12} y={R_TOP} width={24} height={R_BOT - R_TOP} rx={3} fill="#ffffff" stroke={ink} strokeWidth={2.4} />
      <text x={X_MID + 22} y={120} fontSize={15} fontStyle="italic" fill={ink} fontWeight={600}>
        R
      </text>
      {showValues && (
        <text x={X_MID + 22} y={136} fontSize={11} fill="#3d5873">
          {formatQuantity(R, 'resistance')}
        </text>
      )}
      {/* u_R (convention récepteur : vers le haut) */}
      <Arrow x1={X_MID - 30} y1={R_BOT - 4} x2={X_MID - 30} y2={R_TOP + 4} color="#8b5cf6" />
      <text x={X_MID - 38} y={122} fontSize={13} fontStyle="italic" textAnchor="end" fill="#8b5cf6" fontWeight={600}>
        u<tspan fontSize={10} dy={3}>R</tspan>
      </text>

      {/* Sens réel du courant (orange) */}
      {showReal && (
        <g opacity={Math.max(0.35, Math.min(1, rel * 1.4))}>
          {i > 0 ? (
            <Arrow x1={X_MID + 72} y1={92} x2={X_MID + 72} y2={142} color="#E67E22" width={4} head={11} />
          ) : (
            <Arrow x1={X_MID + 72} y1={142} x2={X_MID + 72} y2={92} color="#E67E22" width={4} head={11} />
          )}
          <text x={X_MID + 84} y={112} fontSize={10.5} fill="#b95e10" fontWeight={600}>
            sens
          </text>
          <text x={X_MID + 84} y={125} fontSize={10.5} fill="#b95e10" fontWeight={600}>
            réel
          </text>
        </g>
      )}

      {/* Condensateur C : armature A en haut, B en bas, diélectrique jaune (jamais traversé) */}
      <rect x={X_MID - 30} y={PLATE_A + 2} width={60} height={PLATE_B - PLATE_A - 4} fill="#F4D35E" opacity={0.95} />
      <line x1={X_MID - 32} y1={PLATE_A} x2={X_MID + 32} y2={PLATE_A} stroke={ink} strokeWidth={4} strokeLinecap="round" />
      <line x1={X_MID - 32} y1={PLATE_B} x2={X_MID + 32} y2={PLATE_B} stroke={ink} strokeWidth={4} strokeLinecap="round" />
      <text x={X_MID + 40} y={PLATE_A + 2} fontSize={12} fill={ink} fontWeight={700}>
        A
      </text>
      <text x={X_MID + 40} y={PLATE_B + 10} fontSize={12} fill={ink} fontWeight={700}>
        B
      </text>
      <text x={X_MID + 58} y={PLATE_A + 12} fontSize={15} fontStyle="italic" fill={ink} fontWeight={600}>
        C
      </text>
      {showValues && (
        <text x={X_MID + 58} y={PLATE_A + 27} fontSize={11} fill="#3d5873">
          {formatQuantity(C, 'capacite')}
        </text>
      )}
      {Array.from({ length: nSigns }, (_, j) => {
        const x = X_MID - 25 + (j * 50) / Math.max(1, 5);
        return (
          <g key={j} fontSize={12} fontWeight={800} textAnchor="middle">
            <text x={x} y={PLATE_A - 5} fill={positiveA ? '#d64545' : '#1f6fd1'}>
              {positiveA ? '+' : '−'}
            </text>
            <text x={x} y={PLATE_B + 15} fill={positiveA ? '#1f6fd1' : '#d64545'}>
              {positiveA ? '−' : '+'}
            </text>
          </g>
        );
      })}
      {/* u_C (vers le haut) */}
      <Arrow x1={X_MID - 50} y1={PLATE_B + 10} x2={X_MID - 50} y2={PLATE_A - 10} color="#1F6FD1" />
      <text x={X_MID - 58} y={PLATE_A + 12} fontSize={13} fontStyle="italic" textAnchor="end" fill="#1F6FD1" fontWeight={600}>
        u<tspan fontSize={10} dy={3}>C</tspan>
      </text>
    </svg>
  );
}
