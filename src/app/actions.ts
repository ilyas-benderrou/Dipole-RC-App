import { coveragePercent, mergeRanges, type LearnerModel } from '../engine/adaptive';
import type { MissionId, VideoId } from '../engine/types';
import { newId, repo } from '../data/repository';
import type { MissionRun, VideoView } from '../data/types';

type UpdateModel = (fn: (m: LearnerModel) => LearnerModel) => Promise<unknown>;

/** Enregistre une mission de simulation (historique + modèle de l'apprenant). */
export async function recordMission(studentId: string, updateModel: UpdateModel, missionId: MissionId, success: boolean, durationSec: number, context: MissionRun['context']) {
  await repo.addMissionRun({ id: newId('mis'), studentId, missionId, context, success, at: new Date().toISOString(), durationSec });
  await updateModel((m) => {
    const prev = m.missions[missionId] ?? { done: false, attempts: 0 };
    return { ...m, missions: { ...m.missions, [missionId]: { done: prev.done || success, attempts: prev.attempts + 1 } } };
  });
}

/** Ajoute des intervalles vus d'une vidéo et met à jour « vue à X % ». */
export async function recordVideoProgress(updateModel: UpdateModel, id: VideoId, ranges: [number, number][], position: number, duration: number) {
  let percent = 0;
  await updateModel((m) => {
    const prev = m.videos[id] ?? { percent: 0, position: 0, ranges: [], duration };
    const merged = mergeRanges([...prev.ranges, ...ranges]);
    percent = coveragePercent(merged, duration || prev.duration);
    return { ...m, videos: { ...m.videos, [id]: { percent, position, ranges: merged, duration: duration || prev.duration } } };
  });
  return percent;
}

export async function recordVideoView(studentId: string, videoId: VideoId, reason: VideoView['reason'], percent: number) {
  await repo.addVideoView({ id: newId('vid'), studentId, videoId, at: new Date().toISOString(), reason, percent });
}

export async function addActiveTime(updateModel: UpdateModel, seconds: number, lab = false) {
  await updateModel((m) => ({ ...m, activeTimeSec: m.activeTimeSec + seconds, labTimeSec: m.labTimeSec + (lab ? seconds : 0) }));
}
