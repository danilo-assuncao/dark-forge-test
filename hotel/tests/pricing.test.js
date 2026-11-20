'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateStayPrice } = require('../pricing.js');

const base = { roomId: 'standard', guests: 2 };

test('low season single night adds 5% ISS', () => {
  const r = calculateStayPrice({ ...base, checkInIso: '2025-03-10', checkOutIso: '2025-03-11' });
  assert.equal(r.nights, 1);
  assert.equal(r.subtotal, 320);
  assert.equal(r.iss, 16);
  assert.equal(r.total, 336);
});

test('high season months (1, 7, 12) multiply the rate by 1.25', () => {
  for (const m of ['01', '07', '12']) {
    const r = calculateStayPrice({ ...base, checkInIso: `2025-${m}-10`, checkOutIso: `2025-${m}-11` });
    assert.equal(r.subtotal, 400);
    assert.equal(r.total, 420);
  }
});

test('stay crossing into high season prices each night by month', () => {
  const r = calculateStayPrice({ ...base, checkInIso: '2025-06-30', checkOutIso: '2025-07-02' });
  assert.deepEqual(r.nightlyRates, [320, 400]);
  assert.equal(r.subtotal, 720);
});

test('>= 5 nights gets 8% long-stay discount, 4 nights does not', () => {
  const four = calculateStayPrice({ ...base, checkInIso: '2025-03-01', checkOutIso: '2025-03-05' });
  assert.equal(four.longStayDiscount, 0);
  assert.equal(four.subtotal, 1280);
  const five = calculateStayPrice({ ...base, checkInIso: '2025-03-01', checkOutIso: '2025-03-06' });
  assert.equal(five.longStayDiscount, 128);
  assert.equal(five.subtotal, 1472);
  assert.equal(five.total, 1545.6);
});

test('DANSTAY10 applies 10% extra on top of long-stay discount', () => {
  const r = calculateStayPrice({ ...base, checkInIso: '2025-03-01', checkOutIso: '2025-03-06', couponCode: 'DANSTAY10' });
  assert.equal(r.couponDiscount, 147.2);
  assert.equal(r.subtotal, 1324.8);
  assert.equal(r.iss, 66.24);
  assert.equal(r.total, 1391.04);
});

test('coupon alone on a short stay; unknown coupon is ignored', () => {
  const ok = calculateStayPrice({ ...base, checkInIso: '2025-03-10', checkOutIso: '2025-03-11', couponCode: 'danstay10' });
  assert.equal(ok.subtotal, 288);
  const bad = calculateStayPrice({ ...base, checkInIso: '2025-03-10', checkOutIso: '2025-03-11', couponCode: 'NOPE' });
  assert.equal(bad.subtotal, 320);
});

test('rounds to 2 decimals', () => {
  const r = calculateStayPrice({ roomId: 'deluxe', guests: 1, checkInIso: '2025-03-10', checkOutIso: '2025-03-11', couponCode: 'DANSTAY10' });
  assert.equal(r.subtotal, 486);
  assert.equal(r.iss, 24.3);
  assert.equal(r.total, 510.3);
});

test('30 nights is allowed, 31 is rejected', () => {
  assert.equal(calculateStayPrice({ ...base, checkInIso: '2025-03-01', checkOutIso: '2025-03-31' }).nights, 30);
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: '2025-03-01', checkOutIso: '2025-04-01' }), RangeError);
});

test('rejects invalid dates and ordering', () => {
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: '2025-03-10', checkOutIso: '2025-03-10' }), RangeError);
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: '2025-03-11', checkOutIso: '2025-03-10' }), RangeError);
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: 'x', checkOutIso: '2025-03-10' }), RangeError);
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: '2025-03-10', checkOutIso: '' }), RangeError);
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: null, checkOutIso: '2025-03-10' }), RangeError);
});

test('rejects unknown room and invalid guests', () => {
  const dates = { checkInIso: '2025-03-10', checkOutIso: '2025-03-11' };
  assert.throws(() => calculateStayPrice({ ...dates, roomId: 'nope', guests: 1 }), RangeError);
  assert.throws(() => calculateStayPrice({ ...dates, roomId: 'standard', guests: 0 }), RangeError);
  assert.throws(() => calculateStayPrice({ ...dates, roomId: 'standard', guests: 3 }), RangeError);
  assert.throws(() => calculateStayPrice({ ...dates, roomId: 'standard', guests: 1.5 }), RangeError);
  assert.throws(() => calculateStayPrice({ ...dates, roomId: 'standard', guests: '2' }), RangeError);
  assert.doesNotThrow(() => calculateStayPrice({ ...dates, roomId: 'family', guests: 4 }));
  assert.throws(() => calculateStayPrice(), RangeError);
});
