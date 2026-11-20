'use strict';

// Return ICMS in BRL, rounded to cents; ratePct is a percentage.
function calcIcms(amountBrl, ratePct) {
  for (const [label, value] of [['amountBrl', amountBrl], ['ratePct', ratePct]]) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TypeError(`${label} must be a finite number.`);
    }
    if (value < 0) {
      throw new RangeError(`${label} must not be negative.`);
    }
  }

  const tax = amountBrl * ratePct / 100;
  // Remove floating-point noise at the cent scale before half-up rounding.
  const rounded = Math.round(Number((tax * 100).toPrecision(15))) / 100;
  if (!Number.isFinite(rounded)) {
    throw new RangeError('ICMS result is too large to represent.');
  }
  return rounded;
}

module.exports = { calcIcms };
