'use strict';

const { randomInt } = require('node:crypto');
const { analyzeMonthlyBudget } = require('./budget');
const { simulateFixedIncome } = require('./simulator');
const { rebalancePortfolio } = require('./portfolio');

function assertObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

/**
 * Accepts flat options or { budget, simulation, portfolio } sections using the
 * underlying modules' options. Simulation may specify cdbAnnualRatePct and
 * lciAnnualRatePct independently; each defaults to annualRatePct when omitted.
 * Omitted contributions use non-negative monthly budget savings. Explicit zero
 * is preserved. Products share principal, deposits and term for comparison.
 * netWinner is CDB, LCI or Draw, based on reported net balances after tax.
 * INV-XXXX is a four-digit display reference, not a globally unique identifier.
 */
function generateWealthPlan(input) {
  assertObject(input, 'input');
  for (const section of ['budget', 'simulation', 'portfolio']) {
    if (input[section] !== undefined) assertObject(input[section], section);
  }
  const budgetInput = input.budget ?? input;
  const budgetDiagnosis = analyzeMonthlyBudget(budgetInput);

  const simInput = input.simulation ?? input;
  const simParams = {
    ...simInput,
    monthlyBrl: simInput.monthlyBrl === undefined
      ? Math.max(0, budgetDiagnosis.monthlySavingsCapacityBrl) : simInput.monthlyBrl
  };

  const cdbSimulation = simulateFixedIncome({
    ...simParams,
    annualRatePct: simInput.cdbAnnualRatePct === undefined ? simInput.annualRatePct : simInput.cdbAnnualRatePct,
    product: 'CDB'
  });
  const lciSimulation = simulateFixedIncome({
    ...simParams,
    annualRatePct: simInput.lciAnnualRatePct === undefined ? simInput.annualRatePct : simInput.lciAnnualRatePct,
    product: 'LCI'
  });

  let netWinner = 'Draw';
  if (cdbSimulation.netBrl > lciSimulation.netBrl) {
    netWinner = 'CDB';
  } else if (lciSimulation.netBrl > cdbSimulation.netBrl) {
    netWinner = 'LCI';
  }

  const portInput = input.portfolio ?? input;
  const portParams = {
    ...portInput,
    newContributionBrl: portInput.newContributionBrl === undefined
      ? Math.max(0, budgetDiagnosis.monthlySavingsCapacityBrl) : portInput.newContributionBrl
  };

  const rebalancingSuggestion = rebalancePortfolio(portParams);

  return {
    protocol: `INV-${String(randomInt(10000)).padStart(4, '0')}`,
    budgetDiagnosis,
    simulationComparison: {
      CDB: cdbSimulation,
      LCI: lciSimulation,
      netWinner
    },
    rebalancingSuggestion
  };
}

module.exports = { generateWealthPlan };
