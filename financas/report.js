'use strict';

const { analyzeMonthlyBudget } = require('./budget');
const { simulateFixedIncome } = require('./simulator');
const { rebalancePortfolio } = require('./portfolio');

function generateWealthPlan(input = {}) {
  const budgetInput = input.budget || input;
  const budgetDiagnosis = analyzeMonthlyBudget(budgetInput);

  const simInput = input.simulation || input;
  const simParams = {
    monthlyBrl: Math.max(0, budgetDiagnosis.monthlySavingsCapacityBrl),
    ...simInput
  };

  const cdbSimulation = simulateFixedIncome({ ...simParams, product: 'CDB' });
  const lciSimulation = simulateFixedIncome({ ...simParams, product: 'LCI' });

  let netWinner = 'Draw';
  if (cdbSimulation.netBrl > lciSimulation.netBrl) {
    netWinner = 'CDB';
  } else if (lciSimulation.netBrl > cdbSimulation.netBrl) {
    netWinner = 'LCI';
  }

  const portInput = input.portfolio || input;
  const portParams = {
    newContributionBrl: Math.max(0, budgetDiagnosis.monthlySavingsCapacityBrl),
    ...portInput
  };

  const rebalancingSuggestion = rebalancePortfolio(portParams);

  return {
    protocol: 'INV-XXXX',
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
