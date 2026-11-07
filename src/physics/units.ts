/**
 * Nombres, unités et préfixes (affichage « comme dans les sujets marocains » : µF, nF, kΩ, ms, mA, µC, mJ).
 * Toutes les valeurs sont stockées en unités SI.
 */

export type Quantity = 'charge' | 'capacite' | 'temps' | 'courant' | 'tension' | 'energie' | 'resistance' | 'pente' | 'inverse_temps' | 'ratio';

export interface UnitChoice {
  label: string;
  /** Facteur vers l'unité SI. */
  factor: number;
}

export const UNIT_SETS: Record<Quantity, UnitChoice[]> = {
  charge: [
    { label: 'nC', factor: 1e-9 },
    { label: 'µC', factor: 1e-6 },
    { label: 'mC', factor: 1e-3 },
    { label: 'C', factor: 1 },
  ],
  capacite: [
    { label: 'nF', factor: 1e-9 },
    { label: 'µF', factor: 1e-6 },
    { label: 'mF', factor: 1e-3 },
    { label: 'F', factor: 1 },
  ],
  temps: [
    { label: 'µs', factor: 1e-6 },
    { label: 'ms', factor: 1e-3 },
    { label: 's', factor: 1 },
  ],
  courant: [
    { label: 'µA', factor: 1e-6 },
    { label: 'mA', factor: 1e-3 },
    { label: 'A', factor: 1 },
  ],
  tension: [
    { label: 'mV', factor: 1e-3 },
    { label: 'V', factor: 1 },
  ],
  energie: [
    { label: 'µJ', factor: 1e-6 },
    { label: 'mJ', factor: 1e-3 },
    { label: 'J', factor: 1 },
  ],
  resistance: [
    { label: 'Ω', factor: 1 },
    { label: 'kΩ', factor: 1e3 },
    { label: 'MΩ', factor: 1e6 },
  ],
  pente: [
    { label: 'V/ms', factor: 1e3 },
    { label: 'V/s', factor: 1 },
  ],
  inverse_temps: [{ label: 's⁻¹', factor: 1 }],
  ratio: [{ label: '(sans unité)', factor: 1 }],
};

export const SI_UNIT: Record<Quantity, string> = {
  charge: 'C',
  capacite: 'F',
  temps: 's',
  courant: 'A',
  tension: 'V',
  energie: 'J',
  resistance: 'Ω',
  pente: 'V/s',
  inverse_temps: 's⁻¹',
  ratio: '',
};

/** Arrondi à n chiffres significatifs (supprime les erreurs de virgule flottante). */
export function roundSig(x: number, n = 12): number {
  if (x === 0 || !Number.isFinite(x)) return x;
  return Number(x.toPrecision(n));
}

/** Nombre de chiffres significatifs d'une valeur « propre » (après arrondi à 10 chiffres). */
export function sigFigs(x: number): number {
  if (x === 0) return 1;
  const s = Math.abs(roundSig(x, 10)).toExponential(9); // « 4.700000000e-3 »
  const mantissa = s.split('e')[0].replace('.', '').replace(/0+$/, '');
  return Math.max(1, mantissa.length);
}

export const isClean = (x: number, maxSig = 3) => sigFigs(x) <= maxSig;

