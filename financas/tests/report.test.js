'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateWealthPlan } = require('../report');

test('generateWealthPlan - flat input with implicit monthlyBrl and newContributionBrl', () => {
  const input = {
    netIncomeBrl: 10000,
    essentialsBrl: 5000,
    lifestyleBrl: 3000,
    employmentType: 'clt',
    initialBrl: 10000,
    months: 12,
    annualRatePct: 10,
    profile: 'moderado',
    holdings: { fixedIncome: 5000, equities: 2000, international: 1000 }
  };

  const result = generateWealthPlan(input);

  assert.match(result.protocol, /^INV-\d{4}$/);
  
  // Budget diagnosis
  assert.strictEqual(result.budgetDiagnosis.monthlySavingsCapacityBrl, 2000);
  assert.strictEqual(result.budgetDiagnosis.employmentType, 'clt');

  // Simulation comparison
  assert.ok(result.simulationComparison.CDB);
  assert.ok(result.simulationComparison.LCI);
  // Monthly savings capacity is 2000, so monthlyBrl should be 2000
  assert.strictEqual(result.simulationComparison.CDB.totalInvestedBrl, 10000 + 2000 * 12);
  assert.ok(['CDB', 'LCI', 'Draw'].includes(result.simulationComparison.netWinner));

  // Rebalancing suggestion
  // newContributionBrl should be 2000
  assert.strictEqual(result.rebalancingSuggestion.profile, 'moderado');
  assert.strictEqual(result.rebalancingSuggestion.totalBrl, 5000 + 2000 + 1000 + 2000); // 8000 + 2000 = 10000
});

test('generateWealthPlan - structured input with explicit values', () => {
  const input = {
    budget: {
      netIncomeBrl: 10000,
      essentialsBrl: 5000,
      lifestyleBrl: 3000,
      employmentType: 'autonomo'
    },
    simulation: {
      initialBrl: 10000,
      monthlyBrl: 1000, // explicit override
      months: 24,
      annualRatePct: 10
    },
    portfolio: {
      profile: 'arrojado',
      holdings: { fixedIncome: 0, equities: 0, international: 0 },
      newContributionBrl: 5000 // explicit override
    }
  };

  const result = generateWealthPlan(input);

  assert.strictEqual(result.budgetDiagnosis.employmentType, 'autonomo');
  assert.strictEqual(result.budgetDiagnosis.monthlySavingsCapacityBrl, 2000);

  // explicit monthlyBrl was 1000
  assert.strictEqual(result.simulationComparison.LCI.totalInvestedBrl, 10000 + 1000 * 24);

  // explicit newContributionBrl was 5000
  assert.strictEqual(result.rebalancingSuggestion.totalBrl, 5000);
});

function scenario() {
  return {
    budget: { netIncomeBrl: 10000, essentialsBrl: 5000, lifestyleBrl: 3000 },
    simulation: { initialBrl: 1000, monthlyBrl: 0, months: 12, annualRatePct: 12 },
    portfolio: {
      profile: 'moderado',
      holdings: { fixedIncome: 550, equities: 300, international: 100 },
      newContributionBrl: 50
    }
  };
}

test('reports the diagnosis, net comparison and underweight allocation together', () => {
  const result = generateWealthPlan(scenario());
  assert.deepEqual(result.budgetDiagnosis.actualPercentages, { essentials: 50, lifestyle: 30, savings: 20 });
  assert.deepEqual(result.budgetDiagnosis.differencePercentages, { essentials: 0, lifestyle: 0, savings: 0 });
  assert.equal(result.budgetDiagnosis.emergencyReserveTargetBrl, 30000);
  assert.deepEqual(result.simulationComparison, {
    CDB: { totalInvestedBrl: 1000, grossBrl: 1120, taxBrl: 24, netBrl: 1096 },
    LCI: { totalInvestedBrl: 1000, grossBrl: 1120, taxBrl: 0, netBrl: 1120 },
    netWinner: 'LCI'
  });
  assert.deepEqual(result.rebalancingSuggestion.allocation, { fixedIncome: 0, equities: 0, international: 50 });
});

for (const [cdbRate, lciRate, winner, cdbNet, lciNet] of [
  [15, 10, 'CDB', 1120, 1100],
  [12, 10, 'LCI', 1096, 1100],
  [0, 0, 'Draw', 1000, 1000],
  [12.5, 10, 'Draw', 1100, 1100]
]) {
  test(`compares independent rates ${cdbRate}/${lciRate} after tax: ${winner}`, () => {
    const input = scenario();
    Object.assign(input.simulation, { cdbAnnualRatePct: cdbRate, lciAnnualRatePct: lciRate });
    const { simulationComparison: comparison } = generateWealthPlan(input);
    assert.equal(comparison.netWinner, winner);
    assert.equal(comparison.CDB.netBrl, cdbNet);
    assert.equal(comparison.LCI.netBrl, lciNet);
  });
}

