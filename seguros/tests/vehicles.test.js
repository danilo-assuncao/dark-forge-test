'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const v = require('../vehicles.js');

test('lists reference models in all four categories with base rates', () => {
  const rates = { hatch: 0.045, sedan: 0.05, suv: 0.058, eletrico: 0.042 };
  const list = v.listVehicles();
  assert.deepEqual([...new Set(list.map((x) => x.category))].sort(), Object.keys(rates).sort());
  list.forEach((x) => {
    assert.equal(x.baseRate, rates[x.category]);
    assert.ok(Number.isInteger(x.fipeCents) && x.fipeCents > 0);
  });
  assert.equal(new Set(list.map((x) => x.id)).size, list.length);
});

test('listVehicles returns a copy', () => {
  const list = v.listVehicles();
  list.pop();
  assert.equal(v.listVehicles().length, list.length + 1);
});

test('getVehicleById finds by id and returns null otherwise', () => {
  const first = v.listVehicles()[0];
  assert.equal(v.getVehicleById(first.id), first);
  assert.equal(v.getVehicleById('  ' + first.id.toUpperCase() + ' '), first);
  assert.equal(v.getVehicleById('nope'), null);
  assert.equal(v.getVehicleById(undefined), null);
  assert.equal(v.getVehicleById('toString'), null);
});

test('age factor bands with and without garage', () => {
  assert.equal(v.resolveRiskMultiplier({ driverAge: 18, hasGarage: false }), 1.35);
  assert.equal(v.resolveRiskMultiplier({ driverAge: 24, hasGarage: false }), 1.35);
  assert.equal(v.resolveRiskMultiplier({ driverAge: 25, hasGarage: false }), 1);
  assert.equal(v.resolveRiskMultiplier({ driverAge: 59, hasGarage: false }), 1);
  assert.equal(v.resolveRiskMultiplier({ driverAge: 60, hasGarage: false }), 1.12);
  assert.equal(v.resolveRiskMultiplier({ driverAge: 85, hasGarage: false }), 1.12);
});

test('garage factor 0.92 combines multiplicatively', () => {
  assert.equal(v.resolveRiskMultiplier({ driverAge: 30, hasGarage: true }), 0.92);
  assert.equal(v.resolveRiskMultiplier({ driverAge: 20, hasGarage: true }), 1.242);
  assert.equal(v.resolveRiskMultiplier({ driverAge: 70, hasGarage: true }), 1.0304);
});

test('throws RangeError for ages outside 18..85 or invalid', () => {
  [17, 86, 0, -1, 30.5, NaN, '30', undefined].forEach((age) => {
    assert.throws(() => v.resolveRiskMultiplier({ driverAge: age, hasGarage: true }), RangeError);
  });
  assert.throws(() => v.resolveRiskMultiplier(), RangeError);
});
