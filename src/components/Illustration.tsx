import { useState, type ReactNode } from 'react';

export type IllustrationName = 'banner-3d' | 'hero-lab' | 'empty-lab' | 'trophy' | 'capacitor';

/**
 * Illustrations « rendu 3D doux » (section 15.3). Utilise l'image WebP générée si elle existe
 * (public/images/<nom>.webp, voir scripts/generate-images.mjs), sinon un rendu SVG de secours dessiné par le code.
 */
export function Illustration({ name, className = '', alt = '' }: { name: IllustrationName; className?: string; alt?: string }) {
  const [failed, setFailed] = useState(false);
  if (!failed) return <img src={`images/${name}.webp`} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />;
  const Fallback = FALLBACKS[name];
  return <Fallback className={className} />;
}

function Defs() {
  return (
    <defs>
      <linearGradient id="il-cap" x1="0" x2="1">
        <stop offset="0" stopColor="#123a73" />
        <stop offset="0.38" stopColor="#3a7ee0" />
        <stop offset="0.7" stopColor="#1f5bb8" />
        <stop offset="1" stopColor="#0f2b57" />
      </linearGradient>
      <linearGradient id="il-capTop" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d6e6fb" />
        <stop offset="1" stopColor="#8fb5ea" />
      </linearGradient>
      <linearGradient id="il-res" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#fbefd6" />
        <stop offset="0.6" stopColor="#e8cf9c" />
        <stop offset="1" stopColor="#c9aa6e" />
      </linearGradient>
      <radialGradient id="il-e" cx="35%" cy="30%" r="70%">
        <stop offset="0" stopColor="#eef6ff" />
        <stop offset="0.45" stopColor="#5fa8ff" />
        <stop offset="1" stopColor="#1849a8" />
      </radialGradient>
      <linearGradient id="il-plat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5b9cf5" />
        <stop offset="1" stopColor="#1d4ed8" />
      </linearGradient>
      <linearGradient id="il-gold" x1="0" x2="1">
        <stop offset="0" stopColor="#b8860b" />
        <stop offset="0.35" stopColor="#ffe08a" />
        <stop offset="0.6" stopColor="#f2c14e" />
        <stop offset="1" stopColor="#a87405" />
      </linearGradient>
      <linearGradient id="il-teal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5fd0c9" />
        <stop offset="1" stopColor="#0b6061" />
      </linearGradient>
      <linearGradient id="il-desk" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#e9f3f1" />
        <stop offset="1" stopColor="#c5ddd9" />
      </linearGradient>
      <linearGradient id="il-board" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="1" stopColor="#e3ebf2" />
      </linearGradient>
    </defs>
  );
}

function Electron({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="url(#il-e)" />
      <circle cx={cx - r * 0.35} cy={cy - r * 0.38} r={r * 0.28} fill="#fff" opacity={0.75} />
    </g>
  );
}

function Capacitor({ x, y, w = 58, h = 118 }: { x: number; y: number; w?: number; h?: number }) {
  return (
    <g>
      <path d={`M${x + w * 0.32} ${y + h - 4} v${h * 0.16} M${x + w * 0.68} ${y + h - 4} v${h * 0.22}`} stroke="#9aa7b4" strokeWidth={4} strokeLinecap="round" />
      <rect x={x} y={y} width={w} height={h} rx={w * 0.24} fill="url(#il-cap)" />
      <ellipse cx={x + w / 2} cy={y + 3} rx={w / 2} ry={w * 0.14} fill="url(#il-capTop)" />
      <rect x={x + w * 0.76} y={y + 10} width={w * 0.15} height={h - 22} rx={4} fill="#d8e6f8" opacity={0.5} />
      <rect x={x + w * 0.12} y={y + 8} width={w * 0.1} height={h - 18} rx={3} fill="#fff" opacity={0.2} />
    </g>
  );
}

function Resistor({ x, y, angle = -18 }: { x: number; y: number; angle?: number }) {
  return (
    <g transform={`rotate(${angle} ${x + 50} ${y + 18})`}>
      <path d={`M${x - 28} ${y + 18} h30 M${x + 100} ${y + 18} h30`} stroke="#9aa7b4" strokeWidth={4} strokeLinecap="round" />
      <rect x={x} y={y} width={104} height={36} rx={18} fill="url(#il-res)" />
      <rect x={x + 20} y={y} width={8} height={36} fill="#8b5a2b" />
      <rect x={x + 36} y={y} width={8} height={36} fill="#1f2937" />
      <rect x={x + 52} y={y} width={8} height={36} fill="#dc2626" />
      <rect x={x + 80} y={y} width={6} height={36} fill="#d4a017" />
      <rect x={x + 6} y={y + 4} width={92} height={6} rx={3} fill="#fff" opacity={0.45} />
    </g>
  );
}

function Banner3D({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 230" className={className} aria-hidden="true">
      <Defs />
      <ellipse cx="190" cy="206" rx="118" ry="16" fill="#073f40" opacity="0.28" />
      <path d="M86 176 h208 l-16 30 h-176 z" fill="url(#il-plat)" />
      <ellipse cx="190" cy="176" rx="104" ry="10" fill="#7fb2f7" />
      <Capacitor x={172} y={58} />
      <Resistor x={74} y={112} />
      <Electron cx={266} cy={56} r={15} />
      <Electron cx={290} cy={100} r={10} />
      <Electron cx={138} cy={46} r={12} />
      <Electron cx={252} cy={140} r={8} />
      <Electron cx={110} cy={74} r={7} />
    </svg>
  );
}

