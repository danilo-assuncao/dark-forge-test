'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateWealthPlan } = require('../report.js');

function input() {
  return {
    budget: { netIncomeBrl: 10000, essentialsBrl: 5000, lifestyleBrl: 3000 },
    investment: { initialBrl: 1000, monthlyBrl: 0, months: 12, cdbAnnualRatePct: 12, lciAnnualRatePct: 10 },
    portfolio: {
      profile: 'moderado',
      holdings: { fixedIncome: 550, equities: 300, international: 100 },
      newContributionBrl: 50,
    },
  };
}

test('consolidates budget, net comparison, rebalancing and an INV reference', () => {
  const result = generateWealthPlan(input());
  assert.match(result.protocol, /^INV-\d{4}$/);
  assert.deepEqual(result.budget.targetPercentages, { essentials: 50, lifestyle: 30, savings: 20 });
  assert.deepEqual(result.budget.actualPercentages, result.budget.targetPercentages);
  assert.deepEqual(result.budget.differencePercentages, { essentials: 0, lifestyle: 0, savings: 0 });
  assert.equal(result.budget.monthlySavingsCapacityBrl, 2000);
  assert.equal(result.budget.emergencyReserveTargetBrl, 30000);
  assert.deepEqual(result.comparison, {
    cdb: { totalInvestedBrl: 1000, grossBrl: 1120, taxBrl: 24, netBrl: 1096 },
    lci: { totalInvestedBrl: 1000, grossBrl: 1100, taxBrl: 0, netBrl: 1100 },
    winner: 'LCI',
  });
  assert.deepEqual(result.portfolio.allocation, { fixedIncome: 0, equities: 0, international: 50 });
  assert.deepEqual(result.portfolio.newHoldings, { fixedIncome: 550, equities: 300, international: 150 });
  assert.equal(result.portfolio.totalBrl, 1000);
});

test('selects CDB when its net balance wins', () => {
  const data = input();
  data.investment.lciAnnualRatePct = 9;
  const { comparison } = generateWealthPlan(data);
  assert.equal(comparison.lci.netBrl, 1090);
  assert.equal(comparison.winner, 'CDB');
});

test('reports ties at cent precision, including zero-yield and zero-principal scenarios', () => {
  for (const overrides of [
    { lciAnnualRatePct: 9.6 },
    { cdbAnnualRatePct: 0, lciAnnualRatePct: 0 },
    { initialBrl: 0 },
    { initialBrl: 0.01 },
  ]) {
    const data = input();
    Object.assign(data.investment, overrides);
    const { comparison } = generateWealthPlan(data);
    assert.equal(comparison.cdb.netBrl, comparison.lci.netBrl);
    assert.equal(comparison.winner, 'TIE');
  }
});

test('uses the same monthly deposits for both products', () => {
  const data = input();
  Object.assign(data.investment, { initialBrl: 0, monthlyBrl: 200, months: 2, cdbAnnualRatePct: 12.6825, lciAnnualRatePct: 12.6825 });
  const { comparison } = generateWealthPlan(data);
  assert.deepEqual(comparison.cdb, { totalInvestedBrl: 400, grossBrl: 402, taxBrl: 0.45, netBrl: 401.55 });
  assert.deepEqual(comparison.lci, { totalInvestedBrl: 400, grossBrl: 402, taxBrl: 0, netBrl: 402 });
  assert.equal(comparison.winner, 'LCI');
});

test('preserves deficit diagnosis and employment alias without inventing contributions', () => {
  const data = input();
  data.budget = { netIncomeBrl: 3000, essentialsBrl: 2000, lifestyleBrl: 1500, EmploymentType: 'autonomo' };
  delete data.portfolio.newContributionBrl;
  const result = generateWealthPlan(data);
  assert.equal(result.budget.monthlySavingsCapacityBrl, -500);
  assert.equal(result.budget.emergencyReserveTargetBrl, 24000);
  assert.deepEqual(result.portfolio.allocation, { fixedIncome: 0, equities: 0, international: 0 });
  assert.equal(result.comparison.cdb.totalInvestedBrl, 1000);
});

test('accepts frozen inputs and returns independent report data', () => {
  const data = input();
  const snapshot = structuredClone(data);
  Object.freeze(data.portfolio.holdings);
  for (const section of Object.values(data)) Object.freeze(section);
  Object.freeze(data);
  const first = generateWealthPlan(data);
  first.budget.targetPercentages.essentials = 0;
  first.portfolio.newHoldings.fixedIncome = 0;
  first.comparison.cdb.netBrl = 0;
  const second = generateWealthPlan(data);
  assert.equal(second.budget.targetPercentages.essentials, 50);
  assert.equal(second.portfolio.newHoldings.fixedIncome, 550);
  assert.equal(second.comparison.cdb.netBrl, 1096);
  assert.deepEqual(data, snapshot);
});

test('rejects missing or malformed input sections', () => {
  for (const value of [undefined, null, [], 1, 'input']) {
    assert.throws(() => generateWealthPlan(value), /input must be an object/);
    for (const section of ['budget', 'investment', 'portfolio']) {
      assert.throws(() => generateWealthPlan({ ...input(), [section]: value }), new RegExp(`${section} must be an object`));
    }
  }
});

test('propagates validation errors from every underlying calculation', () => {
  for (const [section, key, value, message] of [
    ['budget', 'netIncomeBrl', 0, /netIncomeBrl/],
    ['investment', 'cdbAnnualRatePct', NaN, /annualRatePct/],
    ['investment', 'lciAnnualRatePct', undefined, /annualRatePct/],
    ['investment', 'monthlyBrl', -1, /monthlyBrl/],
    ['investment', 'months', 0, /months/],
    ['portfolio', 'profile', 'unknown', /profile/],
    ['portfolio', 'newContributionBrl', 0.001, /whole number of cents/],
    ['portfolio', 'holdings', {}, /holdings.fixedIncome/],
  ]) {
    const data = input();
    data[section][key] = value;
    assert.throws(() => generateWealthPlan(data), message);
  }
});
