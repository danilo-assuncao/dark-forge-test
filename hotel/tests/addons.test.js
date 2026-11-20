'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ADDONS, listAddons, calculateAddonsTotal } = require('../addons.js');

const ctx = { nights: 3, guests: 2 };

test('catalog has the four addons with prices', () => {
  const expected = { breakfast: 4800, 'airport-transfer': 14000, 'spa-access': 9500, 'late-checkout': 11000 };
  assert.deepEqual(listAddons().map((a) => a.id), Object.keys(expected));
  for (const a of listAddons()) { assert.equal(a.priceCents, expected[a.id]); assert.equal(a.price * 100, a.priceCents); }
});

test('catalog is immutable and listAddons returns a copy', () => {
  assert.ok(Object.isFrozen(ADDONS) && ADDONS.every((a) => Object.isFrozen(a)));
  const copy = listAddons();
  copy.pop();
  assert.equal(listAddons().length, 4);
});

test('breakfast is per guest per night', () => {
  assert.equal(calculateAddonsTotal(['breakfast'], ctx).total, 48 * 2 * 3);
});

test('transfer and late-checkout are flat per booking', () => {
  assert.equal(calculateAddonsTotal(['airport-transfer'], ctx).total, 140);
  assert.equal(calculateAddonsTotal(['late-checkout'], { nights: 9, guests: 4 }).total, 110);
});

test('spa is per guest, one-off regardless of nights', () => {
  assert.equal(calculateAddonsTotal(['spa-access'], ctx).total, 190);
  assert.equal(calculateAddonsTotal(['spa-access'], { nights: 10, guests: 2 }).total, 190);
});

test('sums multiple addons and reports lines and cents', () => {
  const r = calculateAddonsTotal(['breakfast', 'airport-transfer', 'spa-access', 'late-checkout'], ctx);
  assert.equal(r.totalCents, 28800 + 14000 + 19000 + 11000);
  assert.equal(r.total, 728);
  assert.equal(r.lines.length, 4);
  assert.deepEqual(r.lines[0], { id: 'breakfast', quantity: 6, subtotalCents: 28800 });
});

test('empty selection totals zero', () => {
  assert.equal(calculateAddonsTotal([], ctx).total, 0);
});

test('rejects unknown, duplicate and non-string ids', () => {
  assert.throws(() => calculateAddonsTotal(['pool'], ctx), RangeError);
  assert.throws(() => calculateAddonsTotal([null], ctx), RangeError);
  assert.throws(() => calculateAddonsTotal(['breakfast', 'breakfast'], ctx), RangeError);
});

test('rejects non-array addonIds', () => {
  assert.throws(() => calculateAddonsTotal('breakfast', ctx), TypeError);
  assert.throws(() => calculateAddonsTotal(undefined, ctx), TypeError);
});

test('rejects invalid nights and guests', () => {
  for (const bad of [0, -1, 1.5, NaN, Infinity, '2', null, undefined]) {
    assert.throws(() => calculateAddonsTotal(['breakfast'], { nights: bad, guests: 2 }), RangeError);
    assert.throws(() => calculateAddonsTotal(['breakfast'], { nights: 2, guests: bad }), RangeError);
  }
  assert.throws(() => calculateAddonsTotal([]), RangeError);
});
