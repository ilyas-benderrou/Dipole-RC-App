import { Crosshair, Eye, GitCompare, Pause, Play, RotateCcw, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { usePrefersReducedMotion } from '../../app/hooks';
import { formatQuantity } from '../../physics/units';
import { CircuitDiagram } from './CircuitDiagram';
import { PLOT_META, SimPlots, timeUnit } from './SimPlots';
import { C_VALUES, E_MAX, E_MIN, E_STEP, R_VALUES, SPEEDS, type PlotKey, type Simulation } from './useSimulation';

function Toggle({ on, onClick, children, disabled, title }: { on: boolean; onClick: () => void; children: ReactNode; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold ring-1 transition disabled:cursor-not-allowed disabled:opacity-45 ${
        on ? 'bg-teal-600 text-white ring-teal-600' : 'bg-white/75 text-ink-soft ring-slate-200 hover:bg-white'
      }`}
    >
      {children}
    </button>
  );
}

function Slider({ label, value, display, min, max, step, onChange, disabled }: { label: ReactNode; value: number; display: string; min: number; max: number; step: number; onChange: (v: number) => void; disabled?: boolean }) {
  return (
    <label className={`block ${disabled ? 'opacity-55' : ''}`}>
      <span className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="font-semibold text-ink-soft">{label}</span>
        <span className="font-semibold tabular-nums text-ink">{display}</span>
      </span>
      <input type="range" className="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

/** Contrôles (section 6.2) : E, R, C, K, temps et outils. */
export function SimControls({ sim, compact = false }: { sim: Simulation; compact?: boolean }) {
  const lock = sim.lock;
  const atSteady = !sim.playing && sim.t > 0 && sim.t >= sim.timeline.last.t0 + 10 * sim.timeline.last.R * sim.timeline.last.C - 1e-12;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Slider label={<>Tension <i>E</i></>} value={sim.E} display={`${String(sim.E).replace('.', ',')} V`} min={E_MIN} max={E_MAX} step={E_STEP} onChange={sim.setE} disabled={lock.E} />
        <Slider label={<>Résistance <i>R</i></>} value={sim.rIndex} display={formatQuantity(R_VALUES[sim.rIndex], 'resistance')} min={0} max={R_VALUES.length - 1} step={1} onChange={sim.setRIndex} disabled={lock.R} />
        <div>
          <Slider label={<>Capacité <i>C</i></>} value={sim.cIndex} display={formatQuantity(sim.C, 'capacite')} min={0} max={C_VALUES.length - 1} step={1} onChange={sim.setCIndex} disabled={lock.C} />
          <label className={`mt-1.5 flex items-center gap-2 text-xs text-ink-soft ${lock.doubleC ? 'opacity-55' : ''}`}>
            <input type="checkbox" checked={sim.doubleC} disabled={lock.doubleC} onChange={(e) => sim.setDoubleC(e.target.checked)} className="accent-teal-600" />
            ×2 : deux condensateurs identiques en parallèle
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="label-caps mr-1">Interrupteur K</span>
        {[1, 2].map((k) => (
          <button
            key={k}
            type="button"
            disabled={lock.K}
            onClick={() => sim.switchK(k as 1 | 2)}
            aria-pressed={sim.k === k}
            className={`rounded-xl px-3.5 py-1.5 text-sm font-bold ring-1 transition disabled:opacity-50 ${sim.k === k ? 'bg-ink text-white ring-ink' : 'bg-white/80 text-ink ring-slate-200 hover:bg-white'}`}
          >
            Position {k}
          </button>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-slate-300/70 sm:block" />
        <button
          type="button"
          onClick={sim.playing ? sim.pause : sim.play}
          className="inline-flex items-center gap-1.5 rounded-xl bg-teal-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-teal-700"
          aria-label={sim.playing ? 'Pause' : 'Lecture'}
        >
          {sim.playing ? <Pause size={16} /> : <Play size={16} />} {sim.playing ? 'Pause' : 'Lecture'}
        </button>
        <button type="button" onClick={() => sim.reset()} className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-3 py-1.5 text-sm font-semibold text-ink-soft ring-1 ring-slate-200 hover:bg-white" aria-label="Remise à zéro">
          <RotateCcw size={15} /> Zéro
        </button>
        <div className="inline-flex overflow-hidden rounded-xl ring-1 ring-slate-200" role="group" aria-label="Vitesse">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sim.setSpeed(s)}
              aria-pressed={sim.speed === s}
              className={`px-2 py-1.5 text-xs font-semibold ${sim.speed === s ? 'bg-teal-600 text-white' : 'bg-white/80 text-ink-soft hover:bg-white'}`}
            >
              ×{String(s).replace('.', ',')}
            </button>
          ))}
        </div>
      </div>
      {atSteady && <p className="text-xs text-muted">Régime permanent atteint : bascule K ou remets à zéro pour relancer.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <span className="label-caps mr-1">Outils</span>
        <Toggle on={sim.tools.cursor} onClick={() => sim.setTool('cursor', !sim.tools.cursor)}>
          <Crosshair size={14} /> Curseur
        </Toggle>
        <Toggle
          on={sim.tools.tangent && sim.markersAllowed}
          disabled={!sim.markersAllowed}
          title={sim.markersAllowed ? undefined : 'Cachée pour cette mission'}
          onClick={() => sim.setTool('tangent', !sim.tools.tangent)}
        >
          <TrendingUp size={14} /> Tangente
        </Toggle>
        <Toggle
          on={sim.tools.markers && sim.markersAllowed}
          disabled={!sim.markersAllowed}
          title={sim.markersAllowed ? undefined : 'Cachés pour cette mission'}
          onClick={() => sim.setTool('markers', !sim.tools.markers)}
        >
          <Eye size={14} /> Repères 0,63E / 0,37E / τ / 5τ
        </Toggle>
        <Toggle on={sim.tools.compare} onClick={() => sim.setTool('compare', !sim.tools.compare)} title="À la remise à zéro, la courbe précédente reste en gris">
          <GitCompare size={14} /> Comparaison
        </Toggle>
        {sim.ghost && (
          <button type="button" className="text-xs font-semibold text-teal-700 underline-offset-2 hover:underline" onClick={() => sim.setGhost(null)}>
            Effacer la courbe grise
          </button>
        )}
      </div>

      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="label-caps mr-1">Courbes</span>
          {(Object.keys(PLOT_META) as PlotKey[]).map((key) => {
            const on = sim.plots.includes(key);
            const m = PLOT_META[key];
            return (
              <Toggle
                key={key}
                on={on}
                onClick={() => {
                  const next = on ? sim.plots.filter((p) => p !== key) : [...sim.plots, key];
                  const order: PlotKey[] = ['uC', 'i', 'uR', 'q', 'Ee'];
                  sim.setPlots(next.length ? order.filter((p) => next.includes(p)) : ['uC']);
                }}
              >
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: m.color }} />
                <i>{m.label}</i>
                {m.sub && <sub className="-ml-1">{m.sub}</sub>}
                (t)
              </Toggle>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Valeurs instantanées (t, u_C, u_R, i, q, E_e) avec unités. */
export function InstantValues({ sim }: { sim: Simulation }) {
  const s = sim.state;
  const tl = timeUnit(sim.range[1] - sim.range[0]);
  const rows: { label: ReactNode; value: string; color?: string }[] = [
    { label: <i>t</i>, value: `${Number((s.t * tl.factor).toPrecision(3)).toString().replace('.', ',')} ${tl.label}` },
    { label: <><i>u</i><sub>C</sub></>, value: formatQuantity(s.uC, 'tension'), color: '#1F6FD1' },
    { label: <><i>u</i><sub>R</sub></>, value: formatQuantity(s.uR, 'tension'), color: '#8b5cf6' },
    { label: <i>i</i>, value: formatQuantity(s.i, 'courant'), color: '#E67E22' },
    { label: <i>q</i>, value: formatQuantity(s.q, 'charge'), color: '#0f7c7c' },
    { label: <><i>E</i><sub>e</sub></>, value: formatQuantity(s.Ee, 'energie'), color: '#d9468f' },
  ];
  return (
    <dl className="grid grid-cols-3 gap-1.5">
      {rows.map((r, j) => (
        <div key={j} className="glass-inset min-w-0 px-2 py-1.5">
          <dt className="text-xs font-semibold" style={{ color: r.color ?? '#3d5873' }}>
            {r.label}
          </dt>
          <dd className="truncate text-[0.8rem] font-semibold tabular-nums text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Lecture au curseur (t, u_C, i, u_R). */
export function CursorReadout({ sim }: { sim: Simulation }) {
  const c = sim.cursorState;
  const tl = timeUnit(sim.range[1] - sim.range[0]);
  if (!sim.tools.cursor) return null;
  return (
    <div className="glass-inset flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 text-sm" aria-live="polite">
      <span className="label-caps">Curseur</span>
      {c ? (
        <>
          <span>
            <i>t</i> = <b className="tabular-nums">{(c.t * tl.factor).toPrecision(3).replace('.', ',')} {tl.label}</b>
          </span>
          <span style={{ color: '#1F6FD1' }}>
            <i>u</i>
            <sub>C</sub> = <b className="tabular-nums">{formatQuantity(c.uC, 'tension')}</b>
          </span>
          <span style={{ color: '#E67E22' }}>
            <i>i</i> = <b className="tabular-nums">{formatQuantity(c.i, 'courant')}</b>
          </span>
          <span style={{ color: '#8b5cf6' }}>
            <i>u</i>
            <sub>R</sub> = <b className="tabular-nums">{formatQuantity(c.uR, 'tension')}</b>
          </span>
        </>
      ) : (
        <span className="text-muted">Clique (ou fais glisser) sur une courbe pour lire les valeurs.</span>
      )}
    </div>
  );
}

/** Jauge d'énergie ½·C·u_C². */
export function EnergyGauge({ sim }: { sim: Simulation }) {
  const s = sim.state;
  const max = 0.5 * sim.C * Math.max(sim.E, Math.abs(s.uC)) ** 2;
  const pct = max > 0 ? Math.min(100, (s.Ee / max) * 100) : 0;
  return (
    <div className="glass-inset flex items-center gap-3 px-3 py-2.5">
      <div className="relative h-14 w-6 overflow-hidden rounded-full bg-ink/10" role="meter" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Jauge d'énergie">
        <div className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-energy to-pink-300" style={{ height: `${pct}%` }} />
      </div>
      <div className="min-w-0">
        <p className="label-caps">Énergie stockée</p>
        <p className="text-lg font-semibold tabular-nums text-ink">{formatQuantity(s.Ee, 'energie')}</p>
        <p className="text-xs text-muted">
          <i>E</i>
          <sub>e</sub> = ½·<i>C</i>·<i>u</i>
          <sub>C</sub>²
        </p>
      </div>
    </div>
  );
}

/** Le laboratoire complet : schéma animé, courbes, valeurs, jauge et contrôles. */
export function Simulator({ sim, top, compact = false }: { sim: Simulation; top?: ReactNode; compact?: boolean }) {
  const reduced = usePrefersReducedMotion();
  return (
    <div className="space-y-4">
      {top}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="glass p-3 sm:p-4">
          <div className="mb-1 flex items-center justify-between">
            <p className="label-caps">Schéma</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${sim.k === 1 ? 'bg-uc-soft text-uc' : 'bg-cur-soft text-cur'}`}>K en position {sim.k}</span>
          </div>
          <CircuitDiagram
            k={sim.k}
            uC={sim.state.uC}
            i={sim.state.i}
            E={sim.phase.E}
            R={sim.phase.R}
            C={sim.phase.C}
            offsetRef={sim.electronOffset}
            reducedMotion={reduced}
            onToggleK={sim.switchK}
            kLocked={sim.lock.K}
          />
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem]">
            <InstantValues sim={sim} />
            <EnergyGauge sim={sim} />
          </div>
        </div>
        <div className="glass p-3 sm:p-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <p className="label-caps">Courbes en temps réel</p>
            <p className="text-xs text-muted">
              τ = <b className="text-ink">{formatQuantity(sim.tau, 'temps')}</b>
            </p>
          </div>
          <SimPlots sim={sim} />
          {sim.ghost && (
            <p className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span className="inline-block h-0.5 w-6 bg-[#9aa9b8]" /> Courbe précédente : {sim.ghost.label}
            </p>
          )}
          <div className="mt-2">
            <CursorReadout sim={sim} />
          </div>
        </div>
      </div>
      <div className="glass p-4">
        <SimControls sim={sim} compact={compact} />
      </div>
    </div>
  );
}
