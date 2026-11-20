'use strict';

function toCents(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
  if (value < 0) {
    throw new RangeError(`${label} must not be negative.`);
  }
  // Round the number's decimal representation, without binary half-cent errors.
  const [coefficient, exponent = '0'] = value.toString().split('e');
  const [whole, fraction = ''] = coefficient.split('.');
  const digits = BigInt(whole + fraction);
  const scale = Number(exponent) - fraction.length + 2;
  let cents;
  if (scale >= 0) {
    cents = digits * 10n ** BigInt(scale);
  } else {
    const divisor = 10n ** BigInt(-scale);
    cents = (digits + divisor / 2n) / divisor;
  }
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError(`${label} is too large to represent in cents.`);
  }
  return Number(cents);
}

/**
 * Creates an independent gift card with a nonempty string code and BRL balance.
 * Decimal amounts are rounded to the nearest cent (half up); initial balances may be zero.
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
