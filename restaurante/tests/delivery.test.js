'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateDeliveryTotals: calc } = require('../delivery');

test('fee tiers by distance', () => {
  assert.equal(calc({ itemsSubtotalBrl: 50, distanceKm: 0 }).deliveryFeeBrl, 7);
  assert.equal(calc({ itemsSubtotalBrl: 50, distanceKm: 3 }).deliveryFeeBrl, 7);
  assert.equal(calc({ itemsSubtotalBrl: 50, distanceKm: 3.01 }).deliveryFeeBrl, 12);
  assert.equal(calc({ itemsSubtotalBrl: 50, distanceKm: 8 }).deliveryFeeBrl, 12);
  assert.equal(calc({ itemsSubtotalBrl: 50, distanceKm: 8.5 }).deliveryFeeBrl, 18);
  assert.equal(calc({ itemsSubtotalBrl: 50, distanceKm: 15 }).deliveryFeeBrl, 18);
});

test('rejects distance above 15 km or invalid', () => {
  assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm: 15.1 }), RangeError);
  assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm: -1 }), RangeError);
  assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm: NaN }), RangeError);
});

test('minimum order is R$ 35 on gross subtotal', () => {
  assert.throws(() => calc({ itemsSubtotalBrl: 34.99, distanceKm: 1 }), RangeError);
  assert.equal(calc({ itemsSubtotalBrl: 35, distanceKm: 1 }).totalBrl, 42);
  // coupon does not re-trigger the minimum
  assert.equal(calc({ itemsSubtotalBrl: 35, distanceKm: 1, couponCode: 'DANCHEF10' }).netSubtotalBrl, 31.5);
});

test('free delivery at net subtotal >= R$ 120', () => {
  assert.equal(calc({ itemsSubtotalBrl: 120, distanceKm: 10 }).deliveryFeeBrl, 0);
  assert.equal(calc({ itemsSubtotalBrl: 119.99, distanceKm: 10 }).deliveryFeeBrl, 18);
  // 130 - 10% = 117 -> not free
  assert.equal(calc({ itemsSubtotalBrl: 130, distanceKm: 10, couponCode: 'DANCHEF10' }).deliveryFeeBrl, 18);
  // 134 - 10% = 120.60 -> free
  assert.equal(calc({ itemsSubtotalBrl: 134, distanceKm: 10, couponCode: 'DANCHEF10' }).deliveryFeeBrl, 0);
});

test('coupon DANCHEF10 gives 10% on dishes; unknown coupon rejected', () => {
  const r = calc({ itemsSubtotalBrl: 100, distanceKm: 2, couponCode: 'danchef10' });
  assert.equal(r.discountBrl, 10);
  assert.equal(r.netSubtotalBrl, 90);
  assert.equal(r.totalBrl, 97);
  assert.equal(calc({ itemsSubtotalBrl: 100, distanceKm: 2, couponCode: '' }).discountBrl, 0);
  assert.throws(() => calc({ itemsSubtotalBrl: 100, distanceKm: 2, couponCode: 'FOO' }), RangeError);
});

test('tip restricted to 0, 10 or 12 percent of net subtotal', () => {
  assert.equal(calc({ itemsSubtotalBrl: 100, distanceKm: 2, tipPct: 10 }).tipBrl, 10);
  const r = calc({ itemsSubtotalBrl: 100, distanceKm: 2, tipPct: 12 });
  assert.equal(r.tipBrl, 12);
  assert.equal(r.totalBrl, 119);
  assert.throws(() => calc({ itemsSubtotalBrl: 100, distanceKm: 2, tipPct: 5 }), RangeError);
});

test('combined coupon, tip and free delivery', () => {
  const r = calc({ itemsSubtotalBrl: 200, distanceKm: 14, tipPct: 10, couponCode: 'DANCHEF10' });
  assert.deepEqual(r, {
    itemsSubtotalBrl: 200,
    discountBrl: 20,
    netSubtotalBrl: 180,
    deliveryFeeBrl: 0,
    tipBrl: 18,
    totalBrl: 198,
  });
});
