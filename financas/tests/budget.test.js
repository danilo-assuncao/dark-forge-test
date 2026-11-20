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

test('rejects invalid inputs', () => {
  const ok = { netIncomeBrl: 1000, essentialsBrl: 500, lifestyleBrl: 300 };
  assert.throws(() => analyzeMonthlyBudget({ ...ok, netIncomeBrl: 0 }), RangeError);
  assert.throws(() => analyzeMonthlyBudget({ ...ok, netIncomeBrl: '1000' }), TypeError);
  assert.throws(() => analyzeMonthlyBudget({ ...ok, essentialsBrl: -1 }), RangeError);
  assert.throws(() => analyzeMonthlyBudget({ ...ok, lifestyleBrl: NaN }), TypeError);
  assert.throws(() => analyzeMonthlyBudget({ ...ok, employmentType: 'pj' }), RangeError);
  assert.throws(() => analyzeMonthlyBudget({ ...ok, employmentType: 'toString' }), RangeError);
  assert.throws(() => analyzeMonthlyBudget(), TypeError);
});
