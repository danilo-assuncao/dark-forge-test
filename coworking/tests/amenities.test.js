const { test } = require('node:test');
const assert = require('node:assert/strict');
const { listAmenities, calculateWorkspaceOrder } = require('../amenities');

test('listAmenities', () => {
  const amenities = listAmenities();
  assert.equal(amenities.length, 4);
  assert.ok(amenities.find(a => a.id === 'coffee-break' && a.price === 28 && a.type === 'per_attendee'));
  assert.ok(amenities.find(a => a.id === 'kit-video-4k' && a.price === 75 && a.type === 'fixed'));
  assert.ok(amenities.find(a => a.id === 'pack-impressao-50' && a.price === 30 && a.type === 'fixed'));
  assert.ok(amenities.find(a => a.id === 'locker-diario' && a.price === 15 && a.type === 'fixed'));
});

test('calculateWorkspaceOrder without amenities and coupon', () => {
  const result = calculateWorkspaceOrder({ slotSubtotalBrl: 100, amenityIds: [], attendees: 1, couponCode: '' });
  assert.deepEqual(result, {
    slotSubtotalBrl: 100,
    amenitiesSubtotal: 0,
    subtotal: 100,
    discount: 0,
    total: 100
  });
});

test('calculateWorkspaceOrder with coffee-break and 2 attendees', () => {
  const result = calculateWorkspaceOrder({ slotSubtotalBrl: 100, amenityIds: ['coffee-break'], attendees: 2 });
  assert.deepEqual(result, {
    slotSubtotalBrl: 100,
    amenitiesSubtotal: 56, // 28 * 2
    subtotal: 156,
    discount: 0,
    total: 156
  });
});

test('calculateWorkspaceOrder with mixed amenities, unknown are ignored', () => {
  const result = calculateWorkspaceOrder({ slotSubtotalBrl: 100, amenityIds: ['coffee-break', 'kit-video-4k', 'invalid-amenity', 'constructor'], attendees: 3 });
  assert.deepEqual(result, {
    slotSubtotalBrl: 100,
    amenitiesSubtotal: 159, // (28 * 3) + 75
    subtotal: 259,
    discount: 0,
    total: 259
  });
});

test('calculateWorkspaceOrder with coupon DANHUB15 (case/whitespace insensitive)', () => {
  const result = calculateWorkspaceOrder({ slotSubtotalBrl: 100, amenityIds: ['locker-diario'], attendees: 1, couponCode: '  danHub15  ' });
  assert.deepEqual(result, {
    slotSubtotalBrl: 100,
    amenitiesSubtotal: 15,
    subtotal: 115,
    discount: 17.25,
    total: 97.75
  });
});

test('calculateWorkspaceOrder with invalid coupon', () => {
  const result = calculateWorkspaceOrder({ slotSubtotalBrl: 100, amenityIds: [], attendees: 1, couponCode: 'INVALID' });
  assert.deepEqual(result, {
    slotSubtotalBrl: 100,
    amenitiesSubtotal: 0,
    subtotal: 100,
    discount: 0,
    total: 100
  });
});

test('calculateWorkspaceOrder deducts exact cents for fractional rounding', () => {
  const result = calculateWorkspaceOrder({ slotSubtotalBrl: 33.33, amenityIds: [], attendees: 1, couponCode: 'DANHUB15' });
  // 33.33 * 0.15 = 4.9995 -> rounds to 5.00
  // total = 33.33 - 5.00 = 28.33
  assert.deepEqual(result, {
    slotSubtotalBrl: 33.33,
    amenitiesSubtotal: 0,
    subtotal: 33.33,
    discount: 5.00,
    total: 28.33
  });
});

test('calculateWorkspaceOrder deduplicates amenity IDs', () => {
  const result = calculateWorkspaceOrder({ slotSubtotalBrl: 100, amenityIds: ['kit-video-4k', 'kit-video-4k'], attendees: 1 });
  assert.deepEqual(result, {
    slotSubtotalBrl: 100,
    amenitiesSubtotal: 75,
    subtotal: 175,
    discount: 0,
    total: 175
  });
});

test('calculateWorkspaceOrder throws on invalid inputs', () => {
  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: -1 }), TypeError);
  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: NaN }), TypeError);
  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: '100' }), TypeError);

  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: 100, attendees: 0 }), TypeError);
  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: 100, attendees: -5 }), TypeError);
  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: 100, attendees: 1.5 }), TypeError);
  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: 100, attendees: '2' }), TypeError);

  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: 100, amenityIds: 'coffee-break' }), TypeError);
  assert.throws(() => calculateWorkspaceOrder({ slotSubtotalBrl: 100, amenityIds: null }), TypeError);
});

test('calculateWorkspaceOrder with zero subtotal and DANHUB15', () => {
  const result = calculateWorkspaceOrder({ slotSubtotalBrl: 0, amenityIds: [], attendees: 1, couponCode: 'DANHUB15' });
  assert.deepEqual(result, {
    slotSubtotalBrl: 0,
    amenitiesSubtotal: 0,
    subtotal: 0,
    discount: 0,
    total: 0
  });
});
