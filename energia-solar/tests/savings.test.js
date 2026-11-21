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

  assert.equal(result.monthlySavingsBrl, 320);
  assert.equal(result.annualSavingsBrl, 3840);
  assert.equal(result.paybackMonths, 46.875);
});

test('consumption lower than min grid kwh', () => {
  const result = simulateBillSavings({
    monthlyConsumptionKwh: 40,
    generatedKwh: 100,
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.9,
    systemCostBrl: 5000
  });

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

test('unknown phaseType throws RangeError', () => {
  assert.throws(
    () => simulateBillSavings({
      monthlyConsumptionKwh: 300,
      generatedKwh: 200,
      phaseType: 'unknown',
      tariffBrlPerKwh: 1.0,
      systemCostBrl: 10000
    }),
    RangeError
  );
});

test('negative inputs throw TypeError', () => {
  assert.throws(
    () => simulateBillSavings({
      monthlyConsumptionKwh: -300,
      generatedKwh: 200,
      phaseType: 'monofasico',
      tariffBrlPerKwh: 1.0,
      systemCostBrl: 10000
    }),
    TypeError
  );
  
  assert.throws(
    () => simulateBillSavings({
      monthlyConsumptionKwh: 300,
      generatedKwh: -200,
      phaseType: 'monofasico',
      tariffBrlPerKwh: 1.0,
      systemCostBrl: 10000
    }),
    TypeError
  );
});

test('NaN/undefined inputs throw TypeError', () => {
  assert.throws(
    () => simulateBillSavings({
      monthlyConsumptionKwh: NaN,
      generatedKwh: 200,
      phaseType: 'monofasico',
      tariffBrlPerKwh: 1.0,
      systemCostBrl: 10000
    }),
    TypeError
  );

  assert.throws(
    () => simulateBillSavings({
      monthlyConsumptionKwh: 300,
      generatedKwh: undefined,
      phaseType: 'monofasico',
      tariffBrlPerKwh: 1.0,
      systemCostBrl: 10000
    }),
    TypeError
  );
});

test('exact boundary conditions: consumption === minGridKwh', () => {
  const result = simulateBillSavings({
    monthlyConsumptionKwh: 50,
    generatedKwh: 100,
    phaseType: 'bifasico',
    tariffBrlPerKwh: 1.0,
    systemCostBrl: 5000
  });

  assert.equal(result.monthlySavingsBrl, 0);
  assert.equal(result.annualSavingsBrl, 0);
  assert.equal(result.paybackMonths, Infinity);
});

test('exact boundary conditions: generation === maxOffsetKwh', () => {
  const result = simulateBillSavings({
    monthlyConsumptionKwh: 300,
    generatedKwh: 270,
    phaseType: 'monofasico',
    tariffBrlPerKwh: 1.0,
    systemCostBrl: 2700
  });

  assert.equal(result.monthlySavingsBrl, 270);
  assert.equal(result.annualSavingsBrl, 3240);
  assert.equal(result.paybackMonths, 10);
});

test('bifasico with positive savings', () => {
  const result = simulateBillSavings({
    monthlyConsumptionKwh: 250,
    generatedKwh: 200,
    phaseType: 'bifasico',
    tariffBrlPerKwh: 0.5,
    systemCostBrl: 4000
  });

  // maxOffset = 250 - 50 = 200
  // actualOffset = min(200, 200) = 200
  // monthly = 200 * 0.5 = 100
  // annual = 1200
  // payback = 4000 / 100 = 40
  assert.equal(result.monthlySavingsBrl, 100);
  assert.equal(result.annualSavingsBrl, 1200);
  assert.equal(result.paybackMonths, 40);
});

test('degenerate inputs: tariff 0 or systemCostBrl 0', () => {
  const res1 = simulateBillSavings({
    monthlyConsumptionKwh: 300,
    generatedKwh: 200,
    phaseType: 'monofasico',
    tariffBrlPerKwh: 0,
    systemCostBrl: 10000
  });
  assert.equal(res1.monthlySavingsBrl, 0);
  assert.equal(res1.annualSavingsBrl, 0);
  assert.equal(res1.paybackMonths, Infinity);

  const res2 = simulateBillSavings({
    monthlyConsumptionKwh: 300,
    generatedKwh: 200,
    phaseType: 'monofasico',
    tariffBrlPerKwh: 1.0,
    systemCostBrl: 0
  });
  assert.equal(res2.paybackMonths, 0);
});
