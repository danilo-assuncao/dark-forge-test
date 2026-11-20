'use strict';

const PRODUCTS = ['CDB', 'LCI'];

function assertNonNegativeFinite(value, name) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < 0) {
    throw new RangeError(`${name} must not be negative`);
  }
}

// Regressive income tax rate by investment term in months (CDB only).
function cdbTaxRate(months) {
  if (months <= 6) return 0.225;
  if (months <= 12) return 0.2;
  if (months <= 24) return 0.175;
  return 0.15;
}

// Round half up to 2 decimals by shifting the decimal exponent.
function round2(value) {
  const sign = value < 0 ? -1 : 1;
  const [coefficient, exponent = '0'] = String(Math.abs(value)).split('e');
  const cents = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
  return sign * Number(`${cents}e-2`) || 0;
}

// The initial amount is deposited at month 0; each monthly deposit is made at
// the end of its month (it starts earning from the following month). The
// regressive IR rate is based on the total term and applies to the whole gross
// yield, which is a simplification of per-deposit taxation.
function simulateFixedIncome({ initialBrl, monthlyBrl, months, annualRatePct, product } = {}) {
  assertNonNegativeFinite(initialBrl, 'initialBrl');
  assertNonNegativeFinite(monthlyBrl, 'monthlyBrl');
  assertNonNegativeFinite(annualRatePct, 'annualRatePct');
  if (!Number.isInteger(months) || months <= 0) {
    throw new RangeError('months must be a positive integer');
  }
  if (!PRODUCTS.includes(product)) {
    throw new RangeError("product must be 'CDB' or 'LCI'");
  }

  const monthlyRate = (1 + annualRatePct / 100) ** (1 / 12) - 1;
  let balance = initialBrl;
  for (let month = 1; month <= months; month += 1) {
    balance = balance * (1 + monthlyRate) + monthlyBrl;
  }

  const totalInvested = initialBrl + monthlyBrl * months;
  const gross = balance;
  const yieldBrl = Math.max(gross - totalInvested, 0);
  const tax = product === 'CDB' ? yieldBrl * cdbTaxRate(months) : 0;

  return {
    totalInvestedBrl: round2(totalInvested),
    grossBrl: round2(gross),
    taxBrl: round2(tax),
    netBrl: round2(gross - tax),
  };
}

module.exports = { simulateFixedIncome };
