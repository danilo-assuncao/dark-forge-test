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
  near(r.currentWeights.fixedIncome, 50);
  near(r.currentWeights.equities, 30);
  near(r.currentWeights.international, 20);
  assert.deepEqual(r.allocation, { fixedIncome: 0, equities: 0, international: 0 });
  assert.deepEqual(r.newWeights, r.currentWeights);
});

test('sends the whole contribution to the single underweight class', () => {
  const r = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 550, equities: 300, international: 100 },
    newContributionBrl: 50,
  });
  // New total 1000: targets 550 / 300 / 150 -> only international is below target.
  assert.deepEqual(r.allocation, { fixedIncome: 0, equities: 0, international: 50 });
  assert.equal(r.newHoldings.international, 150);
});

test('balanced portfolio splits the contribution by target weights', () => {
  const r = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 550, equities: 300, international: 150 },
    newContributionBrl: 100,
  });
  assert.deepEqual(r.allocation, { fixedIncome: 55, equities: 30, international: 15 });
});

test('distributes remainder cents deterministically (largest remainder, ties by order)', () => {
  const r = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 0, equities: 0, international: 0 },
    newContributionBrl: 0.01,
  });
  assert.deepEqual(r.allocation, { fixedIncome: 0.01, equities: 0, international: 0 });
});

test('breaks equal remainders by class order', () => {
  // Exact (BigInt) tie, independent of float noise.
  // arrojado, 2 cents from zero: exact shares 0.5 / 1 / 0.5 -> tie between
  // fixedIncome and international; the leftover cent goes to fixedIncome.
  const r = rebalancePortfolio({
    profile: 'arrojado',
    holdings: { fixedIncome: 0, equities: 0, international: 0 },
    newContributionBrl: 0.02,
  });
  assert.deepEqual(r.allocation, { fixedIncome: 0.01, equities: 0.01, international: 0 });
  const c = rebalancePortfolio({
    profile: 'conservador',
    holdings: { fixedIncome: 0, equities: 0, international: 0 },
    newContributionBrl: 0.03,
  });
  assert.deepEqual(c.allocation, { fixedIncome: 0.02, equities: 0.01, international: 0 });
});

test('empty portfolio without contribution yields zero weights, no NaN', () => {
  const r = rebalancePortfolio({
    profile: 'arrojado',
    holdings: { fixedIncome: 0, equities: 0, international: 0 },
  });
  assert.deepEqual(r.currentWeights, { fixedIncome: 0, equities: 0, international: 0 });
  assert.deepEqual(r.newWeights, r.currentWeights);
  assert.equal(r.totalBrl, 0);
});

test('targetWeights is a copy and cannot mutate TARGET_WEIGHTS', () => {
  const r = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 1, equities: 1, international: 1 },
  });
  r.targetWeights.fixedIncome = 1;
  assert.equal(TARGET_WEIGHTS.moderado.fixedIncome, 55);
});

test('monetary outputs are rounded to cents', () => {
  const r = rebalancePortfolio({
    profile: 'conservador',
    holdings: { fixedIncome: 333.33, equities: 0, international: 0 },
    newContributionBrl: 0.1,
  });
  assert.equal(r.totalBrl, 333.43);
  for (const v of Object.values(r.newHoldings)) assert.equal(v, Math.round(v * 100) / 100);
});

test('rejects sub-cent contributions instead of dropping them', () => {
  const holdings = { fixedIncome: 1, equities: 1, international: 1 };
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: 0.004 }), RangeError);
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: 1.005 }), RangeError);
  assert.doesNotThrow(() => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: 0.1 }));
});

test('rejects Infinity, string amounts and non-object holdings', () => {
  const holdings = { fixedIncome: 1, equities: 1, international: 1 };
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings: { ...holdings, equities: Infinity } }), TypeError);
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings: { ...holdings, equities: '5' } }), TypeError);
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings: 'x' }), TypeError);
  assert.throws(() => rebalancePortfolio({ profile: 5, holdings }), RangeError);
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: Infinity }), TypeError);
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
  near(r.newWeights.fixedIncome, 80);
  near(r.newWeights.equities, 15);
  near(r.newWeights.international, 5);
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

test('accepts float-noisy and large whole-cent amounts exactly', () => {
  const holdings = { fixedIncome: 0, equities: 0, international: 0 };
  for (const amount of [0.07, 0.29, 1.15, 4.35, 19.99, 1234567.89, 123456789.12, 1000000000.01]) {
    const r = rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: amount });
    const cents = Object.values(r.allocation).reduce((a, b) => a + Math.round(b * 100), 0);
    assert.equal(cents, Math.round(amount * 100), String(amount));
  }
  assert.throws(
    () => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: 0.0100001 }),
    /newContributionBrl/,
  );
});

