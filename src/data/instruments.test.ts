import { describe, expect, it } from 'vitest';
import { QUESTIONS } from '../content/questionnaire';
import { POST_TEST, PRE_TEST, TESTS } from '../content/tests';
import { COMPETENCES } from '../engine/types';
import { analyzeQuestionnaire, applyRaw, competenceMax, copyErrors, copyScore, criCategory, emptyCopy, gradeItem, parseCopiesCsv, questionnaireOrder } from './instruments';
import type { QuestionnaireResponse, Student } from './types';
import { newLearnerModel } from '../engine/adaptive';

const item = (test: typeof PRE_TEST, id: string) => test.items.find((i) => i.id === id)!;

describe('pré-test et post-test (section 12)', () => {
  it('sont notés sur 20 avec la répartition C1 = 4, C2-C3 = 6, C4 = 5, C5 = 3, C6 = 2', () => {
    for (const t of [PRE_TEST, POST_TEST]) {
      expect(t.items.reduce((s, i) => s + i.points, 0)).toBe(20);
      const m = competenceMax(t.id);
      expect(m.C1).toBe(4);
      expect(m.C2 + m.C3).toBe(6);
      expect(m.C4).toBe(5);
      expect(m.C5).toBe(3);
      expect(m.C6).toBe(2);
    }
  });

  it('corrige automatiquement les réponses numériques (±2 %, unité vérifiée) et propose le code d’erreur', () => {
    expect(gradeItem(item(PRE_TEST, '1.1'), '56,4 µC')).toMatchObject({ points: 2, correct: true });
    expect(gradeItem(item(PRE_TEST, '1.1'), '5,64e-5 C')).toMatchObject({ points: 2 });
    expect(gradeItem(item(PRE_TEST, '1.1'), '56,4 mC')).toMatchObject({ points: 0, code: 'EX' });
    expect(gradeItem(item(PRE_TEST, '3.1b'), '1 s')).toMatchObject({ points: 0, code: 'E5' });
    expect(gradeItem(item(PRE_TEST, '4.2'), '-5 mA')).toMatchObject({ points: 1 });
    expect(gradeItem(item(PRE_TEST, '4.2'), '5 mA')).toMatchObject({ points: 0, code: 'E6' });
    expect(gradeItem(item(PRE_TEST, '4.2'), '0')).toMatchObject({ points: 0, code: 'E3' });
    expect(gradeItem(item(PRE_TEST, '5'), '0,5 mJ')).toMatchObject({ points: 2 });
    expect(gradeItem(item(POST_TEST, '3.1b'), '2,35 s')).toMatchObject({ points: 1 });
    expect(gradeItem(item(POST_TEST, '4.1a'), 'a')).toMatchObject({ points: 1 });
    expect(gradeItem(item(POST_TEST, '4.1a'), 'b')).toMatchObject({ points: 0, code: 'E6' });
    expect(gradeItem(item(PRE_TEST, '4.1b'), 'a')).toMatchObject({ points: 0, code: 'E6' });
  });

  it('calcule le score, les points par compétence et les erreurs d’une copie', () => {
    let c = emptyCopy('s1', 'pre', 'c1');
    for (const [id, raw] of Object.entries({ '1.1': '56,4 µC', '1.2a': '1,5 µF', '1.2b': '8 µF', '3.1a': '1 s', '3.1b': '1 s', '4.2': '5 mA' })) c = applyRaw(c, id, raw);
    c.items['2.1a'].points = 1;
    expect(copyScore(c)).toBe(2 + 1 + 1 + 2 + 1);
    expect(copyErrors(c).sort()).toEqual(['E5', 'E6']);
    expect(COMPETENCES.every((k) => k in competenceMax('pre'))).toBe(true);
  });

  it('importe un CSV (code apprenant ; test ; question ; réponse ; points ; code)', () => {
    const students: Student[] = [{ id: 's1', anonCode: 'A-07', firstName: 'X', lastName: 'Y', classCode: 'C', group: 'temoin', createdBy: 'teacher', accessOpened: false, createdAt: '', lastActive: null, model: newLearnerModel() }];
    const csv = '﻿code apprenant;test;question;réponse;points;code\nA-07;pré;1.1;56,4 µC;;\nA-07;pre;2.1a;;1;\nA-07;pre;3.1b;1 s;;\nA-07;post;5;0,04 J;;EX\nA-99;pre;1.1;1;;\n';
    let k = 0;
    const r = parseCopiesCsv(csv, students, [], () => `c${++k}`);
    expect(r.imported).toBe(4);
    expect(r.errors.length).toBe(1);
    const pre = r.copies.find((c) => c.test === 'pre')!;
    expect(pre.items['1.1'].points).toBe(2);
    expect(pre.items['2.1a'].points).toBe(1);
    expect(pre.items['3.1b'].code).toBe('E5');
    expect(pre.pendingManual).toBe(true);
    const post = r.copies.find((c) => c.test === 'post')!;
    expect(post.items['5']).toMatchObject({ points: 0, code: 'EX', codeAuto: false });
    expect(Object.keys(TESTS.post.items).length).toBeGreaterThan(0);
  });
});

