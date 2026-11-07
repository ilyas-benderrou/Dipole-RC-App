import { ADAPTIVE } from '../config/adaptive';
import type { ChoiceQuestion, CurveQuestion, NumQuestion } from '../content/exercises/types';
import { isClose, isPowerOfTenOff } from '../physics/units';
import type { ErrorCode, ExSubtype } from './types';

/**
 * Diagnostic des erreurs (section 8.1) :
 * 1. réponse comparée aux distracteurs calculés pour l'instance (tolérance 2 %) ;
 * 2. chaque question d'un exercice en étapes est diagnostiquée séparément ;
 * 3. une lecture de courbe est classée selon la zone cliquée ;
 * 4. une réponse fausse qui ne correspond à aucun distracteur ne reçoit pas de code.
 */
export interface Diagnosis {
  ok: boolean;
  code: ErrorCode | null;
  sub?: ExSubtype | null;
  /** Étiquette interne du distracteur reconnu (historique, tableau de bord). */
  label?: string;
}

export function diagnoseNum(q: NumQuestion, valueSI: number | null): Diagnosis {
  if (valueSI === null || !Number.isFinite(valueSI)) return { ok: false, code: null };
  const tol = q.tolerance ?? ADAPTIVE.numTolerance;
  if (isClose(valueSI, q.answer, tol)) return { ok: true, code: null };
  for (const d of q.distractors) {
    if (d.value === 0 ? Math.abs(valueSI) < 1e-15 : isClose(valueSI, d.value, ADAPTIVE.numTolerance)) return { ok: false, code: d.code, sub: d.sub ?? null, label: d.label };
  }
  // Bonne valeur mais mauvaise puissance de 10 (unité ou conversion) → EX.
  if (isPowerOfTenOff(valueSI, q.answer, tol)) return { ok: false, code: 'EX', sub: 'puissance', label: 'puissance de 10' };
  // Distracteur avec, en plus, une erreur de puissance de 10 : on garde le code du distracteur.
  for (const d of q.distractors) if (d.value !== 0 && isPowerOfTenOff(valueSI, d.value)) return { ok: false, code: d.code, sub: d.sub ?? null, label: `${d.label} (puissance de 10)` };
  return { ok: false, code: null };
}

export function diagnoseChoice(q: ChoiceQuestion, optionId: string | null): Diagnosis {
  const o = q.options.find((x) => x.id === optionId);
  if (!o) return { ok: false, code: null };
  if (o.correct) return { ok: true, code: null };
  return { ok: false, code: o.code, sub: o.sub ?? null, label: o.id };
}

/** Lecture de τ sur une courbe : `reading` est la durée lue depuis l'origine de la question (s). */
export function diagnoseCurve(q: CurveQuestion, reading: number | null): Diagnosis {
  if (reading === null || !Number.isFinite(reading) || reading <= 0) return { ok: false, code: null };
  if (isClose(reading, q.answer, q.tolerance ?? ADAPTIVE.curveTolerance)) return { ok: true, code: null };
  const r = reading / q.answer;
  const zone = q.zones.find((z) => r >= z.from && r <= z.to);
  if (zone) return { ok: false, code: zone.code, label: zone.label };
  if (isPowerOfTenOff(reading, q.answer, q.tolerance ?? ADAPTIVE.curveTolerance)) return { ok: false, code: 'EX', sub: 'puissance', label: 'puissance de 10' };
  return { ok: false, code: null };
}
