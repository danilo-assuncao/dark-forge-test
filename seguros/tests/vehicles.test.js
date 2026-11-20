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

test('hasGarage discount applies only for strict true', () => {
  [undefined, null, 'true', 1, 0, 'false'].forEach((flag) => {
    assert.equal(v.resolveRiskMultiplier({ driverAge: 30, hasGarage: flag }), 1);
  });
  assert.equal(v.resolveRiskMultiplier({ driverAge: 30 }), 1);
});

test('garage factor at every band boundary', () => {
  const cases = [[18, 1.242], [24, 1.242], [25, 0.92], [59, 0.92], [60, 1.0304], [85, 1.0304]];
  cases.forEach(([age, expected]) => {
    assert.equal(v.resolveRiskMultiplier({ driverAge: age, hasGarage: true }), expected);
  });
});

test('exports frozen categories and vehicles with stable FIPE data', () => {
  assert.ok(Object.isFrozen(v.CATEGORIES));
  Object.values(v.CATEGORIES).forEach((c) => assert.ok(Object.isFrozen(c)));
  assert.deepEqual(
    Object.values(v.CATEGORIES).map((c) => [c.id, c.baseRate]),
    [['hatch', 0.045], ['sedan', 0.05], ['suv', 0.058], ['eletrico', 0.042]]
  );
  v.listVehicles().forEach((x) => {
    assert.ok(Object.isFrozen(x));
    assert.ok(typeof x.name === 'string' && x.name.length > 0);
  });
  assert.deepEqual(v.listVehicles().map((x) => [x.id, x.fipeCents]), [
    ['hatch-compacto', 7500000], ['hatch-premium', 11000000],
    ['sedan-medio', 12500000], ['sedan-executivo', 21000000],
    ['suv-compacto', 14500000], ['suv-grande', 32000000],
    ['eletrico-urbano', 15000000], ['eletrico-premium', 29000000]
  ]);
});