/** Format français : virgule décimale, au plus `sig` chiffres significatifs, zéros inutiles supprimés. */
export function formatNumber(x: number, sig = 3): string {
  if (!Number.isFinite(x)) return '—';
  if (x === 0) return '0';
  const r = roundSig(x, sig);
  const abs = Math.abs(r);
  if (abs >= 1e6 || abs < 1e-4) {
    const [m, e] = r.toExponential(sig - 1).split('e');
    return `${String(Number(m)).replace('.', ',')}×10${superscript(Number(e))}`;
  }
  return String(r).replace('.', ',');
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
export function superscript(n: number): string {
  return String(n)
    .split('')
    .map((c) => SUP[c] ?? c)
    .join('');
}

/** Choisit l'unité la plus lisible pour afficher une valeur SI. */
export function bestUnit(value: number, quantity: Quantity): UnitChoice {
  const set = UNIT_SETS[quantity];
  if (set.length === 1) return set[0];
  const abs = Math.abs(value);
  if (abs === 0) return set.find((u) => u.factor === 1) ?? set[0];
  let best = set[0];
  for (const u of set) if (abs / u.factor >= 0.9999) best = u;
  return best;
}

/** « 4,7 µF », « 22 ms », « −5 mA ». */
export function formatQuantity(value: number, quantity: Quantity, sig = 3): string {
  const u = bestUnit(value, quantity);
  const n = formatNumber(value / u.factor, sig).replace('-', '−');
  return quantity === 'ratio' ? n : `${n} ${u.label}`;
}

/** Version LaTeX : « 4{,}7\,\mu\text{F} ». */
export function texQuantity(value: number, quantity: Quantity, sig = 3): string {
  const u = bestUnit(value, quantity);
  const n = texNumber(value / u.factor, sig);
  if (quantity === 'ratio') return n;
  return `${n}\\,${texUnit(u.label)}`;
}

export function texNumber(x: number, sig = 3): string {
  const r = roundSig(x, sig);
  const abs = Math.abs(r);
  if (abs !== 0 && (abs >= 1e6 || abs < 1e-4)) {
    const [m, e] = r.toExponential(sig - 1).split('e');
    return `${String(Number(m)).replace('.', '{,}')}\\times 10^{${Number(e)}}`;
  }
  return String(r).replace('.', '{,}');
}

export function texUnit(label: string): string {
  return `\\text{${label.replace('µ', 'µ')}}`;
}

/**
 * Lit un nombre saisi : « 2 », « 2,5 », « 5,64e-5 », « 5,64×10^-5 », « 5,64 x 10-5 », « 1/2 », « −5 ».
 * Renvoie null si la saisie n'est pas un nombre.
 */
export function parseUserNumber(raw: string): number | null {
  const s = raw
    .trim()
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, '')
    .replace(/,/g, '.')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻]/g, (c) => ({ '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁻': '-' })[c] ?? c);
  if (s === '') return null;
  // 5.64×10^-5, 5.64x10-5, 5.64*10^(-5)
  const sci = /^(-?(?:\d+\.?\d*|\.\d+))[x×*·]10\^?\(?(-?\d+)\)?$/i.exec(s);
  if (sci) return Number(sci[1]) * 10 ** Number(sci[2]);
  // 10^-3
  const pow = /^(-?)10\^\(?(-?\d+)\)?$/.exec(s);
  if (pow) return (pow[1] ? -1 : 1) * 10 ** Number(pow[2]);
  const frac = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s);
  if (frac) {
    const den = Number(frac[2]);
    return den === 0 ? null : Number(frac[1]) / den;
  }
  if (!/^-?(\d+\.?\d*|\.\d+)(e-?\d+)?$/i.test(s)) return null;
  const v = Number(s);
  return Number.isFinite(v) ? v : null;
}

/** Comparaison avec tolérance relative (2 % par défaut). */
export function isClose(x: number, target: number, rel = 0.02): boolean {
  if (!Number.isFinite(x) || !Number.isFinite(target)) return false;
  if (target === 0) return Math.abs(x) < 1e-12;
  return Math.abs(x - target) <= rel * Math.abs(target) + 1e-15;
}

/** x ≈ target × 10^k avec k ≠ 0 (erreur de puissance de 10) ? */
export function isPowerOfTenOff(x: number, target: number, rel = 0.02): boolean {
  if (!x || !target || Math.sign(x) !== Math.sign(target)) return false;
  const k = Math.round(Math.log10(x / target));
  return k !== 0 && Math.abs(k) <= 12 && isClose(x, target * 10 ** k, rel);
}

/** Lit « 56,4 µC » ou « 5,64e-5 C » → valeur SI (unité reconnue dans la liste de la grandeur). */
export function parseQuantity(raw: string, quantity: Quantity): { value: number; unit: UnitChoice } | null {
  const s = raw.trim().replace(/u(?=[CFAJs])/g, 'µ').replace(/ohms?/gi, 'Ω');
  const units = [...UNIT_SETS[quantity]].sort((a, b) => b.label.length - a.label.length);
  for (const u of units) {
    if (quantity !== 'ratio' && s.endsWith(u.label)) {
      const n = parseUserNumber(s.slice(0, -u.label.length));
      if (n !== null) return { value: n * u.factor, unit: u };
    }
  }
  const n = parseUserNumber(s);
  if (n === null) return null;
  const si = UNIT_SETS[quantity].find((u) => u.factor === 1) ?? UNIT_SETS[quantity][0];
  return { value: n * si.factor, unit: si };
}

/** Graduation « ronde » pour un axe (1, 2, 5 × 10^k). */
export function niceStep(range: number, targetTicks = 6): number {
  const raw = range / targetTicks;
  const p = 10 ** Math.floor(Math.log10(raw));
  const m = raw / p;
  const nice = m < 1.5 ? 1 : m < 3 ? 2 : m < 7 ? 5 : 10;
  return nice * p;
}
