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

test('ISS half-cent tie rounds up and breakdown lines reconcile', () => {
  const r = calculateStayPrice({ roomId: 'deluxe', guests: 1, checkInIso: '2025-06-30', checkOutIso: '2025-07-02', couponCode: 'DANSTAY10' });
  assert.equal(r.baseTotal, 1215);
  assert.equal(r.subtotal, 1093.5);
  assert.equal(r.iss, 54.68);
  assert.equal(r.total, 1148.18);
  const cents = (n) => Math.round(n * 100);
  assert.equal(cents(r.baseTotal) - cents(r.longStayDiscount) - cents(r.couponDiscount), cents(r.subtotal));
});

test('baseTotal and couponDiscount on a short coupon stay', () => {
  const r = calculateStayPrice({ ...base, checkInIso: '2025-03-10', checkOutIso: '2025-03-11', couponCode: 'DANSTAY10' });
  assert.equal(r.baseTotal, 320);
  assert.equal(r.couponDiscount, 32);
  assert.equal(r.longStayDiscount, 0);
});

test('month is decided in UTC even with a non-UTC offset', () => {
  const into = calculateStayPrice({ ...base, checkInIso: '2025-06-30T22:00:00-03:00', checkOutIso: '2025-07-02T00:00:00Z' });
  assert.equal(into.nights, 1);
  assert.deepEqual(into.nightlyRates, [400]);
  assert.equal(into.subtotal, 400);
  const out = calculateStayPrice({ ...base, checkInIso: '2025-07-01T00:30:00+02:00', checkOutIso: '2025-07-02T00:00:00Z' });
  assert.equal(out.nights, 2);
  assert.deepEqual(out.nightlyRates, [320, 400]);
});

test('accepts fractional seconds', () => {
  assert.equal(calculateStayPrice({ ...base, checkInIso: '2025-03-10T10:00:00.500Z', checkOutIso: '2025-03-11T10:00:00.250Z' }).nights, 1);
});

test('rounding of fractional cents (ISS and totals)', () => {
  const p = calculateStayPrice({ roomId: 'presidential', guests: 1, checkInIso: '2025-01-10', checkOutIso: '2025-01-11', couponCode: 'DANSTAY10' });
  assert.equal(p.subtotal, 1406.25);
  assert.equal(p.iss, 70.31);
  assert.equal(p.total, 1476.56);
  const s = calculateStayPrice({ ...base, checkInIso: '2025-06-28', checkOutIso: '2025-07-04', couponCode: 'DANSTAY10' });
  assert.equal(s.nights, 6);
  assert.deepEqual(s.nightlyRates, [320, 320, 320, 400, 400, 400]);
  assert.equal(s.subtotal, 1788.48);
  assert.equal(s.iss, 89.42);
  assert.equal(s.total, 1877.9);
});

test('year boundary, month edges and result fields', () => {
  const y = calculateStayPrice({ ...base, checkInIso: '2025-12-29', checkOutIso: '2026-01-03' });
  assert.equal(y.nights, 5);
  assert.equal(y.roomId, 'standard');
  assert.equal(y.guests, 2);
  assert.equal(y.subtotal, 1840);
  assert.equal(y.total, 1932);
  const n = calculateStayPrice({ ...base, checkInIso: '2025-11-30', checkOutIso: '2025-12-02' });
  assert.deepEqual(n.nightlyRates, [320, 400]);
  const j = calculateStayPrice({ ...base, checkInIso: '2025-01-31', checkOutIso: '2025-02-02' });
  assert.deepEqual(j.nightlyRates, [400, 320]);
  assert.throws(() => calculateStayPrice({ guests: 1, checkInIso: '2025-03-10', checkOutIso: '2025-03-11' }), RangeError);
});

test('datetime inputs count UTC calendar-date nights', () => {
  const std = calculateStayPrice({ ...base, checkInIso: '2025-03-10T15:00:00Z', checkOutIso: '2025-03-11T11:00:00Z' });
  assert.equal(std.nights, 1);
  assert.deepEqual(std.nightlyRates, [320]);
  assert.equal(calculateStayPrice({ ...base, checkInIso: '2025-03-10T23:00Z', checkOutIso: '2025-03-11T01:00Z' }).nights, 1);
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: '2025-03-10T08:00Z', checkOutIso: '2025-03-10T20:00Z' }), RangeError);
  // -03:00 offset: 22:00 local on 03-10 is 01:00Z on 03-11.
  const off = calculateStayPrice({ ...base, checkInIso: '2025-03-10T22:00:00-03:00', checkOutIso: '2025-03-12T10:00:00Z' });
  assert.equal(off.nights, 1);
});

test('rejects non-strict and impossible dates', () => {
  for (const bad of ['2025-02-30', '2025', '2025-3-10', 'March 10 2025', '2025-03-10T15:00', '2025-03-10T25:00Z', '2025-03-10T10:60Z', '2025-03-10T10:00:60Z', '2025-03-10T24:00Z', '2025-03-10T10:00+25:00', '2025-03-10T10:00+99:99']) {
    assert.throws(() => calculateStayPrice({ ...base, checkInIso: bad, checkOutIso: '2025-04-10' }), RangeError, bad);
  }
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: '2025-04-01', checkOutIso: '2025-04-10T12:60Z' }), RangeError);
  assert.equal(calculateStayPrice({ ...base, checkInIso: '2024-02-28', checkOutIso: '2024-03-01' }).nights, 2);
  assert.throws(() => calculateStayPrice({ ...base, checkInIso: '2025-02-28', checkOutIso: '2025-02-29' }), RangeError);
});

test('coupon input handling', () => {
  const d = { ...base, checkInIso: '2025-03-10', checkOutIso: '2025-03-11' };
  assert.throws(() => calculateStayPrice({ ...d, couponCode: 123 }), TypeError);
  for (const c of [null, undefined, '', '   ', 'constructor', '__proto__', 'toString']) {
    assert.equal(calculateStayPrice({ ...d, couponCode: c }).subtotal, 320);
  }
  assert.equal(calculateStayPrice({ ...d, couponCode: ' danstay10 ' }).subtotal, 288);
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
  assert.throws(() => calculateStayPrice({ ...dates, roomId: 'standard', guests: NaN }), RangeError);
  assert.throws(() => calculateStayPrice({ ...dates, roomId: 'standard', guests: Infinity }), RangeError);
  assert.throws(() => calculateStayPrice({ ...dates, roomId: 'standard', guests: '2' }), RangeError);
  assert.doesNotThrow(() => calculateStayPrice({ ...dates, roomId: 'family', guests: 4 }));
  assert.throws(() => calculateStayPrice(), RangeError);
});
