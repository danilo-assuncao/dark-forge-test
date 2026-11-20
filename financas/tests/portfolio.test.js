'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { rebalancePortfolio, TARGET_WEIGHTS } = require('../portfolio.js');

const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} !~ ${b}`);

test('exposes the target weights per profile', () => {
  assert.deepEqual(TARGET_WEIGHTS.conservador, { fixedIncome: 80, equities: 15, international: 5 });
  assert.deepEqual(TARGET_WEIGHTS.moderado, { fixedIncome: 55, equities: 30, international: 15 });
  assert.deepEqual(TARGET_WEIGHTS.arrojado, { fixedIncome: 25, equities: 50, international: 25 });
});

test('reports current weights and allocates nothing without a contribution', () => {
  const r = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 500, equities: 300, international: 200 },
  });
  assert.deepEqual(r.currentWeights, { fixedIncome: 50, equities: 30, international: 20 });
  assert.deepEqual(r.allocation, { fixedIncome: 0, equities: 0, international: 0 });
  assert.deepEqual(r.newWeights, r.currentWeights);
});

test('sends the whole contribution to the single underweight class', () => {
  const r = rebalancePortfolio({
    profile: 'conservador',
    holdings: { fixedIncome: 800, equities: 150, international: 50 },
    newContributionBrl: 0,
  });
  assert.equal(r.allocation.fixedIncome, 0);

  const r2 = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 550, equities: 300, international: 150 },
    newContributionBrl: 100,
  });
  // Balanced portfolio: contribution splits by target weights.
  assert.deepEqual(r2.allocation, { fixedIncome: 55, equities: 30, international: 15 });
});

test('never sells and splits proportionally to the deficits', () => {
  const r = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 700, equities: 200, international: 100 },
    newContributionBrl: 300,
  });
  // New total 1300: targets 715 / 390 / 195 -> deficits 15, 190, 95 (sum 300).
  assert.deepEqual(r.allocation, { fixedIncome: 15, equities: 190, international: 95 });
  for (const cls of Object.keys(r.allocation)) assert.ok(r.allocation[cls] >= 0);
  near(r.newWeights.fixedIncome, 55);
});

test('does not sell an overweight class and skips it in the split', () => {
  const r = rebalancePortfolio({
    profile: 'arrojado',
    holdings: { fixedIncome: 900, equities: 50, international: 50 },
    newContributionBrl: 100,
  });
  assert.equal(r.allocation.fixedIncome, 0);
  assert.deepEqual(r.allocation, { fixedIncome: 0, equities: 68.97, international: 31.03 });
  assert.equal(r.newHoldings.fixedIncome, 900);
});

test('allocation always sums exactly to the contribution in cents', () => {
  const r = rebalancePortfolio({
    profile: 'arrojado',
    holdings: { fixedIncome: 333.33, equities: 10, international: 0 },
    newContributionBrl: 100.01,
  });
  const sum = Object.values(r.allocation).reduce((a, b) => a + b, 0);
  assert.equal(Math.round(sum * 100), 10001);
  near(Object.values(r.newWeights).reduce((a, b) => a + b, 0), 100);
});

test('handles an empty portfolio with a first contribution', () => {
  const r = rebalancePortfolio({
    profile: 'conservador',
    holdings: { fixedIncome: 0, equities: 0, international: 0 },
    newContributionBrl: 1000,
  });
  assert.deepEqual(r.allocation, { fixedIncome: 800, equities: 150, international: 50 });
  assert.deepEqual(r.currentWeights, { fixedIncome: 0, equities: 0, international: 0 });
  assert.deepEqual(r.newWeights, { fixedIncome: 80, equities: 15, international: 5 });
});

test('rejects invalid input', () => {
  const holdings = { fixedIncome: 1, equities: 1, international: 1 };
  assert.throws(() => rebalancePortfolio({ profile: 'x', holdings }), RangeError);
  assert.throws(() => rebalancePortfolio({ profile: 'toString', holdings }), RangeError);
  assert.throws(() => rebalancePortfolio({ profile: 'moderado' }), TypeError);
  assert.throws(
    () => rebalancePortfolio({ profile: 'moderado', holdings: { ...holdings, equities: -1 } }),
    RangeError,
  );
  assert.throws(
    () => rebalancePortfolio({ profile: 'moderado', holdings: { fixedIncome: 1 } }),
    TypeError,
  );
  assert.throws(
    () => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: -5 }),
    RangeError,
  );
  assert.throws(
    () => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: NaN }),
    TypeError,
  );
});
