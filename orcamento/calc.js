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
  items.forEach((value, i) => {
    assertFiniteNumber(value, `items[${i}]`);
    if (value < 0) {
      throw new RangeError(`items[${i}] must not be negative.`);
    }
    sum += value;
  });

  const subtotal = round2(sum);
  const tax = round2(subtotal * taxPct / 100);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { computeBudget };
}
