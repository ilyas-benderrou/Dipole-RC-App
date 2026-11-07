import { X } from 'lucide-react';
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { LEVEL_LABELS } from '../content/competences';
import type { Level } from '../engine/types';

type Variant = 'primary' | 'secondary' | 'ghost' | 'warn' | 'success' | 'white';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-teal-600 text-white hover:bg-teal-700 shadow-[0_10px_24px_-12px_rgba(15,124,124,0.9)] disabled:bg-teal-300 disabled:shadow-none',
  secondary: 'bg-white/80 text-teal-700 ring-1 ring-teal-200 hover:bg-white disabled:text-slate-400 disabled:ring-slate-200',
  ghost: 'text-ink-soft hover:bg-white/60 disabled:text-slate-400',
  warn: 'bg-warn-500 text-white hover:bg-warn-700 disabled:opacity-50',
  success: 'bg-ok-500 text-white hover:bg-ok-700 disabled:opacity-50',
  white: 'bg-white text-teal-700 hover:bg-teal-50 shadow-sm',
};

export function Button({
  variant = 'primary',
  className = '',
  size = 'md',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const sizes = { xs: 'px-2.5 py-1 text-xs', sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors disabled:cursor-not-allowed ${sizes[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

export function Card({
  children,
  className = '',
  title,
  action,
  subtitle,
  as: Tag = 'section',
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: 'section' | 'div' | 'article';
}) {
  return (
    <Tag className={`glass p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="text-[1.05rem] font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
          </div>
          {action && <div className="text-sm font-medium text-teal-700">{action}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

export type PastilleColor = 'violet' | 'rose' | 'orange' | 'teal' | 'blue';

export function Pastille({ color = 'teal', children, size = 40 }: { color?: PastilleColor; children: ReactNode; size?: number }) {
  return (
    <span className={`pastille pastille-${color} shrink-0`} style={{ width: size, height: size }} aria-hidden="true">
      {children}
    </span>
  );
}

/** Petite carte statistique (« POSSESSION 65 % » dans la référence → « NIVEAU », « τ MESURÉ »…). */
export function StatCard({ label, value, unit, icon, color = 'teal', hint }: { label: string; value: ReactNode; unit?: string; icon: ReactNode; color?: PastilleColor; hint?: string }) {
  return (
    <div className="glass flex items-start gap-3 p-4 sm:p-5">
      <Pastille color={color}>{icon}</Pastille>
      <div className="min-w-0">
        <p className="label-caps">{label}</p>
        <p className="mt-0.5 text-[1.7rem] font-semibold leading-tight tracking-tight text-ink sm:text-3xl">
          {value}
          {unit && <span className="ml-0.5 text-lg font-medium text-ink-soft">{unit}</span>}
        </p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
    </div>
  );
}

const LEVEL_STYLES: Record<Level, string> = {
  facile: 'bg-teal-50 text-teal-700 ring-teal-200',
  moyen: 'bg-blue-50 text-blue-700 ring-blue-200',
  difficile: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function LevelBadge({ level, className = '' }: { level: Level; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${LEVEL_STYLES[level]} ${className}`}>
      Niveau {LEVEL_LABELS[level].toLowerCase()}
    </span>
  );
}

export function Badge({ children, tone = 'slate', className = '' }: { children: ReactNode; tone?: 'slate' | 'teal' | 'ok' | 'warn' | 'violet' | 'blue' | 'rose'; className?: string }) {
  const tones = {
    slate: 'bg-white/70 text-ink-soft ring-slate-200',
    teal: 'bg-teal-50 text-teal-700 ring-teal-200',
    ok: 'bg-ok-50 text-ok-700 ring-ok-100',
    warn: 'bg-warn-50 text-warn-700 ring-warn-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-200',
    blue: 'bg-blue-50 text-blue-700 ring-blue-200',
    rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${tones[tone]} ${className}`}>{children}</span>;
}

export function Spinner({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="grid place-items-center py-16 text-muted" role="status">
      <span className="mb-2 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Message de feedback : orange doux pour une erreur (jamais de rouge agressif), vert pour une réussite. */
export function Notice({ tone, title, children, icon, className = '' }: { tone: 'info' | 'warn' | 'ok' | 'tip'; title?: ReactNode; children?: ReactNode; icon?: ReactNode; className?: string }) {
  const tones = {
    info: 'bg-teal-50/90 ring-teal-200 text-teal-900',
    warn: 'bg-warn-50/95 ring-warn-100 text-warn-700',
    ok: 'bg-ok-50/95 ring-ok-100 text-ok-700',
    tip: 'bg-amber-50/95 ring-amber-200 text-amber-900',
  };
  return (
    <div className={`animate-fade rounded-2xl p-3 ring-1 sm:p-4 ${tones[tone]} ${className}`} role="status" aria-live="polite">
      <div className="flex gap-3">
        {icon && <div className="shrink-0 pt-0.5">{icon}</div>}
        <div className="min-w-0">
          {title && <p className="font-semibold">{title}</p>}
          {children && <div className="text-sm leading-relaxed text-ink-soft">{children}</div>}
        </div>
      </div>
    </div>
  );
}

/** Barre de maîtrise (0–100) colorée selon le niveau. */
export function MasteryBar({ value, className = '', height = 8 }: { value: number; className?: string; height?: number }) {
  const color = value >= 70 ? 'bg-gradient-to-r from-teal-400 to-teal-600' : value >= 40 ? 'bg-gradient-to-r from-sky-300 to-uc' : 'bg-gradient-to-r from-amber-200 to-warn-500';
  return (
    <div className={`overflow-hidden rounded-full bg-ink/8 ${className}`} style={{ height }} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-fill bar-grow h-full rounded-full ${color}`} style={{ width: `${Math.max(2, value)}%` }} />
    </div>
  );
}

export function ProgressBar({ value, className = '', color = 'bg-teal-600' }: { value: number; className?: string; color?: string }) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-ink/8 ${className}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className={`bar-fill h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function EmptyState({ title, children, image }: { title: string; children?: ReactNode; image?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      {image && <img src={image} alt="" className="h-32 w-auto object-contain opacity-95" loading="lazy" />}
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="max-w-md text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/25 p-3 backdrop-blur-sm" role="dialog" aria-modal="true" onMouseDown={onClose}>
      <div className={`glass glass-strong page-enter max-h-[92vh] w-full overflow-y-auto p-4 sm:p-6 ${wide ? 'max-w-4xl' : 'max-w-lg'}`} onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-muted hover:bg-white/70" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items, className = '' }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode }[]; className?: string }) {
  return (
    <div className={`thin-scroll inline-flex max-w-full gap-1 overflow-x-auto rounded-2xl bg-white/45 p-1 ring-1 ring-white/70 ${className}`} role="tablist">
      {items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="tab"
          aria-selected={value === it.id}
          onClick={() => onChange(it.id)}
          className={`whitespace-nowrap rounded-xl px-3 py-1.5 text-sm font-semibold transition ${value === it.id ? 'bg-teal-600 text-white shadow' : 'text-ink-soft hover:bg-white/70'}`}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, children, hint, className = '' }: { label: ReactNode; children: ReactNode; hint?: ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-semibold text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Bandeau des données fictives (section 16 et 18). */
export function DemoBanner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl bg-amber-100/80 px-3 py-1.5 text-xs font-semibold text-amber-900 ring-1 ring-amber-200 ${className}`} role="note">
      <span aria-hidden="true">⚠</span> Données fictives de démonstration
    </div>
  );
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'jamais';
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
}

export function formatDuration(sec: number): string {
  if (sec < 60) return `${Math.round(sec)} s`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m < 60) return s ? `${m} min ${s} s` : `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, '0')}`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
