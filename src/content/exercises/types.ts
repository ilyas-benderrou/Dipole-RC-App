import type { TemplateMeta } from '../../engine/adaptive';
import type { Rng } from '../../engine/rng';
import type { ErrorCode, ExSubtype, Level } from '../../engine/types';
import type { Quantity } from '../../physics/units';

/** Formats de réponse (section 7.1). ÉTAPES = plusieurs questions enchaînées (niveau difficile). */
export type AnswerFormat = 'NUM' | 'QCM' | 'EXPR' | 'COURBE';

export interface NumDistractor {
  value: number;
  code: ErrorCode;
  sub?: ExSubtype;
  label: string;
}

export interface NumQuestion {
  kind: 'NUM';
  id: string;
  prompt: string;
  quantity: Quantity;
  /** Réponse attendue en unités SI. */
  answer: number;
  /** Tolérance relative (±2 % par défaut). */
  tolerance?: number;
  distractors: NumDistractor[];
  preferredUnit?: string;
  hint?: string;
  /** Résultat approché d'une constante (ex. ((e − 1)/e)²) : exempté de la règle des 3 chiffres significatifs. */
  approximate?: boolean;
}

export interface ChoiceOption {
  id: string;
  /** Texte (formules entre $…$) ou LaTeX pur pour EXPR. */
  text: string;
  code: ErrorCode | null;
  sub?: ExSubtype;
  correct?: boolean;
}

export interface ChoiceQuestion {
  kind: 'QCM' | 'EXPR';
  id: string;
  prompt: string;
  options: ChoiceOption[];
  hint?: string;
}

/** Zone de lecture fausse (en multiples de τ à partir de l'origine) → code d'erreur. */
export interface CurveZone {
  from: number;
  to: number;
  code: ErrorCode;
  label: string;
}

export interface CurveQuestion {
  kind: 'COURBE';
  id: string;
  prompt: string;
  /** Durée attendue (s), mesurée depuis `origin`. */
  answer: number;
  origin: number;
  tolerance?: number;
  zones: CurveZone[];
  /** Index de la figure de l'exercice sur laquelle on lit (0 par défaut). */
  figure?: number;
  hint?: string;
}

export type Question = NumQuestion | ChoiceQuestion | CurveQuestion;

export interface PlotSeries {
  points: [number, number][];
  color: string;
  label: string;
  dashed?: boolean;
}

export interface PlotSpec {
  title?: string;
  xLabel: string;
  yLabel: string;
  xUnit: { label: string; factor: number };
  yUnit: { label: string; factor: number };
  xMax: number;
  yMin: number;
  yMax: number;
  xStep: number;
  yStep: number;
  xMinor?: number;
  yMinor?: number;
  series: PlotSeries[];
  lines?: { x1: number; y1: number; x2: number; y2: number; dashed?: boolean; color?: string; label?: string }[];
  labels?: { x: number; y: number; text: string; color?: string }[];
  /** Style « oscillogramme » (fond sombre, quadrillage en divisions). */
  scope?: boolean;
}

export type Figure =
  | { kind: 'plot'; plot: PlotSpec }
  | { kind: 'capacitors'; mode: 'serie' | 'parallele'; c1: string; c2: string }
  | { kind: 'circuit'; k: 1 | 2 }
  | { kind: 'seriesRC'; c1: string; c2: string; r: string; e: string }
  | { kind: 'currentSource' };

export interface ExerciseInstance {
  templateId: string;
  level: Level;
  seed: number;
  /** Valeurs tirées (pour l'historique). */
  values: Record<string, number | string>;
  /** Signature des valeurs : jamais deux fois la même pour un même gabarit et un même apprenant. */
  valueKey: string;
  title: string;
  intro: string;
  figures: Figure[];
  questions: Question[];
  generalHint: string;
  source: string;
}

export type GeneratedExercise = Omit<ExerciseInstance, 'templateId' | 'level' | 'seed' | 'valueKey' | 'source'> & { valueKey?: string };

export interface ExerciseTemplate extends TemplateMeta {
  title: string;
  formats: string;
  source: string;
  generate(rng: Rng): GeneratedExercise;
}