describe('questionnaire diagnostique (section 11)', () => {
  it('a 12 questions, une seule bonne réponse sans code, et les questions ✍ Q1, Q5, Q9, Q11', () => {
    expect(QUESTIONS.length).toBe(12);
    expect(QUESTIONS.filter((q) => q.explain).map((q) => q.id)).toEqual(['Q1', 'Q5', 'Q9', 'Q11']);
    for (const q of QUESTIONS) expect(q.options[q.correct].codes).toEqual([]);
  });

  it('codage CRI : conception erronée, manque de connaissance, maîtrise, réponse devinée', () => {
    const q = QUESTIONS[0];
    expect(criCategory(q, { choice: 'a', certainty: 3 })).toBe('conception');
    expect(criCategory(q, { choice: 'a', certainty: 1 })).toBe('manque');
    expect(criCategory(q, { choice: 'c', certainty: 2 })).toBe('maitrise');
    expect(criCategory(q, { choice: 'c', certainty: 0 })).toBe('devinee');
    expect(criCategory(q, undefined)).toBe('sans_reponse');
  });

  it('mélange l’ordre des propositions par apprenant, de façon stable', () => {
    const o1 = questionnaireOrder('stu_1');
    expect(questionnaireOrder('stu_1')).toEqual(o1);
    expect(Object.values(o1).every((ks) => [...ks].sort().join('') === 'abcd')).toBe(true);
    const o2 = questionnaireOrder('stu_2');
    expect(JSON.stringify(o2)).not.toBe(JSON.stringify(o1));
  });

  it('analyse : erreurs confirmées (certitude haute ≥ 20 %), répartition et matrice', () => {
    const mk = (id: string, choices: Record<string, [string, number]>): QuestionnaireResponse => ({
      id,
      studentId: id,
      startedAt: '',
      submittedAt: '2026-01-01',
      autoSubmitted: false,
      order: {},
      answers: Object.fromEntries(Object.entries(choices).map(([q, [c, k]]) => [q, { choice: c as 'a', certainty: k as 0 }])),
    });
    const res = [
      mk('r1', { Q1: ['a', 3], Q9: ['a', 3] }),
      mk('r2', { Q1: ['b', 1], Q9: ['b', 2] }),
      mk('r3', { Q1: ['c', 3], Q9: ['c', 0] }),
      mk('r4', { Q1: ['c', 2], Q11: ['a', 3] }),
      mk('r5', { Q1: ['c', 0] }),
    ];
    const a = analyzeQuestionnaire(res, 0.2);
    expect(a.respondents).toBe(5);
    const e1 = a.byError.find((e) => e.code === 'E1')!;
    expect(e1.conception).toBe(20);
    expect(e1.manque).toBe(20);
    expect(a.confirmed).toContain('E1');
    expect(a.confirmed).toContain('E5');
    expect(a.confirmed).toContain('E6');
    expect(a.confirmed).not.toContain('E2');
    const q1 = a.byQuestion.find((q) => q.id === 'Q1')!;
    expect(q1.counts).toMatchObject({ a: 1, b: 1, c: 3, d: 0 });
    expect(q1.meanCertainty).toBeCloseTo(1.8, 9);
    expect(a.matrix.conception).toBe(3);
    expect(a.matrix.maitrise).toBe(3);
  });
});
