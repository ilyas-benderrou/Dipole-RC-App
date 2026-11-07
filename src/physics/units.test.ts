import { describe, expect, it } from 'vitest';
import { formatNumber, formatQuantity, isClose, isPowerOfTenOff, parseQuantity, parseUserNumber, sigFigs } from './units';

describe('nombres et unités', () => {
  it('lit les saisies françaises et scientifiques', () => {
    expect(parseUserNumber('56,4')).toBeCloseTo(56.4);
    expect(parseUserNumber(' 2.5 ')).toBe(2.5);
    expect(parseUserNumber('5,64e-5')).toBeCloseTo(5.64e-5);
    expect(parseUserNumber('5,64×10^-5')).toBeCloseTo(5.64e-5);
    expect(parseUserNumber('5,64x10-5')).toBeCloseTo(5.64e-5);
    expect(parseUserNumber('10^-3')).toBeCloseTo(1e-3);
    expect(parseUserNumber('−5')).toBe(-5);
    expect(parseUserNumber('1/2')).toBe(0.5);
    expect(parseUserNumber('abc')).toBeNull();
    expect(parseUserNumber('')).toBeNull();
  });

  it('compte les chiffres significatifs (valeurs propres)', () => {
    expect(sigFigs(4.7e-3)).toBe(2);
    expect(sigFigs(22.09e-3)).toBe(4);
    expect(sigFigs(0.1)).toBe(1);
    expect(sigFigs(4.84e-3)).toBe(3);
    expect(sigFigs(4.7 * 4.7e-6 * 1000)).toBe(4);
  });

  it('formate en français avec les unités des sujets marocains', () => {
    expect(formatNumber(56.4)).toBe('56,4');
    expect(formatQuantity(4.7e-6, 'capacite')).toBe('4,7 µF');
    expect(formatQuantity(0.022, 'temps')).toBe('22 ms');
    expect(formatQuantity(-0.005, 'courant')).toBe('−5 mA');
    expect(formatQuantity(5e-4, 'energie')).toBe('500 µJ');
    expect(formatQuantity(2200, 'resistance')).toBe('2,2 kΩ');
  });

  it('tolérance relative et erreurs de puissance de 10', () => {
    expect(isClose(56.9, 56.4, 0.02)).toBe(true);
    expect(isClose(60, 56.4, 0.02)).toBe(false);
    expect(isPowerOfTenOff(56.4e-3, 56.4e-6)).toBe(true);
    expect(isPowerOfTenOff(56.4e-6, 56.4e-6)).toBe(false);
    expect(isPowerOfTenOff(-5e-3, 5e-3)).toBe(false);
  });

  it('lit une grandeur avec son unité', () => {
    expect(parseQuantity('56,4 µC', 'charge')?.value).toBeCloseTo(56.4e-6);
    expect(parseQuantity('56,4 uC', 'charge')?.value).toBeCloseTo(56.4e-6);
    expect(parseQuantity('5,64e-5 C', 'charge')?.value).toBeCloseTo(5.64e-5);
    expect(parseQuantity('-5 mA', 'courant')?.value).toBeCloseTo(-5e-3);
    expect(parseQuantity('0,5 mJ', 'energie')?.value).toBeCloseTo(5e-4);
    expect(parseQuantity('20 ms', 'temps')?.value).toBeCloseTo(0.02);
  });
});
