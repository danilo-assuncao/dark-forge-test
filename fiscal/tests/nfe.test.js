'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calcIcms } = require('../nfe.js');

test('calculates ICMS using percentage rates', () => {
  assert.equal(calcIcms(1000, 18), 180);
  assert.equal(calcIcms(250, 7.5), 18.75);
  assert.equal(calcIcms(10, 150), 15);
});

test('rounds fractional cents including half-cent boundaries', () => {
  assert.equal(calcIcms(99.99, 18), 18);
  assert.equal(calcIcms(10.05, 5), 0.5);
  assert.equal(calcIcms(1.01, 50), 0.51);
  assert.equal(calcIcms(1.005, 100), 1.01);
  assert.equal(calcIcms(1000.5, 1), 10.01);
  assert.equal(calcIcms(10000.5, 1), 100.01);
  assert.equal(calcIcms(100000.5, 1), 1000.01);
  assert.equal(calcIcms(1000.4999, 1), 10);
  assert.equal(calcIcms(1000.5001, 1), 10.01);
});

test('zero amounts and rates yield positive zero', () => {
  assert.equal(calcIcms(0, 18), 0);
  assert.equal(calcIcms(100, 0), 0);
  assert.equal(calcIcms(-0, 18), 0);
  assert.equal(calcIcms(100, -0), 0);
});

test('rejects non-number and non-finite inputs for either argument', () => {
  for (const value of ['100', null, undefined, true, {}, [], NaN, Infinity, -Infinity]) {
    assert.throws(() => calcIcms(value, 18), {
      name: 'TypeError', message: /amountBrl must be a finite number/,
    });
    assert.throws(() => calcIcms(100, value), {
      name: 'TypeError', message: /ratePct must be a finite number/,
    });
  }
});

test('rejects negative amounts and rates', () => {
  assert.throws(() => calcIcms(-0.01, 18), {
    name: 'RangeError', message: /amountBrl must not be negative/,
  });
  assert.throws(() => calcIcms(100, -0.01), {
    name: 'RangeError', message: /ratePct must not be negative/,
  });
});

test('rejects calculation overflow', () => {
  assert.throws(() => calcIcms(Number.MAX_VALUE, 200), {
    name: 'RangeError', message: /too large/,
  });
});

test('rejects intermediate multiplication overflow even when the tax would be finite', () => {
  for (const amount of [1e307, Number.MAX_VALUE]) {
    assert.throws(() => calcIcms(amount, 100), {
      name: 'RangeError', message: /too large/,
    });
  }
});
