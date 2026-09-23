import { applyCoupon, type Coupon } from './apply-coupon';

// A fixed "now" keeps expiry tests independent of when they run.
const now = new Date('2026-09-23T12:00:00Z');

describe('applyCoupon', () => {
  it('takes a percentage off the subtotal', () => {
    const coupon: Coupon = { kind: 'percent', percent: 10 };

    expect(applyCoupon(5000, coupon, now)).toStrictEqual({
      ok: true,
      discountCents: 500,
      totalCents: 4500,
    });
  });

  it('takes a fixed amount off the subtotal', () => {
    const coupon: Coupon = { kind: 'fixed', amountCents: 1500 };

    expect(applyCoupon(5000, coupon, now)).toStrictEqual({
      ok: true,
      discountCents: 1500,
      totalCents: 3500,
    });
  });

  it('rounds a percentage discount to the nearest cent', () => {
    const coupon: Coupon = { kind: 'percent', percent: 15 };

    // 15% of $9.99 is 149.85 cents
    expect(applyCoupon(999, coupon, now)).toMatchObject({ discountCents: 150, totalCents: 849 });
  });

  it('never takes the total below zero', () => {
    const coupon: Coupon = { kind: 'fixed', amountCents: 2000 };

    expect(applyCoupon(1200, coupon, now)).toMatchObject({ discountCents: 1200, totalCents: 0 });
  });

  it('accepts a coupon until its expiry time', () => {
    const coupon: Coupon = { kind: 'percent', percent: 10, expiresAt: new Date('2026-09-23T12:00:00.001Z') };

    expect(applyCoupon(5000, coupon, now)).toMatchObject({ ok: true });
  });

  it('rejects a coupon at or after its expiry time', () => {
    const coupon: Coupon = { kind: 'percent', percent: 10, expiresAt: now };

    expect(applyCoupon(5000, coupon, now)).toStrictEqual({ ok: false, reason: 'expired' });
  });

  // Table test: one row per boundary of the minimum-spend rule.
  it.each([
    [4999, { ok: false, reason: 'min-spend' }],
    [5000, { ok: true, discountCents: 1000, totalCents: 4000 }],
    [5001, { ok: true, discountCents: 1000, totalCents: 4001 }],
  ])('with a $50 minimum spend, a subtotal of %i cents gives %o', (subtotal, expected) => {
    const coupon: Coupon = { kind: 'fixed', amountCents: 1000, minSpendCents: 5000 };

    expect(applyCoupon(subtotal, coupon, now)).toStrictEqual(expected);
  });

  it.each([-1, 12.5, Number.NaN])('rejects an invalid subtotal of %p', (subtotal) => {
    const coupon: Coupon = { kind: 'percent', percent: 10 };

    expect(() => applyCoupon(subtotal, coupon, now)).toThrow(RangeError);
  });
});
