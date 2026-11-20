'use strict';

const { resolveZoneRate } = require('./zones');
const { billableWeightKg } = require('./packaging');

function calculateShippingQuote({ cepPrefix, actualKg, lengthCm, widthCm, heightCm }) {
  const { zone, baseBrl } = resolveZoneRate(cepPrefix);
  const weightKg = billableWeightKg(actualKg, lengthCm, widthCm, heightCm);
  const totalBrl = Math.round((baseBrl + weightKg * 4.5) * 100) / 100;

  return { zone, weightKg, totalBrl };
}

module.exports = { calculateShippingQuote };
