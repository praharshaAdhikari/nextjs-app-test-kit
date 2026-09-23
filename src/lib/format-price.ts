/**
 * Pure functions like this are the cheapest, highest-value unit tests in the codebase.
 * No DOM, no mocks, just inputs and outputs.
 */
export function formatPrice(amountInCents: number, currency = 'USD', locale = 'en-US'): string {
  if (!Number.isFinite(amountInCents)) {
    throw new TypeError('amountInCents must be a finite number');
  }
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amountInCents / 100);
}
