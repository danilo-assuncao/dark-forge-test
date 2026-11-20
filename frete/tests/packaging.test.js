'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { billableWeightKg } = require('../packaging.js');

test('uses actual weight when it exceeds volumetric weight', () => {
  assert.equal(billableWeightKg(12, 30, 20, 10), 12);
});

test('uses volumetric weight with the 6000 divisor', () => {
  assert.equal(billableWeightKg(2, 60, 40, 30), 12);
});

test('handles equal actual and volumetric weights', () => {
  assert.equal(billableWeightKg(1, 30, 20, 10), 1);
});

test('rounds the selected weight to three decimals', () => {
  assert.equal(billableWeightKg(2.3454, 1, 1, 1), 2.345);
  assert.equal(billableWeightKg(2.3456, 1, 1, 1), 2.346);
  assert.equal(billableWeightKg(1.2345, 1, 1, 1), 1.235);
  assert.equal(billableWeightKg(0.1, 10, 10, 10), 0.167);
  assert.equal(billableWeightKg(0.1, 10, 10, 10.01), 0.167);
});

test('bills positive shipments at a minimum of one gram', () => {
  assert.equal(billableWeightKg(0.0001, 0.1, 0.1, 0.1), 0.001);
  assert.equal(billableWeightKg(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE), 0.001);
  assert.equal(billableWeightKg(1e-7, 0.1, 0.1, 0.1), 0.001);
  assert.equal(billableWeightKg(0.0005, 0.1, 0.1, 0.1), 0.001);
  assert.equal(billableWeightKg(0.001, 0.1, 0.1, 0.1), 0.001);
});

test('rounds decimal half units up without moving nearby values across the boundary', () => {
  assert.equal(billableWeightKg(1.0015, 1, 1, 1), 1.002);
  assert.equal(billableWeightKg(1.0014999999999998, 1, 1, 1), 1.001);
  assert.equal(billableWeightKg(1.0015000000000003, 1, 1, 1), 1.002);
  assert.equal(billableWeightKg(0.1, 6009, 1, 1), 1.002);
});

for (const [index, name] of ['actualKg', 'lengthCm', 'widthCm', 'heightCm'].entries()) {
  test(`rejects nonnumeric and nonfinite ${name}`, () => {
    for (const invalid of [undefined, null, '1', true, {}, [], 1n, Symbol('weight'), NaN, Infinity, -Infinity]) {
      const args = [1, 10, 10, 10];
      args[index] = invalid;
      assert.throws(() => billableWeightKg(...args), {
        name: 'TypeError', message: `${name} must be a finite number.`
      });
    }
  });

  test(`rejects zero and negative ${name}`, () => {
    for (const invalid of [0, -0, -1]) {
      const args = [1, 10, 10, 10];
      args[index] = invalid;
      assert.throws(() => billableWeightKg(...args), {
        name: 'RangeError', message: `${name} must be positive.`
      });
    }
  });
}

test('preserves large finite actual weights without rounding overflow', () => {
  assert.equal(billableWeightKg(Number.MAX_VALUE, 1, 1, 1), Number.MAX_VALUE);
});

test('handles actual and volumetric weights around the large-weight cutoff', () => {
  for (const weight of [9999999999999.123, 9999999999999.998, 1e13, 10000000000000.002]) {
    assert.equal(billableWeightKg(weight, 1, 1, 1), weight);
  }
  assert.equal(billableWeightKg(1, 60000000, 1000000, 1000), 1e13);
  assert.equal(billableWeightKg(1, 60000000, 1000000, 2000), 2e13);
});

test('rejects volumetric overflow', () => {
  assert.throws(() => billableWeightKg(1, 1e308, 1e308, 1e308), {
    name: 'RangeError', message: /too large/
  });
});
