import { test } from 'node:test';
import assert from 'node:assert/strict';
import { listAddons, calculateProtectionAndAddons } from '../protections.js';

test('listAddons returns available addons', () => {
  const addons = listAddons();
  assert.ok(Array.isArray(addons));
  assert.strictEqual(addons.length, 3);
  assert.strictEqual(addons.some(a => a.id === 'cadeirinha-bebe' && a.price === 18 && a.type === 'per_day'), true);
  assert.strictEqual(addons.some(a => a.id === 'condutor-adicional' && a.price === 22 && a.type === 'per_day'), true);
  assert.strictEqual(addons.some(a => a.id === 'tag-pedagio' && a.price === 25 && a.type === 'flat'), true);
});

test('calculateProtectionAndAddons calculates only basica plan by default', () => {
  const total = calculateProtectionAndAddons({ days: 3 });
  assert.strictEqual(total, 29 * 3);
});

test('calculateProtectionAndAddons calculates nenhuma plan', () => {
  const total = calculateProtectionAndAddons({ protectionPlan: 'nenhuma', days: 5 });
  assert.strictEqual(total, 0);
});

test('calculateProtectionAndAddons calculates completa plan', () => {
  const total = calculateProtectionAndAddons({ protectionPlan: 'completa', days: 2 });
  assert.strictEqual(total, 54 * 2);
});

test('calculateProtectionAndAddons calculates plan and addons correctly', () => {
  const total = calculateProtectionAndAddons({
    protectionPlan: 'basica',
    addonIds: ['cadeirinha-bebe', 'tag-pedagio'],
    days: 4
  });
  // basica: 29 * 4 = 116
  // cadeirinha-bebe: 18 * 4 = 72
  // tag-pedagio: 25
  assert.strictEqual(total, 116 + 72 + 25);
});

test('calculateProtectionAndAddons calculates flat addon price correctly over multiple days', () => {
  const total = calculateProtectionAndAddons({
    protectionPlan: 'nenhuma',
    addonIds: ['tag-pedagio'],
    days: 10
  });
  assert.strictEqual(total, 25);
});

test('calculateProtectionAndAddons calculates daily addon price correctly over multiple days', () => {
  const total = calculateProtectionAndAddons({
    protectionPlan: 'nenhuma',
    addonIds: ['condutor-adicional'],
    days: 5
  });
  assert.strictEqual(total, 22 * 5);
});

test('calculateProtectionAndAddons throws on invalid days', () => {
  assert.throws(() => calculateProtectionAndAddons({ days: 0 }), /days must be an integer between 1 and 60/);
  assert.throws(() => calculateProtectionAndAddons({ days: 61 }), /days must be an integer between 1 and 60/);
  assert.throws(() => calculateProtectionAndAddons({ days: 2.5 }), /days must be an integer between 1 and 60/);
  assert.throws(() => calculateProtectionAndAddons({ days: NaN }), /days must be an integer between 1 and 60/);
  assert.throws(() => calculateProtectionAndAddons({ days: '3' }), /days must be an integer between 1 and 60/);
  assert.throws(() => calculateProtectionAndAddons({ days: -1 }), /days must be an integer between 1 and 60/);
  assert.throws(() => calculateProtectionAndAddons({}), /days must be an integer between 1 and 60/);
});

test('calculateProtectionAndAddons works for valid boundaries', () => {
  assert.strictEqual(calculateProtectionAndAddons({ days: 1 }), 29);
  assert.strictEqual(calculateProtectionAndAddons({ days: 60 }), 29 * 60);
});

test('calculateProtectionAndAddons throws on invalid protection plan', () => {
  assert.throws(() => calculateProtectionAndAddons({ protectionPlan: 'premium', days: 2 }), /invalid protection plan/);
  assert.throws(() => calculateProtectionAndAddons({ protectionPlan: 'constructor', days: 2 }), /invalid protection plan/);
  assert.throws(() => calculateProtectionAndAddons({ protectionPlan: '__proto__', days: 2 }), /invalid protection plan/);
});

test('calculateProtectionAndAddons throws on invalid addon', () => {
  assert.throws(() => calculateProtectionAndAddons({ addonIds: ['fake-addon'], days: 2 }), /invalid addon: fake-addon/);
  assert.throws(() => calculateProtectionAndAddons({ addonIds: ['toString'], days: 2 }), /invalid addon: toString/);
});

test('calculateProtectionAndAddons handles non-array addonIds', () => {
  assert.throws(() => calculateProtectionAndAddons({ addonIds: 'tag-pedagio', days: 2 }), /addonIds must be an array/);
  assert.throws(() => calculateProtectionAndAddons({ addonIds: null, days: 2 }), /addonIds must be an array/);
});

test('calculateProtectionAndAddons dedupes addons', () => {
  const total = calculateProtectionAndAddons({ addonIds: ['tag-pedagio', 'tag-pedagio', 'cadeirinha-bebe', 'cadeirinha-bebe'], days: 3 });
  assert.strictEqual(total, 29 * 3 + 25 + 18 * 3);
});

test('calculateProtectionAndAddons works with empty addonIds', () => {
  const total = calculateProtectionAndAddons({ addonIds: [], days: 3 });
  assert.strictEqual(total, 29 * 3);
});

test('calculateProtectionAndAddons calculates all valid addons with non-default plan', () => {
  const total = calculateProtectionAndAddons({
    protectionPlan: 'completa',
    addonIds: ['cadeirinha-bebe', 'condutor-adicional', 'tag-pedagio'],
    days: 4
  });
  assert.strictEqual(total, (54 * 4) + (18 * 4) + (22 * 4) + 25);
});
