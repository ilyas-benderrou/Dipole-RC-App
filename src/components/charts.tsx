import { COMPETENCES, type Competence, type Level } from '../engine/types';

/**
 * Graphiques SVG du tableau de bord et du bilan (couleurs de la section 15).
 */
export const CHART_COLORS = {
  teal: '#0f7c7c',
  tealSoft: '#7fd6cf',
  blue: '#1F6FD1',
  orange: '#E67E22',
  orangeSoft: '#f6c08e',
  violet: '#8b5cf6',
  rose: '#d9468f',
  green: '#1fa971',
  gray: '#cbd5e1',
};

const COMP_COLORS: Record<Competence, string> = { C1: '#0f7c7c', C2: '#1F6FD1', C3: '#8b5cf6', C4: '#E67E22', C5: '#d9468f', C6: '#1fa971' };

/** Barres horizontales (pourcentages). */
export function HBarChart({ rows, max = 100, unit = '%', color = CHART_COLORS.teal }: { rows: { label: string; sub?: string; value: number; tooltip?: string; color?: string }[]; max?: number; unit?: string; color?: string }) {
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[3rem_minmax(0,1fr)_3.2rem] items-center gap-2 text-sm sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3.2rem]" title={r.tooltip}>
          <span className="truncate text-ink-soft">
            <b className="text-ink">{r.label}</b>
            {r.sub && <span className="hidden sm:inline"> · {r.sub}</span>}
          </span>
          <div className="h-5 overflow-hidden rounded-lg bg-ink/6">
            <div className="bar-fill bar-grow h-full rounded-lg" style={{ width: `${max ? Math.min(100, (r.value / max) * 100) : 0}%`, background: r.color ?? color }} role="img" aria-label={`${r.label} : ${r.value} ${unit}`} />
          </div>
          <span className="text-right tabular-nums text-ink">
            {r.value}
            {unit && ` ${unit}`}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Barres horizontales empilées (ex. conception erronée / manque de connaissance). */
export function StackedBarChart({ rows, legend }: { rows: { label: string; sub?: string; parts: number[] }[]; legend: { label: string; color: string }[] }) {
  return (
    <div>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const total = r.parts.reduce((s, v) => s + v, 0);
          return (
            <li key={r.label} className="grid grid-cols-[3rem_minmax(0,1fr)_3.2rem] items-center gap-2 text-sm sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_3.2rem]">
              <span className="truncate text-ink-soft">
                <b className="text-ink">{r.label}</b>
                {r.sub && <span className="hidden sm:inline"> · {r.sub}</span>}
              </span>
              <div className="flex h-5 overflow-hidden rounded-lg bg-ink/6" role="img" aria-label={`${r.label} : ${r.parts.map((p, j) => `${legend[j].label} ${p} %`).join(', ')}`}>
                {r.parts.map((p, j) => (
                  <div key={j} className="bar-fill h-full" style={{ width: `${p}%`, background: legend[j].color }} title={`${legend[j].label} : ${p} %`} />
                ))}
              </div>
              <span className="text-right tabular-nums text-ink">{total} %</span>
            </li>
          );
        })}
      </ul>
      <Legend items={legend} />
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
      {items.map((l) => (
        <span key={l.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: l.color }} /> {l.label}
        </span>
      ))}
    </div>
  );
}

