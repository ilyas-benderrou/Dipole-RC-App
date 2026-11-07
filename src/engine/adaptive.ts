import { ADAPTIVE } from '../config/adaptive';
import { ERRORS } from '../content/errors';
import { type Rng, pick, randInt } from './rng';
import {
  COMPETENCES,
  LESSON_IDS,
  LEVELS,
  type Competence,
  type ErrorCode,
  type LessonId,
  type Level,
  type MissionId,
  type VideoId,
} from './types';

/** Ce que le moteur doit savoir d'un gabarit d'exercice. */
export interface TemplateMeta {
  id: string;
  level: Level;
  competences: Competence[];
  testsErrors: ErrorCode[];
  /** Gabarit réservé à la remédiation (QCM Q-E2, Q-E3) : jamais choisi dans le parcours normal. */
  remediationOnly?: boolean;
}

export interface LessonProgress {
  video: boolean;
  flash: boolean;
  mission: boolean;
}

export interface VideoProgress {
  /** Part vue (0–100), calculée sur les intervalles réellement lus. */
  percent: number;
  /** Dernière position (s) : le lecteur reprend là où l'apprenant s'est arrêté. */
  position: number;
  ranges: [number, number][];
  duration: number;
}

/** Modèle de l'apprenant (section 9). */
export interface LearnerModel {
  level: Level;
  maxLevelReached: Level;
  /** Niveau difficile validé (l'apprenant peut continuer à s'entraîner). */
  completed: boolean;
  competences: Record<Competence, number>;
  /** Nombre total d'occurrences de chaque erreur. */
  errorCounts: Partial<Record<ErrorCode, number>>;
  /** Occurrences de la même erreur non encore corrigée (pilote indice → vidéo → alerte). */
  errorStreaks: Partial<Record<ErrorCode, number>>;
  /** Réussites d'affilée dans le niveau courant. */
  streak: { count: number; noHint: number };
  /** Exercices supplémentaires exigés avant de passer (réussite très lente). */
  extraNeeded: number;
  /** Révision espacée : gabarits à réinsérer dans quelques exercices. */
  reviewQueue: { templateId: string; dueIn: number; code: ErrorCode }[];
  /** Compétence à retravailler en priorité (après une alerte). */
  focusCompetence: Competence | null;
  lastTemplateId: string | null;
  exercisesDone: number;
  exercisesSucceeded: number;
  /** Parcours : V0 + question, puis leçons L1 à L5. */
  journey: { introVideo: boolean; introQuestion: boolean; lessons: Record<LessonId, LessonProgress> };
  /** Exercices ouverts par le professeur même si les leçons ne sont pas finies. */
  exercisesUnlocked: boolean;
  videos: Partial<Record<VideoId, VideoProgress>>;
  missions: Partial<Record<MissionId, { done: boolean; attempts: number }>>;
  labTimeSec: number;
  /** Temps total d'activité (vidéos, laboratoire, exercices), en secondes. */
  activeTimeSec: number;
  /** Valeurs déjà tirées par gabarit (jamais deux fois les mêmes valeurs pour un même apprenant). */
  seenValues: Record<string, string[]>;
}

export function newLearnerModel(): LearnerModel {
  return {
    level: 'facile',
    maxLevelReached: 'facile',
    completed: false,
    competences: Object.fromEntries(COMPETENCES.map((c) => [c, ADAPTIVE.initialCompetence])) as Record<Competence, number>,
    errorCounts: {},
    errorStreaks: {},
    streak: { count: 0, noHint: 0 },
    extraNeeded: 0,
    reviewQueue: [],
    focusCompetence: null,
    lastTemplateId: null,
    exercisesDone: 0,
    exercisesSucceeded: 0,
    journey: {
      introVideo: false,
      introQuestion: false,
      lessons: Object.fromEntries(LESSON_IDS.map((l) => [l, { video: false, flash: false, mission: false }])) as Record<LessonId, LessonProgress>,
    },
    exercisesUnlocked: false,
    videos: {},
    missions: {},
    labTimeSec: 0,
    activeTimeSec: 0,
    seenValues: {},
  };
}

