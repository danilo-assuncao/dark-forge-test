'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { simulateFixedIncome } = require('../simulator.js');

const base = { initialBrl: 1000, monthlyBrl: 0, annualRatePct: 12 };

test('LCI is tax free', () => {
  const r = simulateFixedIncome({ ...base, months: 12, product: 'LCI' });
  assert.equal(r.totalInvestedBrl, 1000);
  assert.equal(r.grossBrl, 1120);
  assert.equal(r.taxBrl, 0);
  assert.equal(r.netBrl, 1120);
});

test('CDB applies regressive IR brackets', () => {
  const cases = [
    [1, 0.225], [6, 0.225], [7, 0.2], [12, 0.2], [13, 0.175], [24, 0.175], [25, 0.15], [36, 0.15],
  ];
  for (const [months, rate] of cases) {
    const r = simulateFixedIncome({ ...base, months, product: 'CDB' });
    const expectedTax = Math.round((r.grossBrl - r.totalInvestedBrl) * rate * 100) / 100;
    assert.ok(Math.abs(r.taxBrl - expectedTax) <= 0.02, `months=${months}`);
    assert.equal(r.netBrl, Math.round((r.grossBrl - r.taxBrl) * 100) / 100);
  }
});

test('CDB 12 months at 12% a year', () => {
  const r = simulateFixedIncome({ ...base, months: 12, product: 'CDB' });
  assert.deepEqual(r, { totalInvestedBrl: 1000, grossBrl: 1120, taxBrl: 24, netBrl: 1096 });
});

test('includes monthly deposits in total invested', () => {
  const r = simulateFixedIncome({ initialBrl: 0, monthlyBrl: 100, months: 12, annualRatePct: 0, product: 'CDB' });
  assert.deepEqual(r, { totalInvestedBrl: 1200, grossBrl: 1200, taxBrl: 0, netBrl: 1200 });
});

test('uses the geometric monthly equivalent rate', () => {
  const r = simulateFixedIncome({ initialBrl: 100, monthlyBrl: 0, months: 1, annualRatePct: 10, product: 'LCI' });
  assert.equal(r.grossBrl, 100.80);
});

test('rejects invalid input', () => {
  const ok = { ...base, months: 12, product: 'CDB' };
  assert.throws(() => simulateFixedIncome({ ...ok, product: 'LCA' }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, months: 0 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, months: 1.5 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, initialBrl: -1 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, annualRatePct: NaN }), TypeError);
  assert.throws(() => simulateFixedIncome({ ...ok, monthlyBrl: '1' }), TypeError);
});
