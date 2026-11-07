import { describe, expect, it } from 'vitest';
import { RCTimeline } from '../physics/rc';
import { checkS2, checkS3, checkS5, checkS7, checkS8, checkTau } from './missionChecks';

describe('vérifications automatiques des missions (section 6.4)', () => {
  it('S3 : quatre lectures au curseur à 5 % près', () => {
    const ok = checkS3({ uc0: 0, i0: 6e-3, uc5: 5.96, i5: 0.04e-3 }, 6, 1000);
    expect(Object.values(ok).every(Boolean)).toBe(true);
    const wrong = checkS3({ uc0: 6, i0: 0, uc5: 6, i5: 0 }, 6, 1000);
    expect(wrong.uc0).toBe(false);
    expect(wrong.i0).toBe(false);
    expect(wrong.uc5).toBe(true);
    expect(wrong.i5).toBe(true);
  });

  it('S4 : τ à ±5 %', () => {
    expect(checkTau(0.048, 0.047)).toBe(true);
    expect(checkTau(0.03, 0.047)).toBe(false);
    expect(checkTau(null, 0.047)).toBe(false);
  });

  it('S5 : rapport ≈ 2', () => {
    const r = checkS5(0.0484, 0.0968, 0.0484);
    expect(r.ok1 && r.ok2 && r.ratioOk).toBe(true);
    expect(checkS5(0.0484, 0.0484, 0.0484).ratioOk).toBe(false);
  });

  it('S2 : q double et C double', () => {
    expect(checkS2(120e-6, 20e-6, 10e-6, 6)).toEqual({ q: true, c: true });
    expect(checkS2(60e-6, 10e-6, 10e-6, 6)).toEqual({ q: false, c: false });
  });

  it('S7 : deux lectures cohérentes pendant la charge', () => {
    const tl = RCTimeline.start({ E: 9, R: 4700, C: 22e-6 }, 2, 0).switchK(1, 0);
    const tau = 4700 * 22e-6;
    const s1 = tl.stateAt(0.5 * tau);
    const s2 = tl.stateAt(2 * tau);
    const r = checkS7(
      [
        { t: 0.5 * tau, uR: s1.uR, uC: s1.uC },
        { t: 2 * tau, uR: s2.uR, uC: s2.uC },
      ],
      tl,
    );
    expect(r.ok).toBe(true);
    const same = checkS7(
      [
        { t: tau, uR: 3, uC: 6 },
        { t: tau, uR: 3, uC: 6 },
      ],
      tl,
    );
    expect(same.ok).toBe(false);
  });

  it('S8 : ½CE² à ±2 %, oubli du ½ ou du carré → EX', () => {
    expect(checkS8(5e-3, 100e-6, 10)).toEqual({ ok: true, code: null });
    expect(checkS8(10e-3, 100e-6, 10)).toEqual({ ok: false, code: 'EX' });
    expect(checkS8(0.5e-3, 100e-6, 10)).toEqual({ ok: false, code: 'EX' });
    expect(checkS8(7e-3, 100e-6, 10)).toEqual({ ok: false, code: null });
  });
});
