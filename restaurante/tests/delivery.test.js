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
  for (const distanceKm of ['5', null]) {
    assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm }), {
      name: 'RangeError', message: 'Invalid distanceKm',
    });
  }
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

test('rejects invalid itemsSubtotalBrl and missing arguments', () => {
  for (const bad of [-1, NaN, Infinity, '50', null, undefined, 1000000.01]) {
    assert.throws(() => calc({ itemsSubtotalBrl: bad, distanceKm: 1 }), /Invalid itemsSubtotalBrl/);
  }
  assert.throws(() => calc(), /Invalid itemsSubtotalBrl/);
  assert.throws(() => calc(null), {
    name: 'RangeError', message: 'Invalid itemsSubtotalBrl',
  });
  assert.throws(() => calc({ itemsSubtotalBrl: 50 }), /Invalid distanceKm/);
  assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm: Infinity }), /Invalid distanceKm/);
  assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm: 16 }), /radius/);
});

test('accepts the maximum order subtotal', () => {
  assert.deepEqual(calc({ itemsSubtotalBrl: 1000000, distanceKm: 15 }), {
    itemsSubtotalBrl: 1000000,
    discountBrl: 0,
    netSubtotalBrl: 1000000,
    deliveryFeeBrl: 0,
    tipBrl: 0,
    totalBrl: 1000000,
  });
});

test('rejects sub-cent subtotals instead of rounding past the minimum', () => {
  assert.throws(() => calc({ itemsSubtotalBrl: 34.996, distanceKm: 1 }), /two decimal places/);
  assert.equal(calc({ itemsSubtotalBrl: 35.05, distanceKm: 1 }).itemsSubtotalBrl, 35.05);
});

test('non-string coupon is rejected; whitespace is trimmed', () => {
  for (const bad of [0, false, 5, {}, []]) {
    assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm: 1, couponCode: bad }), /Invalid couponCode/);
  }
  assert.equal(calc({ itemsSubtotalBrl: 50, distanceKm: 1, couponCode: null }).discountBrl, 0);
  assert.equal(calc({ itemsSubtotalBrl: 50, distanceKm: 1, couponCode: ' danchef10 ' }).discountBrl, 5);
  assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm: 1, couponCode: 'X\nY' }), (e) => e.message === 'Unknown coupon');
});

test('rounding of discount and tip on odd cents', () => {
  // 35.05 * 10% = 3.505 -> 3.51 (half up on 350.5 cents)
  const r = calc({ itemsSubtotalBrl: 35.05, distanceKm: 1, couponCode: 'DANCHEF10', tipPct: 12 });
  assert.equal(r.discountBrl, 3.51);
  assert.equal(r.netSubtotalBrl, 31.54);
  // 31.54 * 12% = 3.7848 -> 3.78
  assert.equal(r.tipBrl, 3.78);
  assert.equal(r.totalBrl, 42.32);
});

test('tip must be a number from the allowed set', () => {
  for (const tipPct of ['10', null, -10, NaN, Infinity]) {
    assert.throws(() => calc({ itemsSubtotalBrl: 50, distanceKm: 1, tipPct }), {
      name: 'RangeError', message: 'Invalid tipPct (allowed: 0, 10, 12)',
    });
  }
});

test('rounds tips up, including an exact half-cent', () => {
  // 35.05 * 10% = 3.505 -> 3.51.
  const halfCent = calc({ itemsSubtotalBrl: 35.05, distanceKm: 1, tipPct: 10 });
  assert.equal(halfCent.tipBrl, 3.51);
  assert.equal(halfCent.totalBrl, 45.56);

  // Coupon leaves 31.55; 31.55 * 12% = 3.786 -> 3.79.
  const oddCent = calc({ itemsSubtotalBrl: 35.06, distanceKm: 1, couponCode: 'DANCHEF10', tipPct: 12 });
  assert.equal(oddCent.netSubtotalBrl, 31.55);
  assert.equal(oddCent.tipBrl, 3.79);
  assert.equal(oddCent.totalBrl, 42.34);
});
