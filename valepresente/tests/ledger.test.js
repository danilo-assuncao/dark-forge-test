'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { summarizeRedemptions } = require('../ledger.js');

test('summarizes redemptions without mutating the input', () => {
  const amounts = Object.freeze([10, 25.5, 4.25]);
  assert.deepEqual(summarizeRedemptions(amounts), { count: 3, totalBrl: 39.75 });
  assert.deepEqual(summarizeRedemptions([]), { count: 0, totalBrl: 0 });
});

test('rounds the combined decimal total once, half up', () => {
  for (const [amounts, totalBrl] of [
    [[0.1, 0.2], 0.3],
    [[1.005], 1.01],
    [[10.075], 10.08],
    [[8.344999999999999], 8.34],
    [[0.004, 0.004], 0.01],
    [[0.005, 0.005], 0.01],
    [[1, 0.005], 1.01],
    [[0.005, 1], 1.01],
    [[1e-7, Number.MIN_VALUE], 0]
  ]) {
    assert.deepEqual(summarizeRedemptions(amounts), { count: amounts.length, totalBrl });
  }
});

test('rejects non-array inputs', () => {
  for (const amounts of [undefined, null, 1, '1', {}, new Set([1])]) {
    assert.throws(() => summarizeRedemptions(amounts), TypeError);
  }
});

test('rejects non-number, non-finite, and missing entries', () => {
  for (const amount of [undefined, null, '1', true, {}, [], 1n, NaN, Infinity, -Infinity]) {
    assert.throws(() => summarizeRedemptions([1, amount]), TypeError);
  }
  assert.throws(() => summarizeRedemptions(new Array(2)), TypeError);
});

test('rejects zero and negative amounts before rounding', () => {
  for (const amount of [0, -0, -1, -0.001, -Number.MIN_VALUE]) {
    assert.throws(() => summarizeRedemptions([amount]), RangeError);
  }
});

test('supports exponential notation and rejects overflowing totals', () => {
  assert.deepEqual(summarizeRedemptions([1e21, 1e21]), { count: 2, totalBrl: 2e21 });
  assert.deepEqual(summarizeRedemptions([Number.MAX_VALUE]), {
    count: 1, totalBrl: Number.MAX_VALUE
  });
  assert.throws(() => summarizeRedemptions([Number.MAX_VALUE, Number.MAX_VALUE]), RangeError);
});