/** Barres verticales groupées (ex. erreurs avant / après, par groupe). */
export function GroupedBarChart({
  categories,
  series,
  max = 100,
  height = 220,
  unit = '%',
  errorBars,
}: {
  categories: string[];
  series: { label: string; color: string; values: number[] }[];
  max?: number;
  height?: number;
  unit?: string;
  errorBars?: number[][];
}) {
  const W = 640;
  const H = height;
  const pad = { l: 40, r: 10, t: 14, b: 28 };
  const groupW = (W - pad.l - pad.r) / categories.length;
  const barW = Math.min(28, (groupW * 0.75) / series.length);
  const y = (v: number) => pad.t + (1 - Math.min(v, max) / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max * 10) / 10);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Graphique en barres groupées">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#e2e8f0" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize={10.5} fill="#6c8299">
              {String(t).replace('.', ',')}
            </text>
          </g>
        ))}
        {categories.map((c, i) => {
          const x0 = pad.l + i * groupW + (groupW - barW * series.length) / 2;
          return (
            <g key={c}>
              {series.map((s, j) => {
                const v = s.values[i] ?? 0;
                const err = errorBars?.[j]?.[i];
                const cx = x0 + j * barW + barW / 2;
                return (
                  <g key={s.label}>
                    <rect x={x0 + j * barW + 1} y={y(v)} width={barW - 2} height={Math.max(0, H - pad.b - y(v))} rx={4} fill={s.color}>
                      <title>{`${c} · ${s.label} : ${String(Math.round(v * 10) / 10).replace('.', ',')} ${unit}`}</title>
                    </rect>
                    {err !== undefined && err > 0 && (
                      <g stroke="#16324F" strokeWidth={1.2}>
                        <line x1={cx} x2={cx} y1={y(v + err)} y2={y(Math.max(0, v - err))} />
                        <line x1={cx - 4} x2={cx + 4} y1={y(v + err)} y2={y(v + err)} />
                        <line x1={cx - 4} x2={cx + 4} y1={y(Math.max(0, v - err))} y2={y(Math.max(0, v - err))} />
                      </g>
                    )}
                  </g>
                );
              })}
              <text x={pad.l + i * groupW + groupW / 2} y={H - 9} textAnchor="middle" fontSize={11.5} fill="#3d5873" fontWeight={600}>
                {c}
              </text>
            </g>
          );
        })}
      </svg>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}

/** Nuage de points pré (x) / post (y) avec la diagonale y = x. */
export function ScatterPrePost({ points, max = 20 }: { points: { x: number; y: number; color: string; label: string }[]; max?: number }) {
  const S = 320;
  const pad = 36;
  const sc = (v: number) => pad + (v / max) * (S - 2 * pad);
  const sy = (v: number) => S - pad - (v / max) * (S - 2 * pad);
  const ticks = [0, 5, 10, 15, 20];
  return (
    <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto w-full max-w-sm" role="img" aria-label="Gains individuels : pré-test en abscisse, post-test en ordonnée">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sc(t)} x2={sc(t)} y1={sy(0)} y2={sy(max)} stroke="#eef2f6" />
          <line x1={sc(0)} x2={sc(max)} y1={sy(t)} y2={sy(t)} stroke="#eef2f6" />
          <text x={sc(t)} y={S - pad + 15} textAnchor="middle" fontSize={10.5} fill="#6c8299">
            {t}
          </text>
          <text x={pad - 7} y={sy(t) + 4} textAnchor="end" fontSize={10.5} fill="#6c8299">
            {t}
          </text>
        </g>
      ))}
      <line x1={sc(0)} y1={sy(0)} x2={sc(max)} y2={sy(max)} stroke="#94a3b8" strokeDasharray="5 4" />
      <text x={sc(max) - 4} y={sy(max) + 14} textAnchor="end" fontSize={10.5} fill="#94a3b8">
        y = x
      </text>
      {points.map((p, j) => (
        <circle key={j} cx={sc(p.x)} cy={sy(p.y)} r={5.5} fill={p.color} fillOpacity={0.8} stroke="#fff" strokeWidth={1.5}>
          <title>{`${p.label} : pré ${String(p.x).replace('.', ',')} → post ${String(p.y).replace('.', ',')}`}</title>
        </circle>
      ))}
      <text x={S / 2} y={S - 4} textAnchor="middle" fontSize={11} fill="#3d5873" fontWeight={600}>
        Pré-test (/20)
      </text>
      <text x={10} y={S / 2} fontSize={11} fill="#3d5873" fontWeight={600} transform={`rotate(-90 10 ${S / 2})`} textAnchor="middle">
        Post-test (/20)
      </text>
    </svg>
  );
}

