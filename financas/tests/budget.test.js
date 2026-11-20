'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { analyzeMonthlyBudget } = require('../budget.js');

test('matches the 50-30-20 targets exactly', () => {
  const r = analyzeMonthlyBudget({ netIncomeBrl: 10000, essentialsBrl: 5000, lifestyleBrl: 3000 });
  assert.deepEqual(r.actualPercentages, { essentials: 50, lifestyle: 30, savings: 20 });
  assert.deepEqual(r.differencePercentages, { essentials: 0, lifestyle: 0, savings: 0 });
  assert.deepEqual(r.targetPercentages, { essentials: 50, lifestyle: 30, savings: 20 });
  assert.equal(r.monthlySavingsCapacityBrl, 2000);
});

test('clt reserve is 6 months of essentials (default)', () => {
  const r = analyzeMonthlyBudget({ netIncomeBrl: 5000, essentialsBrl: 2500, lifestyleBrl: 1000 });
  assert.equal(r.employmentType, 'clt');
  assert.equal(r.emergencyReserveMonths, 6);
  assert.equal(r.emergencyReserveTargetBrl, 15000);
});

test('autonomo reserve is 12 months of essentials, via either key casing', () => {
  const a = analyzeMonthlyBudget({ netIncomeBrl: 5000, essentialsBrl: 2500, lifestyleBrl: 1000, employmentType: 'autonomo' });
  const b = analyzeMonthlyBudget({ netIncomeBrl: 5000, essentialsBrl: 2500, lifestyleBrl: 1000, EmploymentType: 'autonomo' });
  assert.equal(a.emergencyReserveTargetBrl, 30000);
  assert.deepEqual(a, b);
});

test('reports negative capacity when spending exceeds income', () => {
  const r = analyzeMonthlyBudget({ netIncomeBrl: 3000, essentialsBrl: 2000, lifestyleBrl: 1500 });
  assert.equal(r.monthlySavingsCapacityBrl, -500);
  assert.equal(r.actualPercentages.savings, -16.67);
  assert.equal(r.differencePercentages.savings, -36.67);
});

test('rounds percentages and amounts to two decimals', () => {
  const r = analyzeMonthlyBudget({ netIncomeBrl: 3000, essentialsBrl: 1000.555, lifestyleBrl: 1000 });
  assert.equal(r.actualPercentages.essentials, 33.35);
  assert.equal(r.monthlySavingsCapacityBrl, 999.45);
});

test('canonical employmentType wins over the EmploymentType alias', () => {
  const base = { netIncomeBrl: 5000, essentialsBrl: 2500, lifestyleBrl: 1000 };
  assert.equal(analyzeMonthlyBudget({ ...base, employmentType: 'clt', EmploymentType: 'autonomo' }).employmentType, 'clt');
  assert.equal(analyzeMonthlyBudget({ ...base, employmentType: null, EmploymentType: 'autonomo' }).employmentType, 'autonomo');
  assert.throws(() => analyzeMonthlyBudget({ ...base, employmentType: '' }), RangeError);
});

test('never returns -0 for near-zero negative capacity', () => {
  const r = analyzeMonthlyBudget({ netIncomeBrl: 1000, essentialsBrl: 500, lifestyleBrl: 500.001 });
  assert.ok(Object.is(r.monthlySavingsCapacityBrl, 0));
  assert.ok(Object.is(r.actualPercentages.savings, 0));
  assert.ok(Object.is(r.differencePercentages.savings, -20));
});

test('rounds half cents up regardless of magnitude', () => {
  const r = analyzeMonthlyBudget({ netIncomeBrl: 100000, essentialsBrl: 1.005, lifestyleBrl: 0 });
  assert.equal(r.monthlySavingsCapacityBrl, 99999);
  assert.equal(r.emergencyReserveTargetBrl, 6.03);
});

test('accepts zero essentials and lifestyle', () => {
  const r = analyzeMonthlyBudget({ netIncomeBrl: 1000, essentialsBrl: 0, lifestyleBrl: 0 });
  assert.equal(r.emergencyReserveTargetBrl, 0);
  assert.equal(r.monthlySavingsCapacityBrl, 1000);
});

const ok = { netIncomeBrl: 1000, essentialsBrl: 500, lifestyleBrl: 300 };
const invalid = [
  ['zero income', { netIncomeBrl: 0 }, RangeError, /netIncomeBrl must be positive/],
  ['negative income', { netIncomeBrl: -1 }, RangeError, /netIncomeBrl/],
  ['string income', { netIncomeBrl: '1000' }, TypeError, /netIncomeBrl must be a finite number/],
  ['Infinity income', { netIncomeBrl: Infinity }, TypeError, /netIncomeBrl/],
  ['negative essentials', { essentialsBrl: -1 }, RangeError, /essentialsBrl must be non-negative/],
  ['undefined essentials', { essentialsBrl: undefined }, TypeError, /essentialsBrl/],
  ['Infinity essentials', { essentialsBrl: Infinity }, TypeError, /essentialsBrl/],
  ['negative lifestyle', { lifestyleBrl: -1 }, RangeError, /lifestyleBrl must be non-negative/],
  ['NaN lifestyle', { lifestyleBrl: NaN }, TypeError, /lifestyleBrl/],
  ['unknown type', { employmentType: 'pj' }, RangeError, /employmentType/],
  ['prototype key type', { employmentType: 'toString' }, RangeError, /employmentType/],
];
for (const [name, override, error, message] of invalid) {
  test(`rejects ${name}`, () => {
    assert.throws(() => analyzeMonthlyBudget({ ...ok, ...override }), (e) => e instanceof error && message.test(e.message));
  });
}

test('rejects a missing argument', () => {
  assert.throws(() => analyzeMonthlyBudget(), TypeError);
});
