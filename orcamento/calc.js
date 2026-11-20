'use strict';

function assertFiniteNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// items: array of item values (finite numbers >= 0); taxPct: percentage >= 0.
function computeBudget(items, taxPct) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array.');
  }
  assertFiniteNumber(taxPct, 'taxPct');
  if (taxPct < 0) {
    throw new RangeError('taxPct must not be negative.');
  }

  let sum = 0;
  // Indexed loop (not forEach) so holes in sparse arrays are visited as undefined.
  for (let i = 0; i < items.length; i++) {
    const value = items[i];
    assertFiniteNumber(value, `items[${i}]`);
    if (value < 0) {
      throw new RangeError(`items[${i}] must not be negative.`);
    }
    sum += value;
  }

  const subtotal = round2(sum);
  const tax = round2(subtotal * taxPct / 100);
  const total = round2(subtotal + tax);
  if (![sum, subtotal, tax, total].every(Number.isFinite)) {
    throw new RangeError('Budget result is too large to represent.');
  }
  return { subtotal, tax, total };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeBudget };
}
