import { ERRORS } from '../content/errors';
import { LEVEL_LABELS, GROUP_LABELS } from '../content/competences';
import { getTemplate } from '../content/exercises';
import { levelIndex } from '../engine/adaptive';
import { COMPETENCES, ERROR_CODES, MAIN_ERRORS, type Competence, type ErrorCode, type Level, type MainError } from '../engine/types';
import type { Attempt, MissionRun, Student, VideoView } from './types';

// ---------------------------------------------------------------------------
// Apprenant
// ---------------------------------------------------------------------------

export interface LearnerBilan {
  exercises: number;
  successes: number;
  successesNoHint: number;
  hints: number;
  levelsValidated: Level[];
  errorsMade: ErrorCode[];
  errorsCorrected: ErrorCode[];
  timeSec: number;
  competences: Competence[];
}

/** Bilan : niveaux validés, compétences travaillées, erreurs corrigées. */
export function learnerBilan(attempts: Attempt[]): LearnerBilan {
  const sorted = [...attempts].sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const levelsValidated: Level[] = [];
  sorted.forEach((a) => {
    if (a.success && levelIndex(a.levelAfter) > levelIndex(a.level) && !levelsValidated.includes(a.level)) levelsValidated.push(a.level);
  });
  const errorsMade = [...new Set(sorted.flatMap((a) => a.errors))];
  const errorsCorrected = errorsMade.filter((code) => {
    const lastIdx = sorted.map((a) => a.errors.includes(code)).lastIndexOf(true);
    if (sorted[lastIdx].success) return true;
    return sorted.slice(lastIdx + 1).some((a) => a.success && getTemplate(a.templateId).testsErrors.includes(code));
  });
  return {
    exercises: sorted.length,
    successes: sorted.filter((a) => a.success).length,
    successesNoHint: sorted.filter((a) => a.success && a.hintsUsed === 0).length,
    hints: sorted.reduce((s, a) => s + a.hintsUsed, 0),
    levelsValidated,
    errorsMade,
    errorsCorrected,
    timeSec: sorted.reduce((s, a) => s + a.durationSec, 0),
    competences: [...new Set(sorted.flatMap((a) => getTemplate(a.templateId).competences))].sort() as Competence[],
  };
}

/** Courbe de progression : maîtrise moyenne (C1–C6) et par compétence après chaque tentative. */
export function progressSeries(attempts: Attempt[]): { at: string; mastery: number; level: Level; competences: Record<Competence, number> }[] {
  return [...attempts]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((a) => ({
      at: a.endedAt,
      mastery: Math.round(COMPETENCES.reduce((s, c) => s + a.competencesAfter[c], 0) / COMPETENCES.length),
      level: a.levelAfter,
      competences: a.competencesAfter,
    }));
}

export interface StudentSummary {
  attempts: number;
  successes: number;
  successRate: number;
  timeSec: number;
  hints: number;
  remediationVideos: number;
  missionsDone: number;
  errorCounts: { code: ErrorCode; count: number }[];
  repeated: ErrorCode[];
}

export function studentSummary(attempts: Attempt[], views: VideoView[], missions: MissionRun[]): StudentSummary {
  const successes = attempts.filter((a) => a.success).length;
  const counts = new Map<ErrorCode, number>();
  attempts.forEach((a) => a.errors.forEach((e) => counts.set(e, (counts.get(e) ?? 0) + 1)));
  const errorCounts = [...counts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count);
  return {
    attempts: attempts.length,
    successes,
    successRate: attempts.length ? Math.round((successes / attempts.length) * 100) : 0,
    timeSec: attempts.reduce((s, a) => s + a.durationSec, 0),
    hints: attempts.reduce((s, a) => s + a.hintsUsed, 0),
    remediationVideos: views.filter((v) => v.reason === 'remediation').length,
    missionsDone: new Set(missions.filter((r) => r.success).map((r) => r.missionId)).size,
    errorCounts,
    repeated: errorCounts.filter((e) => e.count >= 2).map((e) => e.code),
  };
}

// ---------------------------------------------------------------------------
// Classe : erreurs fréquentes dans le parcours (section 14.3)
// ---------------------------------------------------------------------------

