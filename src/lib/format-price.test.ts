import { formatPrice } from './format-price';

describe('formatPrice', () => {
  it('formats cents as US dollars by default', () => {
    expect(formatPrice(1999)).toBe('$19.99');
  });

  it('formats zero and negative amounts', () => {
    expect(formatPrice(0)).toBe('$0.00');
    expect(formatPrice(-250)).toBe('-$2.50');
  });

  it('respects currency and locale', () => {
    // Intl uses a non-breaking space before the symbol, hence the regex.
    expect(formatPrice(1999, 'EUR', 'de-DE')).toMatch(/19,99\s€/);
  });

  it('rejects non-finite input', () => {
    expect(() => formatPrice(Number.NaN)).toThrow(TypeError);
  });
});
