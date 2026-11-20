'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { earnPoints } = require('../points.js');

test('awards points using each tier multiplier', () => {
  assert.equal(earnPoints(100, 'bronze'), 100);
  assert.equal(earnPoints(100, 'silver'), 150);
  assert.equal(earnPoints(100, 'gold'), 200);
});

test('floors fractional points after applying the multiplier', () => {
  assert.equal(earnPoints(1.99, 'bronze'), 1);
  assert.equal(earnPoints(1.99, 'silver'), 2);
  assert.equal(earnPoints(1.99, 'gold'), 3);
  assert.equal(earnPoints(0.75, 'silver'), 1);
  assert.equal(earnPoints(0.5, 'gold'), 1);
  assert.equal(earnPoints(0.49, 'gold'), 0);
});

test('zero and negative zero earn positive zero for every tier', () => {
  for (const tier of ['bronze', 'silver', 'gold']) {
    assert.equal(earnPoints(0, tier), 0);
    assert.equal(earnPoints(-0, tier), 0);
  }
});

test('rejects non-numeric and non-finite amounts without coercion', () => {
  for (const amount of [NaN, Infinity, -Infinity, '100', '', null, undefined, true, {}, [], 1n, Symbol('amount')]) {
    assert.throws(() => earnPoints(amount, 'bronze'), {
      name: 'TypeError', message: /amountBrl must be a finite number/,
    });
  }
});

test('rejects negative amounts including tiny negative values', () => {
  for (const amount of [-1, -0.01, -Number.MIN_VALUE]) {
    assert.throws(() => earnPoints(amount, 'gold'), {
      name: 'RangeError', message: /amountBrl must not be negative/,
    });
  }
});

test('rejects missing, unknown, and non-string tiers', () => {
  for (const tier of [undefined, null, '', 'platinum', 'Gold', ' gold ', 'constructor', '__proto__', 1, {}, ['gold']]) {
    assert.throws(() => earnPoints(10, tier), {
      name: 'RangeError', message: /tier must be bronze, silver, or gold/,
    });
  }
});

test('rejects multiplication overflow', () => {
  for (const tier of ['silver', 'gold']) {
    assert.throws(() => earnPoints(Number.MAX_VALUE, tier), {
      name: 'RangeError', message: /too large to represent/,
    });
  }
  assert.equal(earnPoints(Number.MAX_VALUE, 'bronze'), Number.MAX_VALUE);
});
