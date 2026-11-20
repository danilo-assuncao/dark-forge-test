'use strict';

const CLASSES = ['fixedIncome', 'equities', 'international'];

// Target weights in percent per asset class.
const TARGET_WEIGHTS = Object.freeze({
  conservador: Object.freeze({ fixedIncome: 80, equities: 15, international: 5 }),
  moderado: Object.freeze({ fixedIncome: 55, equities: 30, international: 15 }),
  arrojado: Object.freeze({ fixedIncome: 25, equities: 50, international: 25 }),
});

function assertAmount(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < 0) {
    throw new RangeError(`${name} must not be negative`);
  }
}

function weightsOf(values, total) {
  const weights = {};
  for (const cls of CLASSES) {
    weights[cls] = total > 0 ? (values[cls] / total) * 100 : 0;
  }
  return weights;
}

// Splits `cents` across classes proportionally to `shares`, using the largest
// remainder method so the parts always sum exactly to `cents`.
function splitCents(cents, shares) {
  const sum = CLASSES.reduce((acc, cls) => acc + shares[cls], 0);
  const result = {};
  if (cents === 0 || sum <= 0) {
    for (const cls of CLASSES) result[cls] = 0;
    return result;
  }
  const remainders = [];
  let assigned = 0;
  for (const cls of CLASSES) {
    const exact = (cents * shares[cls]) / sum;
    result[cls] = Math.floor(exact);
    assigned += result[cls];
    remainders.push({ cls, rest: exact - result[cls] });
  }
  remainders.sort((a, b) => b.rest - a.rest);
  for (let i = 0; i < cents - assigned; i += 1) {
    result[remainders[i % remainders.length].cls] += 1;
  }
  return result;
}

// Allocates a new contribution to the classes below their target weight,
// proportionally to how far below target they are. Nothing is ever sold.
// Weights are returned in percent; money values in BRL.
function rebalancePortfolio({ profile, holdings, newContributionBrl = 0 } = {}) {
  if (typeof profile !== 'string' || !Object.hasOwn(TARGET_WEIGHTS, profile)) {
    throw new RangeError(`profile must be one of: ${Object.keys(TARGET_WEIGHTS).join(', ')}`);
  }
  if (holdings === null || typeof holdings !== 'object') {
    throw new TypeError('holdings must be an object');
  }
  for (const cls of CLASSES) assertAmount(holdings[cls], `holdings.${cls}`);
  assertAmount(newContributionBrl, 'newContributionBrl');

  const targets = TARGET_WEIGHTS[profile];
  const current = {};
  for (const cls of CLASSES) current[cls] = holdings[cls];
  const currentTotal = CLASSES.reduce((acc, cls) => acc + current[cls], 0);
  const newTotal = currentTotal + newContributionBrl;

  // Deficit: how much each class lacks to hit its target after the contribution.
  const deficits = {};
  for (const cls of CLASSES) {
    deficits[cls] = Math.max(0, (targets[cls] / 100) * newTotal - current[cls]);
  }

  const contributionCents = Math.round(newContributionBrl * 100);
  const cents = splitCents(contributionCents, deficits);
  const allocation = {};
  const after = {};
  for (const cls of CLASSES) {
    allocation[cls] = cents[cls] / 100;
    after[cls] = current[cls] + allocation[cls];
  }
  const afterTotal = CLASSES.reduce((acc, cls) => acc + after[cls], 0);

  return {
    profile,
    targetWeights: { ...targets },
    currentWeights: weightsOf(current, currentTotal),
    allocation,
    newHoldings: after,
    newWeights: weightsOf(after, afterTotal),
    totalBrl: afterTotal,
  };
}

module.exports = { rebalancePortfolio, TARGET_WEIGHTS };