/** Complète un modèle ancien ou partiel avec les champs par défaut. */
export function normalizeModel(m: Partial<LearnerModel> | undefined): LearnerModel {
  const base = newLearnerModel();
  if (!m) return base;
  return {
    ...base,
    ...m,
    competences: { ...base.competences, ...(m.competences ?? {}) },
    journey: {
      ...base.journey,
      ...(m.journey ?? {}),
      lessons: { ...base.journey.lessons, ...(m.journey?.lessons ?? {}) },
    },
  };
}

export const levelIndex = (l: Level): number => LEVELS.indexOf(l);
export const previousLevel = (l: Level): Level => LEVELS[Math.max(0, levelIndex(l) - 1)];
export const nextLevel = (l: Level): Level => LEVELS[Math.min(LEVELS.length - 1, levelIndex(l) + 1)];
const maxLevel = (a: Level, b: Level): Level => (levelIndex(a) >= levelIndex(b) ? a : b);

const clamp = (x: number) => Math.max(0, Math.min(100, x));

export function cloneModel(m: LearnerModel): LearnerModel {
  return structuredClone(m);
}

export type HelpAction = 'hint' | 'video' | 'alert';

/** Compétences touchées par une erreur (EX : celles de l'exercice). */
export function errorCompetences(code: ErrorCode, exerciseCompetences: Competence[]): Competence[] {
  const own = ERRORS[code].competences;
  return own.length ? own : exerciseCompetences;
}

/**
 * Enregistre une erreur codée et choisit l'aide (section 10) :
 * 1re fois → indice ; 2e fois → micro-vidéo + mission + remédiation ; 3e fois → alerte professeur
 * et retour au niveau précédent sur la compétence concernée.
 */
export function registerError(
  model: LearnerModel,
  code: ErrorCode,
  exerciseCompetences: Competence[] = [],
): { model: LearnerModel; action: HelpAction; count: number } {
  const m = cloneModel(model);
  m.errorCounts[code] = (m.errorCounts[code] ?? 0) + 1;
  const count = (m.errorStreaks[code] ?? 0) + 1;
  m.errorStreaks[code] = count;
  const comps = errorCompetences(code, exerciseCompetences);
  for (const c of comps) m.competences[c] = clamp(m.competences[c] - ADAPTIVE.errorPenalty);

  if (count >= ADAPTIVE.alertAt) {
    m.errorStreaks[code] = 0;
    m.level = previousLevel(m.level);
    m.streak = { count: 0, noHint: 0 };
    m.extraNeeded = 0;
    m.completed = false;
    m.focusCompetence = comps.length ? comps[0] : null;
    return { model: m, action: 'alert', count };
  }
  if (count >= ADAPTIVE.videoAt) return { model: m, action: 'video', count };
  return { model: m, action: 'hint', count };
}

export interface ExerciseOutcome {
  template: TemplateMeta;
  /** Exercice réussi (au niveau difficile : toutes les étapes justes avec au plus 1 indice). */
  success: boolean;
  /** Au moins une aide (indice, vidéo) utilisée. */
  usedHelp: boolean;
  durationSec: number;
  /** Erreurs commises pendant l'exercice. */
  errors: ErrorCode[];
  /** Exercice de remédiation ou de révision d'un autre niveau : ne compte pas dans la série du niveau. */
  countsForLevel?: boolean;
}

export interface CompletionResult {
  model: LearnerModel;
  levelUp: boolean;
  finished: boolean;
  slow: boolean;
}

