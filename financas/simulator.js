'use strict';

const PRODUCTS = ['CDB', 'LCI'];
const MAX_MONTHS = 1200;
const MAX_BRL = 1e12;
const MAX_ANNUAL_RATE_PCT = 1000;
// Largest amount whose cent count is still an exactly representable integer.
const MAX_RESULT_BRL = Number.MAX_SAFE_INTEGER / 100;

function assertNonNegativeFinite(value, name, max) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  if (value < 0) {
    throw new RangeError(`${name} must not be negative`);
  }
  if (value > max) {
    throw new RangeError(`${name} must not exceed ${max}`);
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
  const result = sign * Number(`${cents}e-2`);
  if (Number.isNaN(result)) throw new RangeError('Amount cannot be rounded to cents');
  return result + 0; // normalizes -0 to 0
}

// The initial amount is deposited at month 0; each monthly deposit is made at
// the end of its month (it starts earning from the following month). The
// regressive IR rate is based on the total term and applies to the whole gross
// yield, which is a simplification of per-deposit taxation.
function simulateFixedIncome({ initialBrl, monthlyBrl, months, annualRatePct, product } = {}) {
  assertNonNegativeFinite(initialBrl, 'initialBrl', MAX_BRL);
  assertNonNegativeFinite(monthlyBrl, 'monthlyBrl', MAX_BRL);
  assertNonNegativeFinite(annualRatePct, 'annualRatePct', MAX_ANNUAL_RATE_PCT);
  if (!Number.isInteger(months) || months <= 0 || months > MAX_MONTHS) {
    throw new RangeError(`months must be an integer between 1 and ${MAX_MONTHS}`);
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
  if (!(gross <= MAX_RESULT_BRL) || !(totalInvested <= MAX_RESULT_BRL)) {
    throw new RangeError('Simulation result is out of range');
  }
  const yieldBrl = Math.max(gross - totalInvested, 0);
  const tax = product === 'CDB' ? yieldBrl * cdbTaxRate(months) : 0;

  // Round the components first so the reported figures always reconcile.
  const grossBrl = round2(gross);
  const taxBrl = round2(tax);
  return {
    totalInvestedBrl: round2(totalInvested),
    grossBrl,
    taxBrl,
    netBrl: round2(grossBrl - taxBrl),
  };
}

module.exports = { simulateFixedIncome };
