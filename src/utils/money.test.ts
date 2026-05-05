import { formatINR, parseINR, paiseToRupees, rupeesToPaise } from './money';

describe('money utils', () => {
  test('rupeesToPaise rounds correctly', () => {
    expect(rupeesToPaise(1)).toBe(100);
    expect(rupeesToPaise(1.5)).toBe(150);
    expect(rupeesToPaise(1.234)).toBe(123); // round half-up
    expect(rupeesToPaise(0)).toBe(0);
  });

  test('paiseToRupees round-trip', () => {
    expect(paiseToRupees(rupeesToPaise(99.99))).toBeCloseTo(99.99, 2);
  });

  test('formatINR uses Indian grouping', () => {
    expect(formatINR(rupeesToPaise(125000))).toContain('1,25,000');
    expect(formatINR(rupeesToPaise(0))).toContain('0');
  });

  test('parseINR accepts symbols and commas', () => {
    expect(parseINR('₹1,234.50')).toBe(123450);
    expect(parseINR('  1234 ')).toBe(123400);
    expect(parseINR('')).toBeNull();
    expect(parseINR('abc')).toBeNull();
    expect(parseINR('-5')).toBeNull();
  });

  test('rupeesToPaise rejects non-finite', () => {
    expect(() => rupeesToPaise(Number.NaN)).toThrow();
    expect(() => rupeesToPaise(Infinity)).toThrow();
  });
});
