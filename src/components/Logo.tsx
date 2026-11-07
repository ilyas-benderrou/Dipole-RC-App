import { useId } from 'react';
import { APP } from '../config/app';

/** Logo RC-Lab : un condensateur stylisé (deux armatures, diélectrique jaune) dans une pastille teal. */
export function LogoMark({ size = 36 }: { size?: number }) {
  // Identifiant unique : un dégradé défini dans un SVG masqué (barre latérale sur téléphone) ne s'afficherait pas ailleurs.
  const gid = `logo-g-${useId().replace(/:/g, '')}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2bb3ad" />
          <stop offset="1" stopColor="#0b5f60" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gid})`} />
      <path d="M9 32h15M40 32h15" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <rect x="28" y="19" width="8" height="26" rx="2.5" fill="#F4D35E" />
      <path d="M26 17v30M38 17v30" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="49" cy="17" r="3.2" fill="#9fe7e1" />
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={compact ? 32 : 38} />
      <span className="leading-tight">
        <span className="block text-[1.2rem] font-bold tracking-tight text-ink">{APP.name}</span>
        {!compact && <span className="block text-[11px] font-medium text-muted">{APP.slogan}</span>}
      </span>
    </span>
  );
}
