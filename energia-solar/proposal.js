const { calculateSolarSizing } = require('./sizing');
const { simulateBillSavings } = require('./savings');
const { calculateSolarPayment } = require('./financing');

function generateProtocol() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'SOL-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function buildSolarProposal(input) {
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

  const generatedKwh = monthlyConsumptionKwh * (sizing.installedKwp / sizing.requiredKwp);

  const savings = simulateBillSavings({
    monthlyConsumptionKwh,
    generatedKwh,
    phaseType,
    tariffBrlPerKwh,
    systemCostBrl: sizing.estimatedCost
  });

  const financing = calculateSolarPayment({
    systemCostBrl: sizing.estimatedCost,
    method,
    months,
    couponCode
  });

  const installmentBrl = financing.monthlyInstallment || 0;
  const cashflowPositive = installmentBrl <= savings.monthlySavingsBrl;

  return {
    protocol: generateProtocol(),
    sizing,
    savings,
    financing,
    cashflowPositive
  };
}

module.exports = { buildSolarProposal };
