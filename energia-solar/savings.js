const MIN_GRID_KWH = {
  monofasico: 30,
  bifasico: 50,
  trifasico: 100
};

function simulateBillSavings({ monthlyConsumptionKwh, generatedKwh, phaseType, tariffBrlPerKwh, systemCostBrl }) {
  if (!Object.hasOwn(MIN_GRID_KWH, phaseType)) {
    throw new RangeError(`Invalid phaseType: ${phaseType}`);
  }

  const inputs = [monthlyConsumptionKwh, generatedKwh, tariffBrlPerKwh, systemCostBrl];
  if (inputs.some(val => typeof val !== 'number' || !Number.isFinite(val) || val < 0)) {
    throw new TypeError('All numeric inputs must be finite numbers >= 0');
  }

  const minGridKwh = MIN_GRID_KWH[phaseType];
  
  const maxOffsetKwh = Math.max(0, monthlyConsumptionKwh - minGridKwh);
  const actualOffsetKwh = Math.min(generatedKwh, maxOffsetKwh);
  
  const monthlySavingsBrl = actualOffsetKwh * tariffBrlPerKwh;
  const annualSavingsBrl = monthlySavingsBrl * 12;
  const paybackMonths = monthlySavingsBrl > 0 ? (systemCostBrl / monthlySavingsBrl) : Infinity;

  return {
    monthlySavingsBrl,
    annualSavingsBrl,
    paybackMonths
  };
}

module.exports = { simulateBillSavings };
