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

test('rounds to 2 decimals', () => {
  const r = s.calculateSnacksTotal([{ snackId: 'refri-500', qty: 3 }, { snackId: 'combo-casal', qty: 1 }]);
  assert.equal(r.subtotal, 100);
  assert.equal(r.total, 90);
  const r2 = s.calculateSnacksTotal([{ snackId: 'refri-500', qty: 5 }]);
  assert.equal(r2.total, 63);
});

test('rejects invalid input', () => {
  assert.throws(() => s.calculateSnacksTotal(null), TypeError);
  assert.throws(() => s.calculateSnacksTotal([{ snackId: 'x', qty: 1 }]), RangeError);
  [0, 11, 1.5, '2', NaN, undefined].forEach((qty) => {
    assert.throws(() => s.calculateSnacksTotal([{ snackId: 'pipoca-m', qty }]), RangeError);
  });
});