/** % d'apprenants ayant commis chaque erreur E1 à E6 au moins une fois dans les exercices. */
export function classErrorFrequency(students: Student[], attempts: Attempt[]): { code: MainError; students: number; percent: number; occurrences: number }[] {
  const ids = new Set(students.map((s) => s.id));
  return MAIN_ERRORS.map((code) => {
    const who = new Set<string>();
    let occurrences = 0;
    for (const a of attempts) {
      if (!ids.has(a.studentId)) continue;
      const n = a.errors.filter((e) => e === code).length;
      if (n) {
        who.add(a.studentId);
        occurrences += n;
      }
    }
    return { code, students: who.size, occurrences, percent: students.length ? Math.round((who.size / students.length) * 100) : 0 };
  });
}

/** Lundi (ISO) de la semaine d'une date. */
export function weekStart(iso: string): string {
  const d = new Date(iso);
  const day = (d.getDay() + 6) % 7;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

/** Évolution semaine par semaine : % des apprenants actifs de la semaine ayant commis chaque erreur. */
export function weeklyErrorEvolution(students: Student[], attempts: Attempt[]): { week: string; active: number; percent: Record<MainError, number> }[] {
  const ids = new Set(students.map((s) => s.id));
  const byWeek = new Map<string, Attempt[]>();
  attempts.filter((a) => ids.has(a.studentId)).forEach((a) => {
    const w = weekStart(a.startedAt);
    byWeek.set(w, [...(byWeek.get(w) ?? []), a]);
  });
  return [...byWeek.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([week, list]) => {
      const active = new Set(list.map((a) => a.studentId));
      const percent = Object.fromEntries(
        MAIN_ERRORS.map((code) => {
          const who = new Set(list.filter((a) => a.errors.includes(code)).map((a) => a.studentId));
          return [code, active.size ? Math.round((who.size / active.size) * 100) : 0];
        }),
      ) as Record<MainError, number>;
      return { week, active: active.size, percent };
    });
}

// ---------------------------------------------------------------------------
// Export CSV (séparateur « ; », virgule décimale, BOM UTF-8 : Excel en français)
// ---------------------------------------------------------------------------

function cell(v: unknown): string {
  let s = v === null || v === undefined ? '' : typeof v === 'number' ? String(Number.isInteger(v) ? v : Number(v.toPrecision(6))).replace('.', ',') : String(v);
  if (/[;"\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

const OUTCOMES: Record<Attempt['outcome'], string> = {
  success: 'réussi',
  helped: 'réussi avec aide (ne compte pas)',
  remediation: 'remédiation',
  alert: 'alerte',
  abandoned: 'abandonné',
};

/** Tentatives d'exercices (codes anonymes). */
export function attemptsCsv(students: Student[], attempts: Attempt[]): string {
  const byId = new Map(students.map((s) => [s.id, s]));
  const header = [
    'code_apprenant', 'groupe', 'classe', 'début', 'durée_s', 'exercice', 'niveau', 'remédiation', 'révision', 'résultat', 'réussite',
    'questions_justes', 'questions', 'erreurs', 'indices', 'vidéos', 'missions', 'valeurs', ...COMPETENCES.map((c) => `${c}_après`), 'niveau_après',
  ];
  const rows = [...attempts]
    .filter((a) => byId.has(a.studentId))
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((a) => {
      const s = byId.get(a.studentId)!;
      return [
        s.anonCode, GROUP_LABELS[s.group], s.classCode, a.startedAt, a.durationSec, a.templateId, LEVEL_LABELS[a.level], a.remediation ? 'oui' : 'non', a.review ? 'oui' : 'non',
        OUTCOMES[a.outcome], a.success ? 1 : 0, a.questionsOk, a.questionsTotal, a.errors.join(' '), a.hintsUsed, a.videosWatched.join(' '), a.missionsUsed.join(' '),
        Object.entries(a.values).map(([k, v]) => `${k}=${v}`).join(' '), ...COMPETENCES.map((c) => a.competencesAfter[c]), LEVEL_LABELS[a.levelAfter],
      ];
    });
  return toCsv([header, ...rows]);
}

export const ERROR_LABEL = (code: ErrorCode) => `${code} – ${ERRORS[code].name}`;
export { ERROR_CODES };

export function downloadText(filename: string, content: string, mime = 'text/csv;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
