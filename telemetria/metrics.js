'use strict';

function assertValidAmount(n) {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) {
    throw new TypeError('increment amount must be a finite non-negative number');
  }
}

function createCounter(name) {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new TypeError('counter name must be a non-empty string');
  }

  let total = 0;

  return {
    increment(n = 1) {
      assertValidAmount(n);
      const next = total + n;
      if (!Number.isFinite(next)) {
        throw new RangeError('counter total would exceed the finite number range');
      }
      total = next;
      return total;
    },
    value() {
      return total;
    },
    snapshot() {
      return { name, value: total };
    }
  };
}

module.exports = { createCounter };
