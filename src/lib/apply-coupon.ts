type CouponRules = { minSpendCents?: number; expiresAt?: Date };

export type Coupon =
  | ({ kind: 'percent'; percent: number } & CouponRules)
  | ({ kind: 'fixed'; amountCents: number } & CouponRules);

export type CouponResult =
  | { ok: true; discountCents: number; totalCents: number }
  | { ok: false; reason: 'expired' | 'min-spend' };

/** Works in whole cents so there is no floating-point money. `now` is a parameter so tests can fix it. */
export function applyCoupon(subtotalCents: number, coupon: Coupon, now = new Date()): CouponResult {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError('subtotalCents must be a whole number of cents, 0 or more');
  }
  if (coupon.expiresAt && now >= coupon.expiresAt) {
    return { ok: false, reason: 'expired' };
  }
  if (coupon.minSpendCents !== undefined && subtotalCents < coupon.minSpendCents) {
    return { ok: false, reason: 'min-spend' };
  }

  const discount =
    coupon.kind === 'percent'
      ? Math.round((subtotalCents * coupon.percent) / 100)
      : coupon.amountCents;
  const discountCents = Math.min(discount, subtotalCents);

  return { ok: true, discountCents, totalCents: subtotalCents - discountCents };
}
