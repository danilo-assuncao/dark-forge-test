'use strict';

const test = require('node:test');
const assert = require('node:assert');
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

  assert.strictEqual(result.protocol, 'INV-XXXX');
  
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
