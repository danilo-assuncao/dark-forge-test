'use strict';

function assertPositiveFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value <= 0) {
    throw new RangeError(`${name} must be positive`);
  }
}

// rate is the number of BRL per USD; returns USD rounded to two decimals.
function convertBrlToUsd(brl, rate) {
  assertPositiveFinite(brl, 'brl');
  assertPositiveFinite(rate, 'rate');

  const usd = brl / rate;
  if (!Number.isFinite(usd)) {
    throw new RangeError('Converted amount is out of range');
  }
  // Large doubles already have no fractional cents; avoid scaling overflow.
  if (usd >= Number.MAX_SAFE_INTEGER / 100) return usd;
  return Math.round((usd + Number.EPSILON) * 100) / 100;
}

module.exports = { convertBrlToUsd };
