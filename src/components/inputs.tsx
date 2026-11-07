import { useEffect, useState } from 'react';
import { UNIT_SETS, parseUserNumber, type Quantity, type UnitChoice } from '../physics/units';

export interface QuantityValue {
  raw: string;
  unit: UnitChoice;
}

/** Valeur SI d'une saisie (null si ce n'est pas un nombre). */
export function quantityToSI(v: QuantityValue): number | null {
  const n = parseUserNumber(v.raw);
  return n === null ? null : n * v.unit.factor;
}

export function defaultUnit(quantity: Quantity, preferred?: string): UnitChoice {
  const set = UNIT_SETS[quantity];
  return set.find((u) => u.label === preferred) ?? set.find((u) => u.factor === 1) ?? set[0];
}

/** Saisie d'une valeur numérique + choix de l'unité (format NUM). */
export function QuantityInput({
  quantity,
  value,
  onChange,
  label,
  disabled,
  id,
  invalid,
}: {
  quantity: Quantity;
  value: QuantityValue;
  onChange: (v: QuantityValue) => void;
  label?: string;
  disabled?: boolean;
  id?: string;
  invalid?: boolean;
}) {
  const units = UNIT_SETS[quantity];
  return (
    <div className="flex items-stretch gap-1.5">
      <input
        id={id}
        className={`field max-w-[11rem] tabular-nums ${invalid ? 'border-warn-500' : ''}`}
        inputMode="decimal"
        value={value.raw}
        disabled={disabled}
        aria-label={label ?? 'Valeur'}
        placeholder="valeur"
        onChange={(e) => onChange({ ...value, raw: e.target.value })}
      />
      {units.length > 1 ? (
        <select
          className="field w-auto pr-7"
          value={value.unit.label}
          disabled={disabled}
          aria-label="Unité"
          onChange={(e) => onChange({ ...value, unit: units.find((u) => u.label === e.target.value)! })}
        >
          {units.map((u) => (
            <option key={u.label} value={u.label}>
              {u.label}
            </option>
          ))}
        </select>
      ) : (
        units[0].label !== '(sans unité)' && <span className="grid place-items-center px-1 text-sm text-ink-soft">{units[0].label}</span>
      )}
    </div>
  );
}

export function useQuantity(quantity: Quantity, preferred?: string, resetKey?: unknown) {
  const [v, setV] = useState<QuantityValue>({ raw: '', unit: defaultUnit(quantity, preferred) });
  useEffect(() => setV({ raw: '', unit: defaultUnit(quantity, preferred) }), [quantity, preferred, resetKey]);
  return [v, setV] as const;
}

/** Liste de choix (QCM / EXPR) en boutons radio accessibles. */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  disabled,
  name,
  render,
  columns = 1,
}: {
  options: { id: T; content: React.ReactNode }[];
  value: T | null;
  onChange: (v: T) => void;
  disabled?: boolean;
  name: string;
  render?: 'tex';
  columns?: 1 | 2;
}) {
  return (
    <div className={`grid gap-2 ${columns === 2 ? 'sm:grid-cols-2' : ''}`} role="radiogroup" aria-label={name}>
      {options.map((o, j) => {
        const on = value === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.id)}
            className={`flex items-start gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm ring-1 transition disabled:cursor-not-allowed ${
              on ? 'bg-teal-50 ring-2 ring-teal-500' : 'bg-white/75 ring-slate-200 hover:bg-white'
            } ${render === 'tex' ? 'items-center' : ''}`}
          >
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${on ? 'bg-teal-600 text-white' : 'bg-ink/8 text-ink-soft'}`}>
              {String.fromCharCode(97 + j)}
            </span>
            <span className="min-w-0 flex-1 text-ink">{o.content}</span>
          </button>
        );
      })}
    </div>
  );
}
