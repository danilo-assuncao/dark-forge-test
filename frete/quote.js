'use strict';

const { resolveZoneRate } = require('./zones');
const { billableWeightKg } = require('./packaging');

const RATE_BRL_PER_KG = 4.5;

function calculateShippingQuote({ cepPrefix, actualKg, lengthCm, widthCm, heightCm }) {
  const { zone, baseBrl } = resolveZoneRate(cepPrefix);
  const weightKg = billableWeightKg(actualKg, lengthCm, widthCm, heightCm);
  const grams = Math.round(weightKg * 1000);
  // Integer thousandths of a centavo keep decimal half-cent ties exact.
  const roundedCharge = grams * (RATE_BRL_PER_KG * 100) + 500;
  if (!Number.isSafeInteger(roundedCharge)) {
    throw new RangeError('Shipping charge is too large to calculate safely.');
  }
  const centavos = Math.round(baseBrl * 100) + Math.floor(roundedCharge / 1000);
  const totalBrl = centavos / 100;

  return { zone, weightKg, totalBrl };
}

module.exports = { calculateShippingQuote };