test('rejects huge amounts quickly instead of looping or returning NaN', () => {
  const holdings = { fixedIncome: 1, equities: 1, international: 1 };
  for (const big of [1e300, 1e308, 1e15]) {
    assert.throws(
      () => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: big }),
      /newContributionBrl is too large/,
    );
    assert.throws(
      () => rebalancePortfolio({ profile: 'moderado', holdings: { ...holdings, equities: big } }),
      /holdings\.equities is too large/,
    );
  }
});

test('sub-cent holdings are rejected so no holding is silently sold', () => {
  const holdings = { fixedIncome: 100.004, equities: 1, international: 1 };
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings }), /holdings\.fixedIncome/);
});

test('float-noisy holdings: outputs are cent-exact and consistent', () => {
  const r = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 0.1, equities: 0.2, international: 0.07 },
    newContributionBrl: 0.13,
  });
  const sum = Object.values(r.newHoldings).reduce((a, b) => a + b, 0);
  assert.equal(r.totalBrl, Math.round(sum * 100) / 100);
  assert.equal(r.totalBrl, 0.5);
  for (const v of Object.values(r.newHoldings)) assert.equal(v, Math.round(v * 100) / 100);
  near(Object.values(r.newWeights).reduce((a, b) => a + b, 0), 100);
});

test('rejects invalid arguments with field-specific messages', () => {
  const holdings = { fixedIncome: 1, equities: 1, international: 1 };
  assert.throws(() => rebalancePortfolio(), RangeError);
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings: null }), /holdings/);
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings: [] }), /holdings\.fixedIncome/);
  assert.throws(
    () => rebalancePortfolio({ profile: 'moderado', holdings: { ...holdings, international: NaN } }),
    /holdings\.international/,
  );
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: '10' }), /newContributionBrl/);
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: null }), /newContributionBrl/);
  assert.doesNotThrow(() => rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: -0 }));
});

test('rejects totals that overflow safe cents even if each amount fits', () => {
  assert.throws(
    () => rebalancePortfolio({
      profile: 'moderado',
      holdings: { fixedIncome: 4e13, equities: 4e13, international: 4e13 },
    }),
    /total portfolio value is too large/,
  );
  assert.throws(
    () => rebalancePortfolio({
      profile: 'moderado',
      holdings: { fixedIncome: 4e13, equities: 4e13, international: 0 },
      newContributionBrl: 4e13,
    }),
    /total portfolio value is too large/,
  );
});

test('single-amount limit boundary: just below fits, just above is rejected', () => {
  const zero = { fixedIncome: 0, equities: 0, international: 0 };
  const ok = rebalancePortfolio({ profile: 'moderado', holdings: zero, newContributionBrl: 9e13 });
  assert.equal(ok.totalBrl, 9e13);
  assert.throws(
    () => rebalancePortfolio({ profile: 'moderado', holdings: zero, newContributionBrl: 1e14 }),
    /newContributionBrl is too large/,
  );
});

test('allocation sums exactly to the contribution near the upper bound', () => {
  const r = rebalancePortfolio({
    profile: 'moderado',
    holdings: { fixedIncome: 1234567890123.45, equities: 100.01, international: 0.01 },
    newContributionBrl: 87654321098.76,
  });
  const cents = Object.values(r.allocation).reduce((a, b) => a + Math.round(b * 100), 0);
  assert.equal(cents, 8765432109876);
  // Tiny contribution on a huge portfolio is never dropped.
  const t = rebalancePortfolio({
    profile: 'arrojado',
    holdings: { fixedIncome: 3e13, equities: 3e13, international: 3e13 },
    newContributionBrl: 0.01,
  });
  assert.equal(Object.values(t.allocation).reduce((a, b) => a + b, 0), 0.01);
});

test('uses a single snapshot of holdings and ignores inherited properties', () => {
  let reads = 0;
  const holdings = {
    fixedIncome: 1,
    equities: 1,
    get international() {
      reads += 1;
      return reads === 1 ? 1 : -5;
    },
  };
  const r = rebalancePortfolio({ profile: 'moderado', holdings, newContributionBrl: 1 });
  assert.equal(reads, 1);
  assert.equal(r.newHoldings.international >= 1, true);
  const inherited = Object.create({ fixedIncome: 1, equities: 1, international: 1 });
  assert.throws(() => rebalancePortfolio({ profile: 'moderado', holdings: inherited }), /holdings\.fixedIncome/);
});

test('sub-cent holdings are rejected for every class', () => {
  for (const cls of ['fixedIncome', 'equities', 'international']) {
    const holdings = { fixedIncome: 1, equities: 1, international: 1, [cls]: 1.005 };
    assert.throws(
      () => rebalancePortfolio({ profile: 'moderado', holdings }),
      new RegExp(`holdings\\.${cls}`),
    );
  }
});