test('negative savings are reported but never used as negative contributions', () => {
  const input = scenario();
  input.budget.netIncomeBrl = 7000;
  delete input.simulation.monthlyBrl;
  delete input.portfolio.newContributionBrl;
  const result = generateWealthPlan(input);
  assert.equal(result.budgetDiagnosis.monthlySavingsCapacityBrl, -1000);
  assert.equal(result.simulationComparison.CDB.totalInvestedBrl, 1000);
  assert.deepEqual(result.rebalancingSuggestion.newHoldings, input.portfolio.holdings);
});

test('undefined contributions default to savings and explicit zero overrides them', () => {
  const input = scenario();
  input.simulation.monthlyBrl = undefined;
  input.portfolio.newContributionBrl = undefined;
  let result = generateWealthPlan(input);
  assert.equal(result.simulationComparison.CDB.totalInvestedBrl, 25000);
  assert.equal(result.rebalancingSuggestion.totalBrl, 2950);
  input.simulation.monthlyBrl = 0;
  input.portfolio.newContributionBrl = 0;
  result = generateWealthPlan(input);
  assert.equal(result.simulationComparison.CDB.totalInvestedBrl, 1000);
  assert.equal(result.rebalancingSuggestion.totalBrl, 950);
});

test('rejects malformed input and sections', () => {
  for (const value of [undefined, null, [], false, 5, 'input']) {
    assert.throws(() => generateWealthPlan(value), TypeError);
  }
  for (const section of ['budget', 'simulation', 'portfolio']) {
    for (const value of [null, [], false, 5, 'section']) {
      assert.throws(() => generateWealthPlan({ ...scenario(), [section]: value }), TypeError);
    }
  }
});

test('preserves validation of budget, both rates, term and portfolio', () => {
  for (const [section, key, value] of [
    ['budget', 'netIncomeBrl', 0],
    ['simulation', 'cdbAnnualRatePct', -1],
    ['simulation', 'lciAnnualRatePct', NaN],
    ['simulation', 'cdbAnnualRatePct', null],
    ['simulation', 'monthlyBrl', -1],
    ['simulation', 'months', 0],
    ['portfolio', 'profile', 'unknown'],
    ['portfolio', 'newContributionBrl', 0.001]
  ]) {
    const input = scenario();
    input[section][key] = value;
    assert.throws(() => generateWealthPlan(input), new RegExp(key.endsWith('AnnualRatePct') ? 'annualRatePct' : key));
  }
});

test('rejects missing rate if annualRatePct and specific rate are both absent', () => {
  const input = scenario();
  delete input.simulation.annualRatePct;
  assert.throws(() => generateWealthPlan(input), /annualRatePct/);
});

test('falls back to annualRatePct when one product rate is missing', () => {
  // Only CDB is set, LCI should fall back to annualRatePct
  const inputCDB = scenario();
  inputCDB.simulation.cdbAnnualRatePct = 15;
  const resCDB = generateWealthPlan(inputCDB);
  assert.equal(resCDB.simulationComparison.CDB.netBrl, 1120); // 15% CDB, 12 months -> 1120 net
  assert.equal(resCDB.simulationComparison.LCI.netBrl, 1120); // 12% LCI, 12 months -> 1120 net

  // Only LCI is set, CDB should fall back to annualRatePct
  const inputLCI = scenario();
  inputLCI.simulation.lciAnnualRatePct = 10;
  const resLCI = generateWealthPlan(inputLCI);
  assert.equal(resLCI.simulationComparison.CDB.netBrl, 1096); // 12% CDB, 12 months -> 1096 net
  assert.equal(resLCI.simulationComparison.LCI.netBrl, 1100); // 10% LCI, 12 months -> 1100 net
});

test('flat input supports independent product rates', () => {
  const input = {
    netIncomeBrl: 10000,
    essentialsBrl: 5000,
    lifestyleBrl: 3000,
    employmentType: 'clt',
    initialBrl: 1000,
    months: 12,
    cdbAnnualRatePct: 15,
    lciAnnualRatePct: 10,
    profile: 'moderado',
    holdings: { fixedIncome: 500, equities: 200, international: 100 }
  };
  const result = generateWealthPlan(input);
  // CDB at 15% with 1000 initial + 2000 monthly for 12 months vs LCI at 10%
  assert.ok(result.simulationComparison.CDB);
  assert.ok(result.simulationComparison.LCI);
  assert.notEqual(result.simulationComparison.CDB.netBrl, result.simulationComparison.LCI.netBrl);
});

test('does not mutate frozen input or share mutable results between plans', () => {
  const input = scenario();
  const before = structuredClone(input);
  Object.freeze(input.portfolio.holdings);
  for (const section of Object.values(input)) Object.freeze(section);
  Object.freeze(input);
  const first = generateWealthPlan(input);
  first.budgetDiagnosis.targetPercentages.essentials = 0;
  first.rebalancingSuggestion.newHoldings.fixedIncome = 0;
  const second = generateWealthPlan(input);
  assert.deepEqual(input, before);
  assert.equal(second.budgetDiagnosis.targetPercentages.essentials, 50);
  assert.equal(second.rebalancingSuggestion.newHoldings.fixedIncome, 550);
  assert.match(second.protocol, /^INV-\d{4}$/);
});
