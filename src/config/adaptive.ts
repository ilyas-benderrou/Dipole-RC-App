/**
 * Constantes du moteur adaptatif (section 10 du cahier des charges).
 * Toutes les valeurs sont ajustables ici sans toucher au reste du code.
 */
export interface AdaptiveConfig {
  streakToLevelUp: number;
  minNoHintInStreak: number;
  extraExercisesWhenSlow: number;
  slowTimeSec: Record<'facile' | 'moyen' | 'difficile', number>;
  hintAt: number;
  videoAt: number;
  alertAt: number;
  successGain: number;
  errorPenalty: number;
  initialCompetence: number;
  reviewDelayMin: number;
  reviewDelayMax: number;
  weakestCompetenceBias: number;
  maxHintsForHardSuccess: number;
  numTolerance: number;
  curveTolerance: number;
  missionReadTolerance: number;
  missionEnergyTolerance: number;
  videoWatchedThreshold: number;
  tutorMinIntervalSec: number;
  tutorThinkingAfterSec: number;
  questionnaireDurationMin: number;
  confirmedErrorThreshold: number;
  smallSampleWarning: number;
}

export const ADAPTIVE: AdaptiveConfig = {
  /** 3 exercices réussis d'affilée dans le niveau… */
  streakToLevelUp: 3,
  /** … dont au moins 2 sans indice. */
  minNoHintInStreak: 2,
  /** Exercices supplémentaires exigés après une réussite très lente. */
  extraExercisesWhenSlow: 1,
  /** Au-delà de cette durée (s), une réussite est jugée « très longue » (4 / 7 / 10 min). */
  slowTimeSec: { facile: 240, moyen: 420, difficile: 600 },

  /** Paliers d'aide pour une même erreur : 1 = indice, 2 = micro-vidéo + mission + remédiation, 3 = alerte professeur. */
  hintAt: 1,
  videoAt: 2,
  alertAt: 3,

  /** Maîtrise des compétences : +15 si réussi, −10 si erreur liée (borné 0–100). */
  successGain: 15,
  errorPenalty: 10,
  initialCompetence: 0,

  /** Révision espacée : l'exercice revient 2 à 3 exercices plus tard. */
  reviewDelayMin: 2,
  reviewDelayMax: 3,

  /** Probabilité de choisir un gabarit de la compétence la plus faible du niveau (sinon tirage au sort). */
  weakestCompetenceBias: 0.75,

  /** Niveau difficile : un exercice D réussi = toutes ses étapes justes, avec au plus 1 indice. */
  maxHintsForHardSuccess: 1,

  /** Tolérances : NUM ±2 %, COURBE ±5 %, lectures au curseur ±5 %, énergie (S8) ±2 %. */
  numTolerance: 0.02,
  curveTolerance: 0.05,
  missionReadTolerance: 0.05,
  missionEnergyTolerance: 0.02,

  /** Part d'une vidéo à voir pour la considérer comme vue (et débloquer la suite). */
  videoWatchedThreshold: 0.8,

  /** Tuteur : au plus un message toutes les 30 s (sauf réaction à une réponse) ; « réfléchit » après 2 min. */
  tutorMinIntervalSec: 30,
  tutorThinkingAfterSec: 120,

  /** Questionnaire diagnostique : 20 min. */
  questionnaireDurationMin: 20,
  /** « Erreur confirmée » : choisie avec certitude haute par au moins 20 % des apprenants (réglable dans le tableau de bord). */
  confirmedErrorThreshold: 0.2,
  /** Avertissement « Effectif faible » tant qu'un groupe a moins de 10 apprenants. */
  smallSampleWarning: 10,
};
