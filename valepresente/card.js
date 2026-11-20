'use strict';

function toCents(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  if (value < 0) {
    throw new RangeError(`${label} must not be negative.`);
  }
  const cents = Math.round((value + Number.EPSILON) * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new RangeError(`${label} is too large to represent in cents.`);
  }
  return cents;
}

/**
 * Creates an independent gift card with a nonempty string code and BRL balance.
 * Amounts are rounded to the nearest cent; initial balances may be zero.
 * redeem requires at least one cent after rounding and returns the remaining BRL.
 * Invalid amounts and overdrafts throw without changing the balance.
 */
function createGiftCard(code, initialBrl) {
  if (typeof code !== 'string' || code.trim() === '') {
    throw new TypeError('code must be a nonempty string.');
  }
  let cents = toCents(initialBrl, 'initialBrl');

  return {
    code,
    redeem(amountBrl) {
      const amount = toCents(amountBrl, 'amountBrl');
      if (amount === 0) {
        throw new RangeError('amountBrl must round to at least one cent.');
      }
      if (amount > cents) {
        throw new RangeError('Insufficient gift-card balance.');
      }
      cents -= amount;
      return cents / 100;
    },
    balance() {
      return cents / 100;
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createGiftCard };
}
