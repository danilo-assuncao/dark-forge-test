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

test('rounds currency down, up, and at half-cent boundaries', () => {
  for (const [actualKg, totalBrl] of [[1.001, 19.5], [1.002, 19.51], [1.01, 19.55]]) {
    assert.equal(calculateShippingQuote({ ...shipment, actualKg }).totalBrl, totalBrl);
  }
});

test('propagates zone validation errors', () => {
  assert.throws(() => calculateShippingQuote({ ...shipment, cepPrefix: 1 }), TypeError);
  assert.throws(() => calculateShippingQuote({ ...shipment, cepPrefix: '00' }), RangeError);
});

test('propagates validation errors for each shipment measurement', () => {
  for (const field of ['actualKg', 'lengthCm', 'widthCm', 'heightCm']) {
    assert.throws(() => calculateShippingQuote({ ...shipment, [field]: undefined }), TypeError);
    assert.throws(() => calculateShippingQuote({ ...shipment, [field]: 0 }), RangeError);
  }
});