export function completeExercise(model: LearnerModel, outcome: ExerciseOutcome, rng: Rng): CompletionResult {
  const m = cloneModel(model);
  m.exercisesDone += 1;
  m.lastTemplateId = outcome.template.id;
  m.reviewQueue.forEach((r) => (r.dueIn -= 1));
  const sameLevel = outcome.template.level === m.level && outcome.countsForLevel !== false;
  let levelUp = false;
  let finished = false;
  let slow = false;

  if (!outcome.success) {
    if (sameLevel) m.streak = { count: 0, noHint: 0 };
    return { model: m, levelUp, finished, slow };
  }

  m.exercisesSucceeded += 1;
  for (const c of outcome.template.competences) m.competences[c] = clamp(m.competences[c] + ADAPTIVE.successGain);
  if (m.focusCompetence && outcome.template.competences.includes(m.focusCompetence)) m.focusCompetence = null;

  // Erreurs travaillées par ce gabarit et non commises cette fois : elles sont corrigées.
  for (const code of outcome.template.testsErrors) if (!outcome.errors.includes(code)) m.errorStreaks[code] = 0;

  // Erreur corrigée pendant l'exercice → révision espacée 2 à 3 exercices plus tard.
  for (const code of new Set(outcome.errors)) {
    if (!m.reviewQueue.some((r) => r.templateId === outcome.template.id)) {
      m.reviewQueue.push({ templateId: outcome.template.id, dueIn: randInt(rng, ADAPTIVE.reviewDelayMin, ADAPTIVE.reviewDelayMax), code });
    }
  }

  if (sameLevel) {
    m.streak.count += 1;
    if (!outcome.usedHelp) m.streak.noHint += 1;
    slow = outcome.durationSec > ADAPTIVE.slowTimeSec[m.level];
    if (slow) m.extraNeeded = ADAPTIVE.extraExercisesWhenSlow;
    const needed = ADAPTIVE.streakToLevelUp + m.extraNeeded;
    if (m.streak.count >= needed && m.streak.noHint >= ADAPTIVE.minNoHintInStreak) {
      m.streak = { count: 0, noHint: 0 };
      m.extraNeeded = 0;
      if (m.level === 'difficile') {
        finished = !m.completed;
        m.completed = true;
      } else {
        m.level = nextLevel(m.level);
        m.maxLevelReached = maxLevel(m.maxLevelReached, m.level);
        levelUp = true;
      }
    }
  }
  return { model: m, levelUp, finished, slow };
}

/**
 * Choix de l'exercice suivant : d'abord une révision espacée arrivée à échéance ;
 * sinon, dans 75 % des cas, un gabarit de la compétence la plus faible du niveau, et sinon un tirage au sort.
 * Jamais le même gabarit deux fois de suite (sauf remédiation, gérée par la page d'exercice).
 */
export function chooseNextTemplate(
  model: LearnerModel,
  templates: TemplateMeta[],
  rng: Rng,
): { templateId: string; model: LearnerModel; review: boolean } {
  const m = cloneModel(model);
  const due = m.reviewQueue.find(
    (r) => r.dueIn <= 0 && r.templateId !== m.lastTemplateId && templates.some((t) => t.id === r.templateId && levelIndex(t.level) <= levelIndex(m.level)),
  );
  if (due) {
    m.reviewQueue = m.reviewQueue.filter((r) => r !== due);
    return { templateId: due.templateId, model: m, review: true };
  }
  let levelTemplates = templates.filter((t) => t.level === m.level && !t.remediationOnly);
  if (levelTemplates.length > 1) levelTemplates = levelTemplates.filter((t) => t.id !== m.lastTemplateId);
  const comps = [...new Set(levelTemplates.flatMap((t) => t.competences))];
  if (m.focusCompetence && comps.includes(m.focusCompetence)) {
    const focus = levelTemplates.filter((t) => t.competences.includes(m.focusCompetence!));
    return { templateId: pick(rng, focus).id, model: m, review: false };
  }
  if (rng() < ADAPTIVE.weakestCompetenceBias) {
    const min = Math.min(...comps.map((c) => m.competences[c]));
    const target = pick(rng, comps.filter((c) => m.competences[c] === min));
    const candidates = levelTemplates.filter((t) => t.competences.includes(target));
    return { templateId: pick(rng, candidates).id, model: m, review: false };
  }
  return { templateId: pick(rng, levelTemplates).id, model: m, review: false };
}

