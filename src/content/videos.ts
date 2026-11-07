import type { LessonId, VideoId } from '../engine/types';

/** Les 12 vidéos (section 5.3), copiées telles quelles dans public/videos/. */
export interface VideoInfo {
  id: VideoId;
  title: string;
  url: string;
  /** Durée approximative (s), pour l'affichage avant chargement. */
  duration: number;
}

const url = (id: VideoId) => `videos/${id}.mp4`;

export const VIDEOS: Record<VideoId, VideoInfo> = {
  V0: { id: 'V0', title: 'Introduction : charge et décharge d’un condensateur', url: url('V0'), duration: 228 },
  L1: { id: 'L1', title: 'Le condensateur', url: url('L1'), duration: 42 },
  L2: { id: 'L2', title: 'La charge', url: url('L2'), duration: 35 },
  L3: { id: 'L3', title: 'La constante de temps τ', url: url('L3'), duration: 29 },
  L4: { id: 'L4', title: 'La décharge', url: url('L4'), duration: 36 },
  L5: { id: 'L5', title: 'L’énergie emmagasinée', url: url('L5'), duration: 28 },
  M1: { id: 'M1', title: 'Le courant traverse le condensateur', url: url('M1'), duration: 61 },
  M2: { id: 'M2', title: 'La capacité dépend de la tension', url: url('M2'), duration: 61 },
  M3: { id: 'M3', title: 'Le début et la fin de la charge', url: url('M3'), duration: 62 },
  M4: { id: 'M4', title: 'Mon équation différentielle est fausse', url: url('M4'), duration: 78 },
  M5: { id: 'M5', title: 'Je lis τ au mauvais endroit', url: url('M5'), duration: 61 },
  M6: { id: 'M6', title: 'J’ai oublié le signe du courant', url: url('M6'), duration: 61 },
};

/**
 * Scènes de V0 (horodatage calculé à partir du rendu Remotion : titre 1 s, puis voix + maintien).
 * Elles servent à « revoir la scène concernée » après la question de compréhension.
 */
export interface VideoScene {
  id: string;
  title: string;
  start: number;
  end: number;
}

export const V0_SCENES: VideoScene[] = [
  { id: 'V0-S1', title: 'Le condensateur au quotidien', start: 0, end: 20.57 },
  { id: 'V0-S2', title: 'Titre', start: 20.57, end: 25.73 },
  { id: 'V0-S3', title: 'Le conducteur ohmique', start: 25.73, end: 62.33 },
  { id: 'V0-S4', title: 'Le condensateur', start: 62.33, end: 109.03 },
  { id: 'V0-S5', title: 'Le dipôle RC', start: 109.03, end: 122.97 },
  { id: 'V0-S6', title: 'K en position 1 : la charge', start: 122.97, end: 161.77 },
  { id: 'V0-S7', title: 'K en position 2 : la décharge', start: 161.77, end: 190.9 },
  { id: 'V0-S8', title: 'La constante de temps τ', start: 190.9, end: 209.23 },
  { id: 'V0-S9', title: 'À retenir', start: 209.23, end: 228.3 },
];

/** Leçons L1 à L5 : vidéo + compétences (section 5.3). */
export const LESSON_INFO: Record<LessonId, { title: string; competences: string; summary: string }> = {
  L1: { title: 'Le condensateur', competences: 'C1', summary: 'Armatures, diélectrique, $q = C\\,u_C$, $i = \\dfrac{dq}{dt}$, associations.' },
  L2: { title: 'La charge', competences: 'C2 · C3', summary: '$RC\\,\\dfrac{du_C}{dt} + u_C = E$ et $u_C = E\\left(1 - e^{-t/\\tau}\\right)$.' },
  L3: { title: 'La constante de temps τ', competences: 'C4', summary: '$\\tau = RC$, lecture à 0,63E ou par la tangente, fin à 5τ.' },
  L4: { title: 'La décharge', competences: 'C2 · C3 · C5', summary: '$RC\\,\\dfrac{du_C}{dt} + u_C = 0$, $u_C = E\\,e^{-t/\\tau}$, $i < 0$.' },
  L5: { title: 'L’énergie', competences: 'C6', summary: '$E_e = \\tfrac12\\,C\\,u_C^2$, maximale en fin de charge.' },
};
