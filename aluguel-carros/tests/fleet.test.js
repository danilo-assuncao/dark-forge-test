'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { listFleet, getVehicleGroup, validateDriverEligibility } = require('../fleet.js');

// --- listFleet Tests ---

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

test('listFleet filters by unknown category returning empty array', () => {
  const fleet = listFleet({ category: 'unknown' });
  assert.strictEqual(fleet.length, 0);
});

test('listFleet filters by maxDailyBrl including equality boundary', () => {
  const fleet = listFleet({ maxDailyBrl: 229.00 });
  assert.strictEqual(fleet.length, 2);
  const ids = fleet.map(f => f.id);
  assert.ok(ids.includes('economico'));
  assert.ok(ids.includes('suv'));
  assert.ok(!ids.includes('executivo'));
  assert.ok(!ids.includes('eletrico'));
});

test('listFleet ignores non-numeric maxDailyBrl', () => {
  const fleet = listFleet({ maxDailyBrl: '250' });
  assert.strictEqual(fleet.length, 4);
});

test('listFleet filters by combined category and maxDailyBrl', () => {
  let fleet = listFleet({ category: 'eletrico', maxDailyBrl: 300 });
  assert.strictEqual(fleet.length, 1);
  assert.strictEqual(fleet[0].id, 'eletrico');

  fleet = listFleet({ category: 'eletrico', maxDailyBrl: 200 });
  assert.strictEqual(fleet.length, 0);
});

test('listFleet returns empty array for 0 maxDailyBrl', () => {
  const fleet = listFleet({ maxDailyBrl: 0 });
  assert.strictEqual(fleet.length, 0);
});

// --- Immutability Tests ---

test('fleet catalog and groups are immutable', () => {
  const group = getVehicleGroup('suv');
  assert.ok(Object.isFrozen(group), 'Group object should be frozen');

  assert.throws(() => {
    group.minAge = 18;
  }, TypeError);

  const groupCheck = getVehicleGroup('suv');
  assert.strictEqual(groupCheck.minAge, 21, 'minAge should not change');
});

// --- getVehicleGroup Tests ---

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
  assert.strictEqual(getVehicleGroup('unknown'), null);
});

test('getVehicleGroup returns null for prototype keys', () => {
  assert.strictEqual(getVehicleGroup('constructor'), null);
  assert.strictEqual(getVehicleGroup('__proto__'), null);
  assert.strictEqual(getVehicleGroup('toString'), null);
});

test('getVehicleGroup returns null for non-string group IDs', () => {
  assert.strictEqual(getVehicleGroup(null), null);
  assert.strictEqual(getVehicleGroup(undefined), null);
  assert.strictEqual(getVehicleGroup(123), null);
});

// --- validateDriverEligibility Tests ---

test('validateDriverEligibility passes for eligible driver (boundaries)', () => {
  // economico, minAge 21
  assert.strictEqual(validateDriverEligibility('economico', 21, 2), true);
  // suv, minAge 21
  assert.strictEqual(validateDriverEligibility('suv', 21, 2), true);
  // eletrico, minAge 23
  assert.strictEqual(validateDriverEligibility('eletrico', 23, 2), true);
  // executivo, minAge 25
  assert.strictEqual(validateDriverEligibility('executivo', 25, 2), true);
});

test('validateDriverEligibility fails for driver below min age (boundaries)', () => {
  assert.strictEqual(validateDriverEligibility('economico', 20, 2), false);
  assert.strictEqual(validateDriverEligibility('suv', 20, 2), false);
  assert.strictEqual(validateDriverEligibility('eletrico', 22, 2), false);
  assert.strictEqual(validateDriverEligibility('executivo', 24, 2), false);
});

test('validateDriverEligibility fails for driver with less than 2 years of license (boundaries)', () => {
  assert.strictEqual(validateDriverEligibility('economico', 25, 1), false);
  assert.strictEqual(validateDriverEligibility('suv', 25, 1), false);
  assert.strictEqual(validateDriverEligibility('eletrico', 25, 1), false);
  assert.strictEqual(validateDriverEligibility('executivo', 25, 1), false);
});

test('validateDriverEligibility fails for missing or NaN or invalid types', () => {
  assert.strictEqual(validateDriverEligibility('executivo', undefined, undefined), false);
  assert.strictEqual(validateDriverEligibility('executivo', NaN, NaN), false);
  assert.strictEqual(validateDriverEligibility('executivo', '26', '3'), false);
  assert.strictEqual(validateDriverEligibility('executivo', 26, null), false);
  assert.strictEqual(validateDriverEligibility('executivo', null, 3), false);
  assert.strictEqual(validateDriverEligibility('executivo', Infinity, 3), false);
});

test('validateDriverEligibility fails for negative age or license years', () => {
  assert.strictEqual(validateDriverEligibility('executivo', -25, 3), false);
  assert.strictEqual(validateDriverEligibility('executivo', 25, -2), false);
});

test('validateDriverEligibility throws error for unknown group', () => {
  assert.throws(() => {
    validateDriverEligibility('unknown', 30, 5);
  }, /Vehicle group not found/);
});

test('validateDriverEligibility throws error for prototype keys as group', () => {
  assert.throws(() => {
    validateDriverEligibility('constructor', 30, 5);
  }, /Vehicle group not found/);
});
