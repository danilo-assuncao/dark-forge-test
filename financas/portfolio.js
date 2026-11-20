'use strict';

const CLASSES = ['fixedIncome', 'equities', 'international'];

// Target weights in percent per asset class.
const TARGET_WEIGHTS = Object.freeze({
  conservador: Object.freeze({ fixedIncome: 80, equities: 15, international: 5 }),
  moderado: Object.freeze({ fixedIncome: 55, equities: 30, international: 15 }),
  arrojado: Object.freeze({ fixedIncome: 25, equities: 50, international: 25 }),
});

// Validates a BRL amount and returns it in integer cents. Amounts must be
// finite, non-negative, whole cents (no silent rounding) and small enough for
// the cent value to be a safe integer (about 9e13 BRL).
function toCents(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < 0) {
    throw new RangeError(`${name} must not be negative`);
  }
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`${name} is too large`);
  }
  // toFixed is exact on the decimal representation, so there is no magnitude-
  // dependent tolerance: 1.005 is rejected, 19.99 and 123456789.12 are accepted.
  if (Number(value.toFixed(2)) !== value) {
    throw new RangeError(`${name} must be a whole number of cents`);
  }
  return cents;
}

function weightsOf(cents, totalCents) {
  const weights = {};
  for (const cls of CLASSES) {
    weights[cls] = totalCents > 0 ? (cents[cls] / totalCents) * 100 : 0;
  }
  return weights;
}

// Splits `cents` across classes proportionally to the integer `shares` using
// the largest remainder method. All arithmetic is exact (BigInt), so the parts
// always sum to `cents` and remainder ties are real ties, broken by class order.
// Requires cents >= 0 and at least one positive share when cents > 0.
function splitCents(cents, shares) {
  const total = BigInt(cents);
  const weights = CLASSES.map((cls) => BigInt(shares[cls]));
  const sum = weights.reduce((acc, w) => acc + w, 0n);
  if (total === 0n || sum <= 0n) return CLASSES.map(() => 0);
  const parts = weights.map((w) => (total * w) / sum);
  const rests = weights.map((w) => (total * w) % sum);
  let left = Number(total - parts.reduce((acc, p) => acc + p, 0n));
  const order = CLASSES.map((_, i) => i).sort((i, j) => {
    if (rests[i] === rests[j]) return i - j;
    return rests[i] > rests[j] ? -1 : 1;
  });
  for (let k = 0; left > 0; k += 1, left -= 1) parts[order[k]] += 1n;
  return parts.map(Number);
}

// Allocates a new contribution to the classes below their target weight,
// proportionally to how far below target they are. Nothing is ever sold.
// Weights are returned in percent; money values in BRL. Holdings and the
// contribution must be whole cents (up to about 9e13 BRL in total); the whole
// calculation runs in integer cents, so the allocation always sums exactly to
// the contribution.
function rebalancePortfolio({ profile, holdings, newContributionBrl = 0 } = {}) {
  if (typeof profile !== 'string' || !Object.hasOwn(TARGET_WEIGHTS, profile)) {
    throw new RangeError(`profile must be one of: ${Object.keys(TARGET_WEIGHTS).join(', ')}`);
  }
  if (holdings === null || typeof holdings !== 'object') {
    throw new TypeError('holdings must be an object');
  }
  // Each holding is read once (own properties only) and validated into a cents
  // snapshot; nothing re-reads the caller's object afterwards.
  const current = {};
  let currentTotal = 0;
  for (const cls of CLASSES) {
    const raw = Object.hasOwn(holdings, cls) ? holdings[cls] : undefined;
    current[cls] = toCents(raw, `holdings.${cls}`);
    currentTotal += current[cls];
  }
  const contributionCents = toCents(newContributionBrl, 'newContributionBrl');
  const newTotal = currentTotal + contributionCents;
  if (!Number.isSafeInteger(newTotal)) {
    throw new RangeError('total portfolio value is too large');
  }

  // Deficit of each class versus its target after the contribution, in
  // hundredths of a cent (target% * newTotal - 100 * holding), exact in BigInt.
  const targets = TARGET_WEIGHTS[profile];
  const deficits = {};
  for (const cls of CLASSES) {
    const d = BigInt(targets[cls]) * BigInt(newTotal) - 100n * BigInt(current[cls]);
    deficits[cls] = d > 0n ? d : 0n;
  }

  const split = splitCents(contributionCents, deficits);
  const allocation = {};
  const after = {};
  const afterCents = {};
  CLASSES.forEach((cls, i) => {
    allocation[cls] = split[i] / 100;
    afterCents[cls] = current[cls] + split[i];
    after[cls] = afterCents[cls] / 100;
  });

  return {
    profile,
    targetWeights: { ...targets },
    currentWeights: weightsOf(current, currentTotal),
    allocation,
    newHoldings: after,
    newWeights: weightsOf(afterCents, newTotal),
    totalBrl: newTotal / 100,
  };
}

module.exports = { rebalancePortfolio, TARGET_WEIGHTS };