const LEVEL_BAND: Record<Level, string> = { facile: '#ebf7f6', moyen: '#e5efff', difficile: '#f0ebff' };

/** Courbe de progression des compétences (moyenne + C1–C6 en option), niveau en arrière-plan. */
export function ProgressChart({ series, showCompetences = false }: { series: { at: string; mastery: number; level: Level; competences: Record<Competence, number> }[]; showCompetences?: boolean }) {
  if (series.length < 2) return <p className="text-sm text-muted">Pas encore assez de tentatives pour tracer une courbe.</p>;
  const W = 640;
  const H = 220;
  const pad = { l: 34, r: 10, t: 10, b: 24 };
  const x = (i: number) => pad.l + (i / (series.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Courbe de progression des compétences">
        {series.map((p, i) => (i < series.length - 1 ? <rect key={`b${i}`} x={x(i)} y={pad.t} width={x(i + 1) - x(i)} height={H - pad.t - pad.b} fill={LEVEL_BAND[p.level]} /> : null))}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize={10.5} fill="#6c8299">
              {v}
            </text>
          </g>
        ))}
        {showCompetences &&
          COMPETENCES.map((c) => (
            <polyline key={c} points={series.map((p, i) => `${x(i)},${y(p.competences[c])}`).join(' ')} fill="none" stroke={COMP_COLORS[c]} strokeWidth={1.5} opacity={0.65} />
          ))}
        <polyline points={series.map((p, i) => `${x(i)},${y(p.mastery)}`).join(' ')} fill="none" stroke="#16324F" strokeWidth={2.8} strokeLinejoin="round" />
        <text x={pad.l} y={H - 6} fontSize={10.5} fill="#6c8299">
          1re tentative
        </text>
        <text x={W - pad.r} y={H - 6} textAnchor="end" fontSize={10.5} fill="#6c8299">
          dernière
        </text>
      </svg>
      <Legend
        items={[
          { label: 'Maîtrise moyenne', color: '#16324F' },
          ...(showCompetences ? COMPETENCES.map((c) => ({ label: c, color: COMP_COLORS[c] })) : []),
          { label: 'Facile', color: LEVEL_BAND.facile },
          { label: 'Moyen', color: LEVEL_BAND.moyen },
          { label: 'Difficile', color: LEVEL_BAND.difficile },
        ]}
      />
    </div>
  );
}

/** Petites courbes : évolution hebdomadaire par erreur. */
export function WeeklyLines({ weeks, series }: { weeks: string[]; series: { label: string; color: string; values: number[] }[] }) {
  if (weeks.length < 2) return <p className="text-sm text-muted">Il faut au moins deux semaines d’activité pour voir une évolution.</p>;
  const W = 640;
  const H = 200;
  const pad = { l: 34, r: 12, t: 10, b: 26 };
  const x = (i: number) => pad.l + (i / (weeks.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / 100) * (H - pad.t - pad.b);
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Évolution semaine par semaine">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="#e2e8f0" />
            <text x={pad.l - 6} y={y(v) + 4} textAnchor="end" fontSize={10.5} fill="#6c8299">
              {v}
            </text>
          </g>
        ))}
        {weeks.map((w, i) => (
          <text key={w} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10.5} fill="#6c8299">
            {new Date(w).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
          </text>
        ))}
        {series.map((s) => (
          <g key={s.label}>
            <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.2} />
            {s.values.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={s.color} />
            ))}
          </g>
        ))}
      </svg>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}

export const ERROR_COLORS: Record<string, string> = { E1: '#0f7c7c', E2: '#1F6FD1', E3: '#8b5cf6', E4: '#E67E22', E5: '#d9468f', E6: '#1fa971', EX: '#94a3b8' };
