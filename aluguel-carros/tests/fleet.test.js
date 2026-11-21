const test = require('node:test');
const assert = require('node:assert/strict');
const { listFleet, getVehicleGroup, validateDriverEligibility } = require('../fleet.js');

test('listFleet returns all vehicles when no filter is provided', () => {
  const fleet = listFleet();
  assert.strictEqual(fleet.length, 4);
  assert.strictEqual(fleet.find(f => f.id === 'economico').dailyRateBrl, 119.00);
});

test('listFleet filters by category', () => {
  const fleet = listFleet({ category: 'suv' });
  assert.strictEqual(fleet.length, 1);
  assert.strictEqual(fleet[0].id, 'suv');
});

test('listFleet filters by maxDailyBrl', () => {
  const fleet = listFleet({ maxDailyBrl: 250 });
  assert.strictEqual(fleet.length, 2);
  const ids = fleet.map(f => f.id);
  assert.ok(ids.includes('economico'));
  assert.ok(ids.includes('suv'));
});

test('getVehicleGroup returns the correct group', () => {
  const group = getVehicleGroup('eletrico');
  assert.deepStrictEqual(group, {
    id: 'eletrico',
    dailyRateBrl: 289.00,
    depositBrl: 1800.00,
    minAge: 23
  });
});

test('getVehicleGroup returns null for unknown group', () => {
  const group = getVehicleGroup('unknown');
  assert.strictEqual(group, null);
});

test('validateDriverEligibility passes for eligible driver', () => {
  assert.strictEqual(validateDriverEligibility('executivo', 26, 3), true);
});

test('validateDriverEligibility fails for driver with less than 2 years of license', () => {
  assert.strictEqual(validateDriverEligibility('economico', 25, 1), false);
});

test('validateDriverEligibility fails for driver below min age', () => {
  assert.strictEqual(validateDriverEligibility('executivo', 24, 5), false);
  assert.strictEqual(validateDriverEligibility('eletrico', 22, 3), false);
});

test('validateDriverEligibility throws error for unknown group', () => {
  assert.throws(() => {
    validateDriverEligibility('unknown', 30, 5);
  }, /Vehicle group not found/);
});
