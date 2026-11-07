import { describe, expect, it } from 'vitest';
import { TEMPLATES, getTemplate } from '../content/exercises';
import {
  chooseNextTemplate,
  chooseRemediationTemplate,
  completeExercise,
  coveragePercent,
  journeySteps,
  lessonOpen,
  newLearnerModel,
  registerError,
  type LearnerModel,
} from './adaptive';
import { mulberry32 } from './rng';

const rng = () => mulberry32(7);
const ok = (m: LearnerModel, id: string, usedHelp = false, durationSec = 60) =>
  completeExercise(m, { template: getTemplate(id), success: true, usedHelp, durationSec, errors: [] }, rng());

describe('règles d’adaptation (section 10)', () => {
  it('1re erreur → indice, 2e → micro-vidéo + mission + remédiation, 3e → alerte et niveau précédent', () => {
    let m: LearnerModel = { ...newLearnerModel(), level: 'moyen', maxLevelReached: 'moyen' };
    m.competences.C4 = 50;
    let r = registerError(m, 'E5');
    expect(r.action).toBe('hint');
    expect(r.model.competences.C4).toBe(40);
    m = r.model;
    r = registerError(m, 'E5');
    expect(r.action).toBe('video');
    m = r.model;
    r = registerError(m, 'E5');
    expect(r.action).toBe('alert');
    expect(r.model.level).toBe('facile');
    expect(r.model.focusCompetence).toBe('C4');
    expect(r.model.errorStreaks.E5).toBe(0);
    expect(r.model.errorCounts.E5).toBe(3);
  });

  it('EX pénalise les compétences de l’exercice', () => {
    const r = registerError({ ...newLearnerModel(), competences: { ...newLearnerModel().competences, C6: 30 } }, 'EX', ['C6']);
    expect(r.model.competences.C6).toBe(20);
  });

  it('3 réussites d’affilée dont 2 sans indice → niveau suivant ; maîtrise +15', () => {
    let m = newLearnerModel();
    m = ok(m, 'F1').model;
    expect(m.competences.C1).toBe(15);
    m = ok(m, 'F4', true).model;
    const res = ok(m, 'F6');
    expect(res.levelUp).toBe(true);
    expect(res.model.level).toBe('moyen');
    expect(res.model.maxLevelReached).toBe('moyen');
  });

  it('pas de passage avec une seule réussite sans indice', () => {
    let m = newLearnerModel();
    m = ok(m, 'F1', true).model;
    m = ok(m, 'F4', true).model;
    const res = ok(m, 'F6');
    expect(res.levelUp).toBe(false);
  });

  it('réussite très longue → un exercice de plus avant de passer', () => {
    let m = newLearnerModel();
    m = ok(m, 'F1').model;
    m = ok(m, 'F4').model;
    let res = ok(m, 'F6', false, 300);
    expect(res.slow).toBe(true);
    expect(res.levelUp).toBe(false);
    res = ok(res.model, 'F2');
    expect(res.levelUp).toBe(true);
  });

  it('un échec casse la série ; une erreur corrigée est réinsérée 2 à 3 exercices plus tard', () => {
    let m = newLearnerModel();
    m = ok(m, 'F1').model;
    m = completeExercise(m, { template: getTemplate('F4'), success: false, usedHelp: true, durationSec: 60, errors: ['E5'] }, rng()).model;
    expect(m.streak.count).toBe(0);
    const res = completeExercise(m, { template: getTemplate('F4'), success: true, usedHelp: true, durationSec: 60, errors: ['E5'] }, rng());
    const review = res.model.reviewQueue.find((r) => r.templateId === 'F4');
    expect(review).toBeDefined();
    expect(review!.dueIn).toBeGreaterThanOrEqual(2);
    expect(review!.dueIn).toBeLessThanOrEqual(3);
  });

  it('niveau difficile validé : leçon terminée', () => {
    let m: LearnerModel = { ...newLearnerModel(), level: 'difficile', maxLevelReached: 'difficile' };
    m = ok(m, 'D1').model;
    m = ok(m, 'D2').model;
    const res = ok(m, 'D3');
    expect(res.finished).toBe(true);
    expect(res.model.completed).toBe(true);
  });

  it('choix de l’exercice : jamais deux fois le même gabarit, jamais un QCM de remédiation, révision prioritaire', () => {
    let m: LearnerModel = { ...newLearnerModel(), lastTemplateId: 'F1' };
    const r = mulberry32(3);
    for (let k = 0; k < 200; k++) {
      const next = chooseNextTemplate(m, TEMPLATES, r);
      expect(next.templateId).not.toBe(m.lastTemplateId);
      expect(getTemplate(next.templateId).level).toBe('facile');
      expect(getTemplate(next.templateId).remediationOnly).toBeFalsy();
      m = { ...next.model, lastTemplateId: next.templateId };
    }
    const withReview = { ...newLearnerModel(), reviewQueue: [{ templateId: 'F4', dueIn: 0, code: 'E5' as const }] };
    expect(chooseNextTemplate(withReview, TEMPLATES, mulberry32(1))).toMatchObject({ templateId: 'F4', review: true });
  });

  it('privilégie la compétence la plus faible du niveau (≈ 75 % des cas)', () => {
    const base = newLearnerModel();
    base.competences = { C1: 90, C2: 90, C3: 90, C4: 90, C5: 0, C6: 90 };
    const r = mulberry32(11);
    let weak = 0;
    for (let k = 0; k < 400; k++) {
      const next = chooseNextTemplate({ ...base, lastTemplateId: null }, TEMPLATES, r);
      if (getTemplate(next.templateId).competences.includes('C5')) weak++;
    }
    expect(weak / 400).toBeGreaterThan(0.7);
    expect(weak / 400).toBeLessThan(0.95);
  });

  it('remédiation : gabarit lié à l’erreur (EX → même gabarit)', () => {
    expect(['M3', 'F4']).toContain(chooseRemediationTemplate('E5', 'M6', mulberry32(1)));
    expect(chooseRemediationTemplate('E5', 'F4', mulberry32(1))).toBe('F4');
    expect(chooseRemediationTemplate('EX', 'M6', mulberry32(1))).toBe('M6');
  });
});

describe('parcours et vidéos', () => {
  it('étapes : V0 d’abord, puis L1…L5 verrouillées dans l’ordre', () => {
    const m = newLearnerModel();
    const steps = journeySteps(m);
    expect(steps[0]).toMatchObject({ id: 'V0', status: 'current' });
    expect(steps[1].status).toBe('locked');
    expect(lessonOpen(m, 'L1')).toBe(false);
    m.journey.introVideo = true;
    m.journey.introQuestion = true;
    expect(lessonOpen(m, 'L1')).toBe(true);
    expect(lessonOpen(m, 'L2')).toBe(false);
    m.journey.lessons.L1 = { video: true, flash: true, mission: true };
    expect(lessonOpen(m, 'L2')).toBe(true);
    expect(journeySteps(m)[2]).toMatchObject({ id: 'L2', status: 'current' });
  });

  it('« vue à X % » : union des intervalles réellement lus', () => {
    expect(coveragePercent([[0, 10], [5, 20]], 40)).toBe(50);
    expect(coveragePercent([[0, 10], [30, 40]], 40)).toBe(50);
    expect(coveragePercent([], 40)).toBe(0);
  });
});
