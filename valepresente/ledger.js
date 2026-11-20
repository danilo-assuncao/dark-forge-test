'use strict';

/** Summarize positive BRL amounts, rounding the total once to cents (half up). */
function summarizeRedemptions(amounts) {
  if (!Array.isArray(amounts)) {
    throw new TypeError('amounts must be an array.');
  }

  // Sum decimal representations exactly to avoid binary half-cent errors.
  let total = 0n;
  let scale = 0;
  for (let i = 0; i < amounts.length; i++) {
    const amount = amounts[i];
    if (typeof amount !== 'number' || !Number.isFinite(amount)) {
      throw new TypeError(`amounts[${i}] must be a finite number.`);
    }
    if (amount <= 0) {
      throw new RangeError(`amounts[${i}] must be positive.`);
    }

    const [coefficient, exponent = '0'] = amount.toString().split('e');
    const [whole, fraction = ''] = coefficient.split('.');
    const amountScale = fraction.length - Number(exponent);
    const nextScale = Math.max(scale, amountScale);
    total = total * 10n ** BigInt(nextScale - scale)
      + BigInt(whole + fraction) * 10n ** BigInt(nextScale - amountScale);
    scale = nextScale;
  }

  const cents = scale <= 2
    ? total * 10n ** BigInt(2 - scale)
    : (total + 10n ** BigInt(scale - 2) / 2n) / 10n ** BigInt(scale - 2);
  // Convert after placing the decimal point so scaling cannot overflow a Number.
  const digits = cents.toString().padStart(3, '0');
  const totalBrl = Number(`${digits.slice(0, -2)}.${digits.slice(-2)}`);
  if (!Number.isFinite(totalBrl)) {
    throw new RangeError('Redemption total is too large to represent.');
  }
  return { count: amounts.length, totalBrl };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { summarizeRedemptions };
}
