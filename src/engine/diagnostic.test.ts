import { describe, expect, it } from 'vitest';
import type { ChoiceQuestion, CurveQuestion, NumQuestion } from '../content/exercises/types';
import { tauZones } from '../content/exercises/values';
import { diagnoseChoice, diagnoseCurve, diagnoseNum } from './diagnostic';

const qNum: NumQuestion = {
  kind: 'NUM',
  id: 'q',
  prompt: '',
  quantity: 'charge',
  answer: 56.4e-6, // C = 4,7 µF ; u = 12 V
  distractors: [
    { value: 4.7e-6 / 12, code: 'E2', label: 'C/u' },
    { value: 12 / 4.7e-6, code: 'E2', label: 'u/C' },
  ],
};

describe('diagnostic (section 8)', () => {
  it('NUM : juste à ±2 %, distracteur codé, puissance de 10 → EX, sinon pas de code', () => {
    expect(diagnoseNum(qNum, 56.4e-6).ok).toBe(true);
    expect(diagnoseNum(qNum, 57.3e-6).ok).toBe(true);
    expect(diagnoseNum(qNum, 58.4e-6).ok).toBe(false);
    expect(diagnoseNum(qNum, 4.7e-6 / 12)).toMatchObject({ ok: false, code: 'E2' });
    expect(diagnoseNum(qNum, 56.4e-3)).toMatchObject({ ok: false, code: 'EX', sub: 'puissance' });
    expect(diagnoseNum(qNum, (4.7e-6 / 12) * 1e6)).toMatchObject({ code: 'E2' });
    expect(diagnoseNum(qNum, 33e-6)).toMatchObject({ ok: false, code: null });
    expect(diagnoseNum(qNum, null)).toMatchObject({ ok: false, code: null });
  });

  it('QCM / EXPR : chaque distracteur porte son code', () => {
    const q: ChoiceQuestion = {
      kind: 'EXPR',
      id: 'e',
      prompt: '',
      options: [
        { id: 'ok', text: 'RC u\' + u = E', code: null, correct: true },
        { id: 'a', text: 'R u\' + u = E', code: 'E4' },
        { id: 'b', text: 'i = E/R e', code: 'E6' },
      ],
    };
    expect(diagnoseChoice(q, 'ok').ok).toBe(true);
    expect(diagnoseChoice(q, 'a').code).toBe('E4');
    expect(diagnoseChoice(q, 'b').code).toBe('E6');
    expect(diagnoseChoice(q, null).ok).toBe(false);
  });

  it('COURBE : lecture classée selon la zone (0,37E en charge, E/2, plateau) → E5', () => {
    const q: CurveQuestion = { kind: 'COURBE', id: 't', prompt: '', answer: 0.02, origin: 0, zones: tauZones('charge') };
    expect(diagnoseCurve(q, 0.0205).ok).toBe(true);
    expect(diagnoseCurve(q, 0.02 * 0.46)).toMatchObject({ code: 'E5', label: 'lecture à 0,37E en charge' });
    expect(diagnoseCurve(q, 0.02 * 0.69).code).toBe('E5');
    expect(diagnoseCurve(q, 0.02 * 4).code).toBe('E5');
    expect(diagnoseCurve(q, 0.02 * 1.5).code).toBeNull();
    expect(diagnoseCurve(q, 20)).toMatchObject({ code: 'EX', sub: 'puissance' });
  });
});
