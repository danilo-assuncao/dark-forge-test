'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { convertBrlToUsd } = require('../fx.js');

test('converts BRL using a rate expressed in BRL per USD', () => {
  assert.equal(convertBrlToUsd(100, 5), 20);
  assert.equal(convertBrlToUsd(25, 0.5), 50);
});

test('rounds down, up, and half cents to two decimal places', () => {
  assert.equal(convertBrlToUsd(10, 3), 3.33);
  assert.equal(convertBrlToUsd(20, 3), 6.67);
  assert.equal(convertBrlToUsd(1.01, 2), 0.51);
  assert.equal(convertBrlToUsd(2.01, 2), 1.01);
  assert.equal(convertBrlToUsd(1.005, 1), 1.01);
  assert.equal(convertBrlToUsd(2.675, 1), 2.68);
  assert.equal(convertBrlToUsd(10.005, 1), 10.01);
  assert.equal(convertBrlToUsd(1000.005, 1), 1000.01);
  assert.equal(convertBrlToUsd(10.004999999999999, 1), 10);
  assert.equal(convertBrlToUsd(0.01, 5), 0);
});

test('rejects nonnumeric and nonfinite values for both arguments', () => {
  for (const value of [undefined, null, '5', true, {}, [], NaN, Infinity, -Infinity, 5n, Symbol('rate')]) {
    assert.throws(() => convertBrlToUsd(value, 5), TypeError);
    assert.throws(() => convertBrlToUsd(100, value), TypeError);
  }
});

test('rejects zero and negative values for both arguments', () => {
  for (const value of [0, -0, -1, -Number.MIN_VALUE]) {
    assert.throws(() => convertBrlToUsd(value, 5), RangeError);
    assert.throws(() => convertBrlToUsd(100, value), RangeError);
  }
});

test('handles large finite results and rejects conversion overflow', () => {
  assert.equal(convertBrlToUsd(Number.MAX_VALUE, 1), Number.MAX_VALUE);
  assert.throws(() => convertBrlToUsd(Number.MAX_VALUE, 0.5), RangeError);
});

test('preserves amounts immediately below, at, and above safe cent precision', () => {
  const threshold = Number.MAX_SAFE_INTEGER / 100;
  assert.equal(convertBrlToUsd(threshold - 0.02, 1), 90071992547409.89);
  assert.equal(convertBrlToUsd(threshold, 1), 90071992547409.9);
  assert.equal(convertBrlToUsd(threshold + 0.02, 1), 90071992547409.92);
});

test('rounds tiny positive quotients and positive underflow to zero', () => {
  assert.equal(convertBrlToUsd(1e-7, 1), 0);
  assert.equal(convertBrlToUsd(Number.MIN_VALUE, 1), 0);
  assert.equal(convertBrlToUsd(Number.MIN_VALUE, Number.MAX_VALUE), 0);
});
