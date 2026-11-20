'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateShippingQuote } = require('../quote');

const shipment = { cepPrefix: '01', actualKg: 2, lengthCm: 30, widthCm: 20, heightCm: 10 };

for (const [cepPrefix, zone, totalBrl] of [
  ['01', 'SP', 24], ['19', 'SP', 24],
  ['20', 'RJ', 29], ['28', 'RJ', 29],
  ['29', 'BR', 39], ['99', 'BR', 39]
]) {
  test(`quotes prefix ${cepPrefix} using the ${zone} base rate`, () => {
    assert.deepEqual(calculateShippingQuote({ ...shipment, cepPrefix }), {
      zone, weightKg: 2, totalBrl
    });
  });
}

test('charges volumetric weight when it exceeds actual weight', () => {
  assert.deepEqual(calculateShippingQuote({ ...shipment, lengthCm: 60, widthCm: 40, heightCm: 30 }), {
    zone: 'SP', weightKg: 12, totalBrl: 69
  });
});

test('uses the rounded billable weight before rounding the final price', () => {
  assert.deepEqual(calculateShippingQuote({ ...shipment, actualKg: 2.3456 }), {
    zone: 'SP', weightKg: 2.346, totalBrl: 25.56
  });
});

test('rounds currency to the nearest centavo with decimal ties rounded up', () => {
  for (const [actualKg, totalBrl] of [[1.001, 19.5], [1.002, 19.51], [1.01, 19.55]]) {
    assert.equal(calculateShippingQuote({ ...shipment, actualKg }).totalBrl, totalBrl);
  }
});

test('rounds the exact decimal total 16.935 BRL up to 16.94 BRL', () => {
  assert.deepEqual(calculateShippingQuote({
    ...shipment, actualKg: 0.43, lengthCm: 1, widthCm: 1, heightCm: 1
  }), { zone: 'SP', weightKg: 0.43, totalBrl: 16.94 });
});

test('matches integer half-up pricing for every gram through 199.999 kg', () => {
  for (let grams = 1; grams <= 199999; grams++) {
    const quote = calculateShippingQuote({
      ...shipment, actualKg: grams / 1000, lengthCm: 1, widthCm: 1, heightCm: 1
    });
    const expectedCentavos = 1500 + Math.floor((grams * 9 + 10) / 20);
    assert.equal(quote.totalBrl, expectedCentavos / 100, `${grams} grams`);
  }
});

test('rejects charges that overflow or exceed safe integer precision', () => {
  for (const actualKg of [Number.MAX_VALUE, 1e12]) {
    assert.throws(() => calculateShippingQuote({ ...shipment, actualKg }), RangeError);
  }
});

test('propagates zone validation errors', () => {
  assert.throws(() => calculateShippingQuote({ ...shipment, cepPrefix: 1 }), TypeError);
  assert.throws(() => calculateShippingQuote({ ...shipment, cepPrefix: '00' }), RangeError);
});

test('propagates validation errors for each shipment measurement', () => {
  for (const field of ['actualKg', 'lengthCm', 'widthCm', 'heightCm']) {
    for (const value of [undefined, NaN, Infinity, -Infinity, '2']) {
      assert.throws(() => calculateShippingQuote({ ...shipment, [field]: value }), TypeError);
    }
    for (const value of [0, -1]) {
      assert.throws(() => calculateShippingQuote({ ...shipment, [field]: value }), RangeError);
    }
  }
});

test('rejects a missing shipment', () => {
  assert.throws(() => calculateShippingQuote(), TypeError);
});
