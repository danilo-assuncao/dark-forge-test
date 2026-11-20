'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateBaseQuote, DEDUCTIBLES } = require('../quote.js');

const base = { vehicleId: 'sedan-medio', driverAge: 30, hasGarage: false };

test('defaults: bonus class 0 and normal deductible', () => {
  const q = calculateBaseQuote(base);
  // 12_500_000 * 0.05
  assert.equal(q.annualPremiumCents, 625000);
  assert.equal(q.bonusClass, 0);
  assert.equal(q.deductibleType, 'normal');
  assert.equal(q.deductibleCents, 750000);
});

test('bonus discount is 3% per class, capped at 30%', () => {
  assert.equal(calculateBaseQuote({ ...base, bonusClass: 1 }).annualPremiumCents, 606250);
  assert.equal(calculateBaseQuote({ ...base, bonusClass: 5 }).annualPremiumCents, 531250);
  const max = calculateBaseQuote({ ...base, bonusClass: 10 });
  assert.equal(max.annualPremiumCents, 437500);
  assert.equal(max.bonusDiscount, 0.3);
});

test('deductible types adjust premium and deductible amount', () => {
  const r = calculateBaseQuote({ ...base, deductibleType: 'reduzida' });
  assert.equal(r.annualPremiumCents, 737500);
  assert.equal(r.deductibleCents, 375000);
  const m = calculateBaseQuote({ ...base, deductibleType: 'majorada' });
  assert.equal(m.annualPremiumCents, 537500);
  assert.equal(m.deductibleCents, 1250000);
  assert.deepEqual(Object.keys(DEDUCTIBLES).sort(), ['majorada', 'normal', 'reduzida']);
});

test('combines age, garage, bonus and deductible', () => {
  // 7_500_000 * 0.045 = 337_500; * 1.242 * 0.79 * 1.18
  const q = calculateBaseQuote({
    vehicleId: 'hatch-compacto', driverAge: 20, hasGarage: true, bonusClass: 7, deductibleType: 'reduzida'
  });
  assert.equal(q.riskMultiplier, 1.242);
  // 419175 * 0.79 = 331148.25; * 1.18 = 390754.935
  assert.equal(q.annualPremiumCents, 390755);
  assert.equal(q.deductibleCents, 225000);
  assert.ok(Number.isInteger(q.annualPremiumCents));
});

test('returns the full result shape', () => {
  assert.deepEqual(calculateBaseQuote(base), {
    vehicleId: 'sedan-medio',
    fipeCents: 12500000,
    basePremiumCents: 625000,
    riskMultiplier: 1,
    bonusClass: 0,
    bonusDiscount: 0,
    deductibleType: 'normal',
    deductiblePremiumFactor: 1,
    annualPremiumCents: 625000,
    deductibleCents: 750000
  });
  const r = calculateBaseQuote({ ...base, deductibleType: 'reduzida' });
  assert.equal(r.deductiblePremiumFactor, 1.18);
  assert.equal(r.basePremiumCents, 625000);
});

test('accepts explicit bonusClass 0 and normalizes vehicleId', () => {
  const q = calculateBaseQuote({ ...base, vehicleId: ' Sedan-Medio ', bonusClass: 0 });
  assert.equal(q.vehicleId, 'sedan-medio');
  assert.equal(q.bonusDiscount, 0);
  assert.equal(q.annualPremiumCents, 625000);
});

test('rejects NaN, null and Infinity bonusClass and non-string deductibleType', () => {
  [NaN, null, Infinity, -Infinity].forEach((bonusClass) => {
    assert.throws(() => calculateBaseQuote({ ...base, bonusClass }), /bonusClass/);
  });
  [null, 1, {}].forEach((deductibleType) => {
    assert.throws(() => calculateBaseQuote({ ...base, deductibleType }), /deductibleType/);
  });
});

test('rejects invalid inputs', () => {
  assert.throws(() => calculateBaseQuote({ ...base, vehicleId: 'nope' }), /vehicleId/);
  assert.throws(() => calculateBaseQuote({ ...base, driverAge: 17 }), /driverAge/);
  assert.throws(() => calculateBaseQuote({ ...base, bonusClass: -1 }), /bonusClass/);
  assert.throws(() => calculateBaseQuote({ ...base, bonusClass: 11 }), /bonusClass/);
  assert.throws(() => calculateBaseQuote({ ...base, bonusClass: 1.5 }), /bonusClass/);
  assert.throws(() => calculateBaseQuote({ ...base, bonusClass: '3' }), /bonusClass/);
  assert.throws(() => calculateBaseQuote({ ...base, deductibleType: 'toString' }), /deductibleType/);
  assert.throws(() => calculateBaseQuote({ ...base, deductibleType: 'x' }), /deductibleType/);
  assert.throws(() => calculateBaseQuote(), RangeError);
});
