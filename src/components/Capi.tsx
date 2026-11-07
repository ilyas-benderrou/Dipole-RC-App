import { useId } from 'react';
import type { TutorMood } from '../content/tutor';

/**
 * Capi, le tuteur : un petit condensateur électrolytique arrondi (cylindre teal) avec de grands yeux,
 * une petite bouche, deux petits bras et ses deux pattes (les broches, de longueurs différentes).
 * Animations CSS/SVG légères selon l'état (section 15 bis).
 */
export function Capi({ mood = 'idle', level = 0.6, size = 84, confetti = false }: { mood?: TutorMood; level?: number; size?: number; confetti?: boolean }) {
  const pupilDy = mood === 'think' ? -3 : 0;
  const pupilDx = mood === 'think' ? 1.5 : mood === 'hint' ? -1.5 : 0;
  const bodyClass = mood === 'happy' ? 'capi-jump' : mood === 'hint' ? 'capi-lean' : '';
  const uid = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 120 142" aria-hidden="true" className="overflow-visible">
      <defs>
        <linearGradient id={`capi-body-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#0b6061" />
          <stop offset="0.35" stopColor="#14a19c" />
          <stop offset="0.7" stopColor="#0f7c7c" />
          <stop offset="1" stopColor="#0a5455" />
        </linearGradient>
        <linearGradient id={`capi-top-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c9f3ee" />
          <stop offset="1" stopColor="#7fd6cf" />
        </linearGradient>
      </defs>
      <g className={bodyClass}>
        <g className="capi-body">
          {/* broches (pattes) */}
          <path d="M50 108 v22 h-6" stroke="#6b7c8f" strokeWidth={4} strokeLinecap="round" fill="none" />
          <path d="M70 108 v27 h6" stroke="#6b7c8f" strokeWidth={4} strokeLinecap="round" fill="none" />
          {/* bras gauche */}
          <path d="M31 76 q-12 6 -14 17" stroke="#0c6566" strokeWidth={6} strokeLinecap="round" fill="none" />
          {/* corps */}
          <rect x={30} y={28} width={60} height={84} rx={18} fill={`url(#capi-body-${uid})`} />
          <ellipse cx={60} cy={31} rx={28} ry={7.5} fill={`url(#capi-top-${uid})`} />
          <path d="M48 31 l6 -4 M60 34 v-6 M66 31 l6 -4" stroke="#0f7c7c" strokeWidth={1.6} strokeLinecap="round" opacity={0.5} />
          {/* bande « − » */}
          <rect x={77} y={38} width={9} height={66} rx={4} fill="#d6f5f1" opacity={0.45} />
          <text x={81.5} y={58} fontSize={10} fontWeight={800} textAnchor="middle" fill="#0b5051">
            −
          </text>
          <text x={81.5} y={80} fontSize={10} fontWeight={800} textAnchor="middle" fill="#0b5051">
            −
          </text>
          {/* yeux */}
          <g className="capi-eye">
            <ellipse cx={47} cy={60} rx={8.5} ry={9.5} fill="#fff" />
            <ellipse cx={67} cy={60} rx={8.5} ry={9.5} fill="#fff" />
            <circle cx={48 + pupilDx} cy={61 + pupilDy} r={4.4} fill="#16324F" />
            <circle cx={68 + pupilDx} cy={61 + pupilDy} r={4.4} fill="#16324F" />
            <circle cx={49.5 + pupilDx} cy={59 + pupilDy} r={1.4} fill="#fff" />
            <circle cx={69.5 + pupilDx} cy={59 + pupilDy} r={1.4} fill="#fff" />
          </g>
          {/* joues */}
          <circle cx={39} cy={72} r={3.5} fill="#ff9fb8" opacity={0.55} />
          <circle cx={75} cy={72} r={3.5} fill="#ff9fb8" opacity={0.55} />
          {/* bouche */}
          {mood === 'happy' || mood === 'wave' ? (
            <path d="M50 73 q7 9 14 0 z" fill="#16324F" />
          ) : mood === 'hint' || mood === 'think' ? (
            <ellipse cx={57} cy={76} rx={3} ry={2.6} fill="#16324F" />
          ) : (
            <path d="M51 74 q6 5 12 0" stroke="#16324F" strokeWidth={2.4} strokeLinecap="round" fill="none" />
          )}
          {/* jauge sur le corps (« se charge ») */}
          <g opacity={mood === 'charge' ? 1 : 0.85}>
            <rect x={41} y={86} width={30} height={14} rx={4} fill="none" stroke="#d6f5f1" strokeWidth={2} />
            <rect x={71} y={90} width={3} height={6} rx={1} fill="#d6f5f1" />
            <rect x={43.5} y={88.5} width={Math.max(0, Math.min(1, level)) * 25} height={9} rx={2} fill="#F4D35E" style={{ transition: 'width 1s ease' }} />
          </g>
          {/* bras droit : coucou, pouce levé, ou repos */}
          {mood === 'wave' ? (
            <g className="capi-wave">
              <path d="M89 74 q12 -6 14 -20" stroke="#0c6566" strokeWidth={6} strokeLinecap="round" fill="none" />
              <circle cx={103} cy={52} r={5} fill="#14a19c" />
            </g>
          ) : mood === 'encourage' ? (
            <g>
              <path d="M89 76 q12 -2 14 -14" stroke="#0c6566" strokeWidth={6} strokeLinecap="round" fill="none" />
              <rect x={98} y={53} width={11} height={11} rx={3} fill="#14a19c" />
              <rect x={101} y={44} width={5} height={11} rx={2.5} fill="#14a19c" />
            </g>
          ) : (
            <path d="M89 76 q12 6 14 17" stroke="#0c6566" strokeWidth={6} strokeLinecap="round" fill="none" />
          )}
        </g>
      </g>
      {/* étincelle (content) */}
      {mood === 'happy' && (
        <g className="capi-spark">
          <path d="M60 2 l4 9 l9 2 l-7 6 l2 9 l-8 -5 l-8 5 l2 -9 l-7 -6 l9 -2 z" fill="#F4D35E" stroke="#e0a800" strokeWidth={1} />
        </g>
      )}
      {/* ampoule (indice) */}
      {mood === 'hint' && (
        <g transform="translate(88 0)">
          <circle cx={12} cy={12} r={9} fill="#FFE27A" stroke="#e0a800" strokeWidth={1.2} />
          <rect x={8} y={20} width={8} height={6} rx={1.5} fill="#94a3b8" />
          <path d="M12 6 v6 M9 9 h6" stroke="#b58500" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      )}
      {/* petits points (réfléchit) */}
      {mood === 'think' && (
        <g fill="#0f7c7c">
          <circle className="capi-dot" cx={90} cy={22} r={3.2} />
          <circle className="capi-dot" cx={100} cy={15} r={3.6} />
          <circle className="capi-dot" cx={111} cy={8} r={4} />
        </g>
      )}
      {/* confettis légers */}
      {confetti && (
        <g>
          {['#F4D35E', '#E67E22', '#1F6FD1', '#d9468f', '#0f7c7c', '#8b5cf6'].map((c, j) => (
            <rect key={j} className="confetti" x={10 + j * 18} y={0} width={5} height={8} rx={1} fill={c} style={{ animationDelay: `${j * 0.08}s` }} />
          ))}
        </g>
      )}
    </svg>
  );
}
