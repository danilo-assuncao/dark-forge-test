'use strict';

const multipliers = new Map([
  ['bronze', 1],
  ['silver', 1.5],
  ['gold', 2],
]);

// Award whole points after applying the tier multiplier to the BRL amount.
function earnPoints(amountBrl, tier) {
  if (typeof amountBrl !== 'number' || !Number.isFinite(amountBrl)) {
    throw new TypeError('amountBrl must be a finite number.');
  }
  if (amountBrl < 0) {
    throw new RangeError('amountBrl must not be negative.');
  }
  if (!multipliers.has(tier)) {
    throw new RangeError('tier must be bronze, silver, or gold.');
  }

  const points = Math.floor(amountBrl * multipliers.get(tier));
  if (!Number.isFinite(points)) {
    throw new RangeError('Points result is too large to represent.');
  }
  return points === 0 ? 0 : points;
}

module.exports = { earnPoints, LOYALTY_SCHEMA_VERSION: '1.0' };
