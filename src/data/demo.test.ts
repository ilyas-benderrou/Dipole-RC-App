import { describe, expect, it } from 'vitest';
import { analyzeQuestionnaire } from './instruments';
import { buildDemoDatabase } from './demo';
import { analyzeExperiment } from './experiment';

describe('données de démonstration (section 18)', () => {
  const NOW = Date.UTC(2026, 9, 31, 12);
  const db = buildDemoDatabase(NOW);

  it('2BAC-PC-A : 16 apprenants (8 expérimental, 8 témoin) ; 2BAC-PC-B : 24 apprenants du groupe diagnostic', () => {
    const a = db.students.filter((s) => s.classCode === '2BAC-PC-A');
    expect(a.length).toBe(16);
    expect(a.filter((s) => s.group === 'experimental').length).toBe(8);
    expect(a.filter((s) => s.group === 'temoin').length).toBe(8);
    const b = db.students.filter((s) => s.classCode === '2BAC-PC-B');
    expect(b.length).toBe(24);
    expect(b.every((s) => s.group === 'diagnostic')).toBe(true);
    expect(db.students.every((s) => s.demo)).toBe(true);
    expect(new Set(db.students.map((s) => s.anonCode)).size).toBe(db.students.length);
  });

  it('est déterministe (graine fixe)', () => {
    const again = buildDemoDatabase(NOW);
    expect(again.attempts.map((x) => `${x.templateId}:${x.seed}:${x.outcome}`)).toEqual(db.attempts.map((x) => `${x.templateId}:${x.seed}:${x.outcome}`));
  });

  it('contient un historique de parcours pour le groupe expérimental, au moins deux alertes actives et des copies « À corriger »', () => {
    expect(db.attempts.length).toBeGreaterThan(80);
    expect(db.alerts.filter((x) => !x.resolved).length).toBeGreaterThanOrEqual(2);
    expect(db.testCopies.filter((c) => c.pendingManual).length).toBeGreaterThanOrEqual(2);
    expect(db.questionnaireResponses.filter((r) => r.submittedAt).length).toBe(24);
    for (const s of db.students.filter((x) => x.group === 'experimental' && x.firstName !== 'Nour')) expect(s.model.journey.lessons.L5.mission).toBe(true);
  });

  it('les analyses fonctionnent sur la démo (gain expérimental supérieur, erreurs confirmées)', () => {
    const exp = analyzeExperiment(db.students, db.testCopies);
    expect(exp.exp.nPaired).toBe(7);
    expect(exp.tem.nPaired).toBe(6);
    expect(exp.excludedPending).toBe(2);
    expect(exp.exp.meanGain).toBeGreaterThan(exp.tem.meanGain);
    const q = analyzeQuestionnaire(db.questionnaireResponses);
    expect(q.respondents).toBe(24);
    expect(q.confirmed.length).toBeGreaterThan(0);
  });
});
