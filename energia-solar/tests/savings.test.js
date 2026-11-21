const test = require('node:test');
const assert = require('node:assert/strict');
const { simulateBillSavings } = require('../savings.js');

test('monofasico with consumption higher than generated', () => {
  const result = simulateBillSavings({
    monthlyConsumptionKwh: 300,
    generatedKwh: 200,
    phaseType: 'monofasico',
    tariffBrlPerKwh: 1.0,
    systemCostBrl: 10000
  });
  
  // maxOffset = 300 - 30 = 270
  // actualOffset = min(200, 270) = 200
  // monthlySavings = 200 * 1 = 200
  // annual = 200 * 12 = 2400
  // payback = 10000 / 200 = 50
  assert.equal(result.monthlySavingsBrl, 200);
  assert.equal(result.annualSavingsBrl, 2400);
  assert.equal(result.paybackMonths, 50);
});

test('trifasico with generation higher than max offset', () => {
  const result = simulateBillSavings({
    monthlyConsumptionKwh: 500,
    generatedKwh: 600,
    phaseType: 'trifasico',
    tariffBrlPerKwh: 0.8,
    systemCostBrl: 15000
  });

  // maxOffset = 500 - 100 = 400
  // actualOffset = min(600, 400) = 400
  // monthlySavings = 400 * 0.8 = 320
  // annual = 320 * 12 = 3840
  // payback = 15000 / 320 = 46.875
  assert.equal(result.monthlySavingsBrl, 320);
  assert.equal(result.annualSavingsBrl, 3840);
  assert.equal(result.paybackMonths, 46.875);
});

test('consumption lower than min grid kwh', () => {
  const result = simulateBillSavings({
    monthlyConsumptionKwh: 40,
    generatedKwh: 100,
    phaseType: 'bifasico', // min 50
    tariffBrlPerKwh: 0.9,
    systemCostBrl: 5000
  });

  // maxOffset = max(0, 40 - 50) = 0
  // actualOffset = min(100, 0) = 0
  assert.equal(result.monthlySavingsBrl, 0);
  assert.equal(result.annualSavingsBrl, 0);
  assert.equal(result.paybackMonths, Infinity);
});

test('zero generation', () => {
  const result = simulateBillSavings({
    monthlyConsumptionKwh: 300,
    generatedKwh: 0,
    phaseType: 'monofasico',
    tariffBrlPerKwh: 1.0,
    systemCostBrl: 10000
  });

  assert.equal(result.monthlySavingsBrl, 0);
  assert.equal(result.annualSavingsBrl, 0);
  assert.equal(result.paybackMonths, Infinity);
});
