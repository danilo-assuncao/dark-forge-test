const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSolarSizing } = require('../sizing');

test('calculateSolarSizing calculates correctly for nordeste', () => {
  const result = calculateSolarSizing({ monthlyConsumptionKwh: 500, region: 'nordeste' });
  // requiredKwp = 500 / (30 * 5.4 * 0.78) = 3.9569...
  // panels = Math.ceil(3.9569 / 0.55) = 8
  // installedKwp = 8 * 0.55 = 4.4
  // roofArea = 8 * 2.6 = 20.8
  // estimatedCost = 4.4 * 3900 = 17160
  
  assert.ok(result.requiredKwp > 3.95 && result.requiredKwp < 3.96);
  assert.equal(result.panels, 8);
  assert.equal(result.installedKwp, 4.4);
  assert.equal(result.roofArea, 20.8);
  assert.equal(result.estimatedCost, 17160);
});

test('calculateSolarSizing throws on invalid region', () => {
  assert.throws(() => {
    calculateSolarSizing({ monthlyConsumptionKwh: 500, region: 'invalid' });
  }, /Região inválida/);
});

test('calculateSolarSizing calculates correctly for sul', () => {
  const result = calculateSolarSizing({ monthlyConsumptionKwh: 300, region: 'sul' });
  // requiredKwp = 300 / (30 * 4.2 * 0.78) = 3.0525...
  // panels = Math.ceil(3.0525... / 0.55) = 6
  // installedKwp = 6 * 0.55 = 3.3
  // roofArea = 6 * 2.6 = 15.6
  // estimatedCost = 3.3 * 3900 = 12870
  
  assert.ok(result.requiredKwp > 3.05 && result.requiredKwp < 3.06);
  assert.equal(result.panels, 6);
  assert.ok(Math.abs(result.installedKwp - 3.3) < 0.01);
  assert.ok(Math.abs(result.roofArea - 15.6) < 0.01);
  assert.ok(Math.abs(result.estimatedCost - 12870) < 0.01);
});
