'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../snacks.js');

test('catalog has the five snacks with expected prices', () => {
  const prices = Object.fromEntries(s.listSnacks().map((x) => [x.id, x.price]));
  assert.deepEqual(prices, {
    'pipoca-m': 24, 'pipoca-g': 32, 'refri-500': 14, 'combo-casal': 58, chocolate: 12
  });
});

test('listSnacks returns copies', () => {
  s.listSnacks()[0].price = 1;
  assert.equal(s.listSnacks()[0].price, 24);
});

test('empty order totals zero', () => {
  const r = s.calculateSnacksTotal([]);
  assert.equal(r.total, 0);
  assert.equal(r.discount, 0);
});

test('no discount below 4 items', () => {
  const r = s.calculateSnacksTotal([{ snackId: 'pipoca-m', qty: 1 }, { snackId: 'refri-500', qty: 2 }]);
  assert.equal(r.totalQty, 3);
  assert.equal(r.subtotal, 52);
  assert.equal(r.discount, 0);
  assert.equal(r.total, 52);
});

test('10% discount at exactly 4 items across lines', () => {
  const r = s.calculateSnacksTotal([{ snackId: 'pipoca-m', qty: 2 }, { snackId: 'chocolate', qty: 2 }]);
  assert.equal(r.subtotal, 72);
  assert.equal(r.discountPct, 10);
  assert.equal(r.discount, 7.2);
  assert.equal(r.total, 64.8);
});

test('bulk discount on mixed lines', () => {
  const r = s.calculateSnacksTotal([{ snackId: 'refri-500', qty: 3 }, { snackId: 'combo-casal', qty: 1 }]);
  assert.equal(r.subtotal, 100);
  assert.equal(r.total, 90);
  assert.equal(s.calculateSnacksTotal([{ snackId: 'refri-500', qty: 5 }]).total, 63);
});

test('single line with qty 4 triggers the discount, qty 3 does not', () => {
  assert.equal(s.calculateSnacksTotal([{ snackId: 'chocolate', qty: 3 }]).discount, 0);
  const r = s.calculateSnacksTotal([{ snackId: 'chocolate', qty: 4 }]);
  assert.equal(r.discount, 4.8);
  assert.equal(r.total, 43.2);
});

test('qty bounds 1 and 10 are accepted', () => {
  assert.equal(s.calculateSnacksTotal([{ snackId: 'pipoca-m', qty: 1 }]).total, 24);
  const r = s.calculateSnacksTotal([{ snackId: 'pipoca-m', qty: 10 }]);
  assert.equal(r.subtotal, 240);
  assert.equal(r.total, 216);
});

test('returns per-line details', () => {
  const r = s.calculateSnacksTotal([{ snackId: 'pipoca-g', qty: 2 }]);
  assert.deepEqual(r.items, [{ snackId: 'pipoca-g', qty: 2, unitPrice: 32, subtotal: 64 }]);
});

test('repeated snackId lines count together toward the discount', () => {
  const r = s.calculateSnacksTotal([{ snackId: 'pipoca-m', qty: 2 }, { snackId: 'pipoca-m', qty: 2 }]);
  assert.equal(r.items.length, 2);
  assert.equal(r.totalQty, 4);
  assert.equal(r.total, 86.4);
});

test('catalog exposes names', () => {
  s.listSnacks().forEach((x) => assert.ok(typeof x.name === 'string' && x.name.length > 0));
});

test('rejects invalid input', () => {
  [null, undefined, {}, 'x'].forEach((v) => assert.throws(() => s.calculateSnacksTotal(v), TypeError));
  [null, 5, 'x'].forEach((v) => {
    assert.throws(() => s.calculateSnacksTotal([v]), { name: 'TypeError', message: 'each item must be an object' });
  });
  assert.throws(() => s.calculateSnacksTotal([{ snackId: 'x', qty: 1 }]), RangeError);
  assert.throws(() => s.calculateSnacksTotal([{ qty: 1 }]), RangeError);
  assert.throws(() => s.calculateSnacksTotal([{ snackId: 'pipoca-m' }]), RangeError);
  [0, 11, 1.5, '2', NaN, undefined].forEach((qty) => {
    assert.throws(() => s.calculateSnacksTotal([{ snackId: 'pipoca-m', qty }]), /qty per line/);
  });
});
