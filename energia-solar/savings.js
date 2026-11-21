const MIN_GRID_KWH = {
  monofasico: 30,
  bifasico: 50,
  trifasico: 100
};

function simulateBillSavings({ monthlyConsumptionKwh, generatedKwh, phaseType, tariffBrlPerKwh, systemCostBrl }) {
  const minGridKwh = MIN_GRID_KWH[phaseType] || 0;
  
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
