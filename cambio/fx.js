'use strict';

function assertPositiveFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value <= 0) {
    throw new RangeError(`${name} must be positive`);
  }
}

// rate is BRL per USD; round the quotient's decimal representation half up.
function convertBrlToUsd(brl, rate) {
  assertPositiveFinite(brl, 'brl');
  assertPositiveFinite(rate, 'rate');

  const usd = brl / rate;
  if (!Number.isFinite(usd)) {
    throw new RangeError('Converted amount is out of range');
  }
  // Beyond safe cent precision, preserve the double and avoid scaling overflow.
  if (usd >= Number.MAX_SAFE_INTEGER / 100) return usd;
  // Shift decimal exponents instead of multiplying binary fractions by 100.
  // Splitting also handles very small quotients written in scientific notation.
  const [coefficient, exponent = '0'] = String(usd).split('e');
  const cents = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
  return Number(`${cents}e-2`);
}

module.exports = { convertBrlToUsd };
