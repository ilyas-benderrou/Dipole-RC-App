import { describe, expect, it } from 'vitest';
import { diagnoseChoice, diagnoseCurve, diagnoseNum } from '../../engine/diagnostic';
import { mulberry32 } from '../../engine/rng';
import { isClean, isClose, roundSig } from '../../physics/units';
import { ERRORS } from '../errors';
import { TEMPLATES, createFreshInstance, createInstance, getTemplate } from './index';
import { RC_PAIRS } from './values';

const SEEDS = Array.from({ length: 250 }, (_, i) => 1 + i * 7919);

describe('banque d’exercices (section 7)', () => {
  it('contient les gabarits F1–F6, M1–M6, D1–D6 et les QCM de remédiation', () => {
    const ids = TEMPLATES.map((t) => t.id);
    for (const id of ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'QE2', 'QE3']) expect(ids).toContain(id);
  });

  it('les gabarits de remédiation de la base des erreurs existent', () => {
    for (const e of Object.values(ERRORS)) for (const id of e.remediation) expect(() => getTemplate(id)).not.toThrow();
  });

  it('τ = RC retenu seulement avec au plus 3 chiffres significatifs, entre 1 ms et 10 s', () => {
    expect(RC_PAIRS.length).toBeGreaterThan(40);
    for (const [R, C] of RC_PAIRS) {
      const tau = roundSig(R * C);
      expect(tau).toBeGreaterThanOrEqual(1e-3 - 1e-15);
      expect(tau).toBeLessThanOrEqual(10);
      expect(isClean(tau)).toBe(true);
    }
  });

  for (const tpl of TEMPLATES) {
    describe(`${tpl.id} – ${tpl.title}`, () => {
      it('génère des instances déterministes et valides (réponses propres, distracteurs codés, diagnostic cohérent)', () => {
        for (const seed of SEEDS) {
          const a = createInstance(tpl.id, seed);
          const b = createInstance(tpl.id, seed);
          expect(a.valueKey).toBe(b.valueKey);
          expect(a.questions.length).toBeGreaterThan(0);
          if (tpl.level === 'difficile') expect(a.questions.length).toBeGreaterThanOrEqual(4);
          for (const q of a.questions) {
            if (q.kind === 'NUM') {
              expect(Number.isFinite(q.answer)).toBe(true);
              if (!q.approximate) expect(isClean(q.answer), `${tpl.id}/${q.id} réponse ${q.answer} (graine ${seed})`).toBe(true);
              expect(diagnoseNum(q, q.answer).ok).toBe(true);
              expect(diagnoseNum(q, q.answer * 1.015).ok).toBe(true);
              q.distractors.forEach((d, j) => {
                if (isClose(d.value, q.answer, 0.03)) return;
                if (q.distractors.slice(0, j).some((e) => isClose(e.value, d.value, 0.03))) return;
                const r = diagnoseNum(q, d.value);
                expect(r.ok).toBe(false);
                expect(r.code, `${tpl.id}/${q.id} distracteur ${d.label}`).toBe(d.code);
              });
              if (q.answer !== 0 && q.quantity !== 'ratio') {
                const r = diagnoseNum(q, q.answer * 1000);
                expect(r.ok).toBe(false);
                expect(r.code).not.toBeNull();
              }
            } else if (q.kind === 'COURBE') {
              expect(q.answer).toBeGreaterThan(0);
              expect(diagnoseCurve(q, q.answer).ok).toBe(true);
              expect(diagnoseCurve(q, q.answer * 1.04).ok).toBe(true);
              expect(diagnoseCurve(q, q.answer * 0.46).code).toBe('E5');
              expect(diagnoseCurve(q, q.answer * 0.69).code).toBe('E5');
              expect(diagnoseCurve(q, q.answer * 1.6).code).toBeNull();
            } else {
              const correct = q.options.filter((o) => o.correct);
              expect(correct.length).toBe(1);
              expect(diagnoseChoice(q, correct[0].id).ok).toBe(true);
              const texts = q.options.map((o) => o.text);
              expect(new Set(texts).size).toBe(texts.length);
              for (const o of q.options.filter((x) => !x.correct)) {
                expect(o.code, `${tpl.id}/${q.id} option ${o.text}`).not.toBeNull();
                expect(diagnoseChoice(q, o.id).code).toBe(o.code);
              }
            }
          }
        }
      });
    });
  }

  it('ne propose jamais deux fois les mêmes valeurs à un apprenant (tant que c’est possible)', () => {
    const rng = mulberry32(42);
    for (const id of ['F1', 'F4', 'M3', 'M5', 'D3', 'D5']) {
      const seen: string[] = [];
      for (let k = 0; k < 15; k++) {
        const inst = createFreshInstance(id, seen, () => Math.floor(rng() * 2 ** 31));
        expect(seen).not.toContain(inst.valueKey);
        seen.push(inst.valueKey);
      }
    }
  });

  it('F4 : « durée = τ » est diagnostiqué E5 et « ×10³ » est diagnostiqué EX', () => {
    const inst = createInstance('F4', 123);
    const [qTau, qDuree] = inst.questions;
    if (qTau.kind !== 'NUM' || qDuree.kind !== 'NUM') throw new Error('format');
    expect(diagnoseNum(qDuree, qTau.answer).code).toBe('E5');
    expect(diagnoseNum(qTau, qTau.answer * 1e3)).toMatchObject({ code: 'EX', sub: 'puissance' });
  });

  it('M5 : en décharge, le signe + est diagnostiqué E6 et i(0⁺) = 0 est diagnostiqué E3', () => {
    for (const seed of SEEDS) {
      const inst = createInstance('M5', seed);
      if (inst.values.phase !== 'decharge') continue;
      const q = inst.questions[1];
      if (q.kind !== 'NUM') throw new Error('format');
      expect(q.answer).toBeLessThan(0);
      expect(diagnoseNum(q, -q.answer).code).toBe('E6');
      expect(diagnoseNum(q, 0).code).toBe('E3');
      return;
    }
  });
});
