'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { computeBudget } = require('../calc.js');

test('computes subtotal, tax and total', () => {
  assert.deepEqual(computeBudget([100, 50.5], 10), { subtotal: 150.5, tax: 15.05, total: 165.55 });
});

test('zero tax leaves total equal to subtotal', () => {
  assert.deepEqual(computeBudget([10, 20], 0), { subtotal: 30, tax: 0, total: 30 });
});

test('rounds floating point sums to cents', () => {
  assert.equal(computeBudget([0.1, 0.2], 0).total, 0.3);
});

test('empty list yields zeros', () => {
  assert.deepEqual(computeBudget([], 15), { subtotal: 0, tax: 0, total: 0 });
});

test('rejects non-array items', () => {
  for (const bad of [null, undefined, 'abc', 5, {}]) {
    assert.throws(() => computeBudget(bad, 10), /items must be an array/);
  }
});

test('rejects invalid item values', () => {
  for (const bad of ['10', NaN, Infinity, null, undefined, {}]) {
    assert.throws(() => computeBudget([1, bad], 10), /items\[1\] must be a finite number/);
  }
  assert.throws(() => computeBudget([-1], 10), /items\[0\] must not be negative/);
});

test('rejects invalid taxPct', () => {
  for (const bad of ['10', NaN, Infinity, -Infinity, null, undefined]) {
    assert.throws(() => computeBudget([1], bad), /taxPct must be a finite number/);
  }
  assert.throws(() => computeBudget([1], -5), /taxPct must not be negative/);
});
