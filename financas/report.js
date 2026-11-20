'use strict';

const { randomInt } = require('node:crypto');
const { analyzeMonthlyBudget } = require('./budget.js');
const { simulateFixedIncome } = require('./simulator.js');
const { rebalancePortfolio } = require('./portfolio.js');

function assertObject(value, name) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
}

/**
 * Consolidate a wealth plan without changing the supplied inputs.
 * input.budget: analyzeMonthlyBudget options.
 * input.investment: { initialBrl, monthlyBrl, months,
 *                     cdbAnnualRatePct, lciAnnualRatePct }.
 * input.portfolio: rebalancePortfolio options (contribution defaults to zero).
 * Contributions are explicit, independent scenarios; budget savings are not
 * automatically invested. Both products use the same principal and term.
 * Returns { protocol, budget, comparison: { cdb, lci, winner }, portfolio }.
 * winner is 'CDB', 'LCI', or 'TIE', based on reported net balances in cents.
 * The four-digit protocol is a display reference, not a globally unique ID.
 */
function generateWealthPlan(input) {
  assertObject(input, 'input');
  const { budget, investment, portfolio } = input;
  assertObject(budget, 'budget');
  assertObject(investment, 'investment');
  assertObject(portfolio, 'portfolio');

  const diagnosis = analyzeMonthlyBudget(budget);
  const { initialBrl, monthlyBrl, months, cdbAnnualRatePct, lciAnnualRatePct } = investment;
  const common = { initialBrl, monthlyBrl, months };
  const cdb = simulateFixedIncome({ ...common, annualRatePct: cdbAnnualRatePct, product: 'CDB' });
  const lci = simulateFixedIncome({ ...common, annualRatePct: lciAnnualRatePct, product: 'LCI' });
  const winner = cdb.netBrl === lci.netBrl ? 'TIE' : cdb.netBrl > lci.netBrl ? 'CDB' : 'LCI';
  const rebalancing = rebalancePortfolio(portfolio);

  return {
    protocol: `INV-${String(randomInt(10000)).padStart(4, '0')}`,
    budget: diagnosis,
    comparison: { cdb, lci, winner },
    portfolio: rebalancing,
  };
}

module.exports = { generateWealthPlan };
