const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSolarSizing } = require('../sizing');

test('calculateSolarSizing calculates correctly across all regions', () => {
  const testCases = [
    { region: 'nordeste', hsp: 5.4, expectedPanels: 8, consumption: 500, expectedRequiredKwp: 3.956948 },
    { region: 'centro-oeste', hsp: 5.1, expectedPanels: 5, consumption: 300, expectedRequiredKwp: 2.513824 },
    { region: 'Sudeste', hsp: 4.8, expectedPanels: 9, consumption: 500, expectedRequiredKwp: 4.451567 },
    { region: ' Norte ', hsp: 4.6, expectedPanels: 4, consumption: 200, expectedRequiredKwp: 1.858045 },
    { region: 'SUL', hsp: 4.2, expectedPanels: 6, consumption: 300, expectedRequiredKwp: 3.052503 }
  ];

  for (const { region, expectedPanels, consumption, expectedRequiredKwp } of testCases) {
    const result = calculateSolarSizing({ monthlyConsumptionKwh: consumption, region });
    
    assert.ok(Math.abs(result.requiredKwp - expectedRequiredKwp) < 0.0001, `Failed requiredKwp for ${region}`);
    assert.equal(result.panels, expectedPanels, `Failed panels for ${region}`);
    
    const expectedInstalledKwp = Number((expectedPanels * 0.55).toFixed(2));
    assert.equal(result.installedKwp, expectedInstalledKwp, `Failed installedKwp for ${region}`);
    
    const expectedRoofArea = Number((expectedPanels * 2.6).toFixed(2));
    assert.equal(result.roofArea, expectedRoofArea, `Failed roofArea for ${region}`);
    
    const expectedEstimatedCost = Number((expectedInstalledKwp * 3900).toFixed(2));
    assert.equal(result.estimatedCost, expectedEstimatedCost, `Failed estimatedCost for ${region}`);
  }
});

test('calculateSolarSizing handles float boundaries accurately', () => {
  // We want requiredKwp to be exactly a multiple of 0.55 (like 1.1) to test Math.ceil behavior without precision noise adding an extra panel.
  // requiredKwp = 1.1 = consumption / (30 * 5.4 * 0.78) -> consumption = 1.1 * 126.36 = 139.00
  const resultExact = calculateSolarSizing({ monthlyConsumptionKwh: 138.996, region: 'nordeste' });
  assert.equal(resultExact.panels, 2);

  const resultSlightlyAbove = calculateSolarSizing({ monthlyConsumptionKwh: 139.00, region: 'nordeste' });
  assert.equal(resultSlightlyAbove.panels, 3);
});


test('calculateSolarSizing throws on invalid region inputs', () => {
  const invalidRegions = ['invalid', undefined, null, 123, 'constructor', '__proto__'];
  for (const region of invalidRegions) {
    assert.throws(() => {
      calculateSolarSizing({ monthlyConsumptionKwh: 500, region });
    }, /Região inválida/, `Did not throw for region: ${region}`);
  }
});

test('calculateSolarSizing throws on invalid consumption inputs', () => {
  const invalidConsumptions = [0, -100, NaN, undefined, Infinity, -Infinity, '500', null];
  for (const consumption of invalidConsumptions) {
    assert.throws(() => {
      calculateSolarSizing({ monthlyConsumptionKwh: consumption, region: 'nordeste' });
    }, /Consumo mensal inválido/, `Did not throw for consumption: ${consumption}`);
  }
});