function HeroLab({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 640 300" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice">
      <Defs />
      <rect width="640" height="300" fill="#dff1ec" />
      <circle cx="560" cy="40" r="120" fill="#cfc6f3" opacity="0.6" />
      <circle cx="60" cy="280" r="140" fill="#bfe8dc" opacity="0.7" />
      <path d="M0 220 h640 v80 h-640 z" fill="url(#il-desk)" />
      {/* oscilloscope */}
      <rect x="360" y="70" width="210" height="150" rx="22" fill="#e8eef5" />
      <rect x="376" y="86" width="140" height="104" rx="12" fill="#0d2b2c" />
      <path d="M388 176 C 410 120, 440 104, 504 100" stroke="#f4d35e" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M388 100 h116 M388 138 h116 M432 92 v92 M470 92 v92" stroke="#9fe7e1" strokeOpacity="0.2" />
      <circle cx="540" cy="110" r="10" fill="#0f7c7c" />
      <circle cx="540" cy="146" r="10" fill="#E67E22" />
      <rect x="528" y="172" width="24" height="10" rx="5" fill="#94a3b8" />
      {/* plaque d'essai */}
      <rect x="90" y="176" width="240" height="56" rx="12" fill="url(#il-board)" />
      {Array.from({ length: 10 }, (_, j) => (
        <circle key={j} cx={108 + j * 22} cy={222} r={3} fill="#cbd5e1" />
      ))}
      <Capacitor x={120} y={92} w={46} h={92} />
      <Resistor x={200} y={150} angle={-6} />
      <Electron cx={290} cy={70} r={14} />
      <Electron cx={320} cy={112} r={9} />
      <Electron cx={98} cy={70} r={10} />
      <Electron cx={600} cy={226} r={12} />
    </svg>
  );
}

function EmptyLab({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 200" className={className} aria-hidden="true">
      <Defs />
      <ellipse cx="130" cy="180" rx="100" ry="12" fill="#0b3f40" opacity="0.18" />
      <rect x="40" y="128" width="180" height="40" rx="14" fill="url(#il-teal)" />
      <rect x="48" y="122" width="164" height="14" rx="7" fill="#9fe7e1" />
      <Capacitor x={70} y={40} w={46} h={86} />
      <Resistor x={132} y={86} angle={-10} />
      <Electron cx={190} cy={46} r={12} />
      <Electron cx={214} cy={76} r={8} />
      <Electron cx={150} cy={34} r={7} />
    </svg>
  );
}

function Trophy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 240" className={className} aria-hidden="true">
      <Defs />
      <ellipse cx="120" cy="222" rx="80" ry="10" fill="#073f40" opacity="0.28" />
      <rect x="62" y="186" width="116" height="30" rx="10" fill="url(#il-teal)" />
      <rect x="84" y="166" width="72" height="24" rx="8" fill="url(#il-gold)" />
      <rect x="110" y="132" width="20" height="38" rx="6" fill="url(#il-gold)" />
      {/* coupe en forme de symbole de condensateur : deux armatures parallèles */}
      <path d="M58 54 h124" stroke="url(#il-gold)" strokeWidth="10" strokeLinecap="round" />
      <rect x="74" y="40" width="26" height="96" rx="12" fill="url(#il-gold)" />
      <rect x="140" y="40" width="26" height="96" rx="12" fill="url(#il-gold)" />
      <rect x="104" y="58" width="32" height="64" rx="8" fill="#F4D35E" opacity="0.9" />
      <path d="M74 120 q46 34 92 0" stroke="url(#il-gold)" strokeWidth="10" fill="none" strokeLinecap="round" />
      <rect x="80" y="46" width="6" height="80" rx="3" fill="#fff" opacity="0.55" />
      <Electron cx={40} cy={70} r={12} />
      <Electron cx={204} cy={52} r={14} />
      <Electron cx={210} cy={120} r={8} />
      <Electron cx={30} cy={130} r={7} />
    </svg>
  );
}

function CapacitorArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <Defs />
      <ellipse cx="100" cy="182" rx="60" ry="9" fill="#073f40" opacity="0.2" />
      <g transform="rotate(-10 100 100)">
        <Capacitor x={72} y={34} w={56} h={116} />
      </g>
      <ellipse cx="100" cy="96" rx="86" ry="30" fill="none" stroke="#9fc4f5" strokeWidth="2" strokeDasharray="4 6" />
      <Electron cx={18} cy={98} r={10} />
      <Electron cx={176} cy={84} r={12} />
      <Electron cx={120} cy={126} r={8} />
    </svg>
  );
}

const FALLBACKS: Record<IllustrationName, (p: { className?: string }) => ReactNode> = {
  'banner-3d': Banner3D,
  'hero-lab': HeroLab,
  'empty-lab': EmptyLab,
  trophy: Trophy,
  capacitor: CapacitorArt,
};