/** Choix du gabarit de remédiation pour une erreur (nouvelles valeurs ; EX : même gabarit). */
export function chooseRemediationTemplate(code: ErrorCode, currentTemplateId: string, rng: Rng): string {
  const list = ERRORS[code].remediation;
  if (!list.length) return currentTemplateId;
  if (list.includes(currentTemplateId)) return currentTemplateId;
  return pick(rng, list);
}

/** Niveau de maîtrise lisible pour une compétence. */
export function masteryBand(score: number): 'low' | 'mid' | 'high' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'mid';
  return 'low';
}

// ---------------------------------------------------------------------------
// Vidéos : part réellement vue (union des intervalles lus)
// ---------------------------------------------------------------------------

export function mergeRanges(ranges: [number, number][]): [number, number][] {
  const sorted = ranges.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  const out: [number, number][] = [];
  for (const [a, b] of sorted) {
    const last = out[out.length - 1];
    if (last && a <= last[1] + 0.5) last[1] = Math.max(last[1], b);
    else out.push([a, b]);
  }
  return out;
}

export function coveragePercent(ranges: [number, number][], duration: number): number {
  if (!duration) return 0;
  const seen = mergeRanges(ranges).reduce((s, [a, b]) => s + (Math.min(b, duration) - Math.max(0, a)), 0);
  return Math.max(0, Math.min(100, Math.round((seen / duration) * 100)));
}

export function videoSeen(model: LearnerModel, id: VideoId): boolean {
  return (model.videos[id]?.percent ?? 0) >= ADAPTIVE.videoWatchedThreshold * 100;
}

// ---------------------------------------------------------------------------
// Parcours par étapes : V0 → L1 … L5 → Facile → Moyen → Difficile → Bilan
// ---------------------------------------------------------------------------

export type JourneyStepId = 'V0' | LessonId | Level | 'bilan';
export type StepStatus = 'done' | 'current' | 'locked';

export function lessonDone(model: LearnerModel, id: LessonId): boolean {
  const l = model.journey.lessons[id];
  return l.video && l.flash && l.mission;
}

export function exercisesOpen(model: LearnerModel): boolean {
  return model.exercisesUnlocked || lessonDone(model, 'L5');
}

export function lessonOpen(model: LearnerModel, id: LessonId): boolean {
  if (model.exercisesUnlocked) return true;
  const i = LESSON_IDS.indexOf(id);
  if (i === 0) return model.journey.introQuestion;
  return lessonDone(model, LESSON_IDS[i - 1]);
}

export function journeySteps(model: LearnerModel): { id: JourneyStepId; label: string; status: StepStatus }[] {
  const doneFlags: { id: JourneyStepId; label: string; done: boolean }[] = [
    { id: 'V0', label: 'V0', done: model.journey.introVideo && model.journey.introQuestion },
    ...LESSON_IDS.map((l) => ({ id: l as JourneyStepId, label: l, done: lessonDone(model, l) })),
    { id: 'facile', label: 'Facile', done: levelIndex(model.maxLevelReached) >= 1 },
    { id: 'moyen', label: 'Moyen', done: levelIndex(model.maxLevelReached) >= 2 },
    { id: 'difficile', label: 'Difficile', done: model.completed },
    { id: 'bilan', label: 'Bilan', done: false },
  ];
  let currentFound = false;
  return doneFlags.map((s) => {
    if (s.done && s.id !== 'bilan') return { id: s.id, label: s.label, status: 'done' as StepStatus };
    if (!currentFound) {
      currentFound = true;
      return { id: s.id, label: s.label, status: 'current' as StepStatus };
    }
    return { id: s.id, label: s.label, status: 'locked' as StepStatus };
  });
}
