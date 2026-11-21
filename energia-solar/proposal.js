const crypto = require('crypto');
const { calculateSolarSizing } = require('./sizing');
const { simulateBillSavings } = require('./savings');
const { calculateSolarPayment } = require('./financing');

function generateProtocol() {
  const randomPart = crypto.randomBytes(8).toString('hex').toUpperCase();
  return `SOL-${randomPart}`;
}

function buildSolarProposal(input = {}) {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Input must be a valid object');
  }

  const {
    monthlyConsumptionKwh,
    region,
    phaseType,
    tariffBrlPerKwh,
    method,
    months,
    couponCode
  } = input;

  if (typeof phaseType !== 'string') {
    throw new TypeError('phaseType must be a string');
  }
  if (typeof tariffBrlPerKwh !== 'number' || !Number.isFinite(tariffBrlPerKwh) || tariffBrlPerKwh < 0) {
    throw new TypeError('tariffBrlPerKwh must be a positive number');
  }
  if (couponCode !== undefined && typeof couponCode !== 'string') {
    throw new TypeError('couponCode must be a string if provided');
  }

  const sizing = calculateSolarSizing({ monthlyConsumptionKwh, region });

  const financing = calculateSolarPayment({
    systemCostBrl: sizing.estimatedCost,
    method,
    months,
    couponCode
  });

  const generatedKwh = monthlyConsumptionKwh * (sizing.installedKwp / sizing.requiredKwp);

  const savings = simulateBillSavings({
    monthlyConsumptionKwh,
    generatedKwh,
    phaseType,
    tariffBrlPerKwh,
    systemCostBrl: financing.total
  });

  const installmentBrl = financing.monthlyInstallment;
  const cashflowPositive = financing.method === 'pix' ? null : installmentBrl <= savings.monthlySavingsBrl;

  return {
    protocol: generateProtocol(),
    sizing,
    savings,
    financing,
    cashflowPositive
  };
}

module.exports = { buildSolarProposal };
