const crypto = require('crypto');
const { calculateSolarSizing } = require('./sizing');
const { simulateBillSavings } = require('./savings');
const { calculateSolarPayment } = require('./financing');

function generateProtocol() {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
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

  const sizing = calculateSolarSizing({ monthlyConsumptionKwh, region });

  const financing = calculateSolarPayment({
    systemCostBrl: sizing.estimatedCost,
    method,
    months,
    couponCode
  });

  const generatedKwh = sizing.requiredKwp > 0 
    ? monthlyConsumptionKwh * (sizing.installedKwp / sizing.requiredKwp) 
    : 0;

  const savings = simulateBillSavings({
    monthlyConsumptionKwh,
    generatedKwh,
    phaseType,
    tariffBrlPerKwh,
    systemCostBrl: financing.method === 'pix' ? financing.total : financing.principal
  });

  const installmentBrl = financing.monthlyInstallment || 0;
  const cashflowPositive = method === 'pix' ? null : installmentBrl <= savings.monthlySavingsBrl;

  return {
    protocol: generateProtocol(),
    sizing,
    savings,
    financing,
    cashflowPositive
  };
}

module.exports = { buildSolarProposal };
