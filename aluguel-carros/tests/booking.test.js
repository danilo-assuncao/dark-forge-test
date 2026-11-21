const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { createRentalBooking } = require('../booking.js');

test('createRentalBooking creates a successful booking with default options', () => {
  const payload = {
    driverAge: 25,
    licenseYears: 3,
    groupId: 'economico',
    days: 5
  };
  
  const booking = createRentalBooking(payload);
  
  assert.match(booking.contractId, /^CAR-[A-Z0-9]{4}$/);
  assert.strictEqual(booking.cautionValue, 800.00);
  
  assert.strictEqual(booking.total, 799.20);
  assert.strictEqual(booking.breakdown.subtotal, 740);
  assert.strictEqual(booking.breakdown.discount, 0);
  assert.strictEqual(booking.breakdown.patioFee, 59.2);
  assert.strictEqual(booking.breakdown.couponApplied, false);
});

test('createRentalBooking throws on ineligible driver', () => {
  const payload = {
    driverAge: 20,
    licenseYears: 3,
    groupId: 'economico',
    days: 5
  };
  
  assert.throws(() => {
    createRentalBooking(payload);
  }, /Driver not eligible/);
});

test('createRentalBooking throws on invalid group', () => {
  const payload = {
    driverAge: 25,
    licenseYears: 3,
    groupId: 'unknown_group',
    days: 5
  };
  
  assert.throws(() => {
    createRentalBooking(payload);
  }, /Vehicle group not found/);
});

test('createRentalBooking applies DANCAR10 discount correctly with rounding', () => {
  const payload = {
    driverAge: 30,
    licenseYears: 5,
    groupId: 'suv',
    days: 3,
    coupon: 'DANCAR10',
    differentDropoffCity: true
  };
  
  const booking = createRentalBooking(payload);
  
  assert.strictEqual(booking.cautionValue, 1500.00);
  
  // daily: 229 * 3 = 687
  // dropoff: 180
  // protection basica: 29 * 3 = 87
  // subtotal: 687 + 180 + 87 = 954
  // discount: 10% of (687 + 87 = 774) = 77.40
  // netSubtotal: 954 - 77.40 = 876.60
  // patioFee: 876.60 * 0.08 = 70.128 -> 70.13
  // finalTotal: 876.60 + 70.13 = 946.73
  
  assert.strictEqual(booking.breakdown.subtotal, 954);
  assert.strictEqual(booking.breakdown.discount, 77.4);
  assert.strictEqual(booking.breakdown.netSubtotal, 876.60);
  assert.strictEqual(booking.breakdown.patioFee, 70.13);
  assert.strictEqual(booking.breakdown.couponApplied, true);
  assert.strictEqual(booking.total, 946.73);
});

test('createRentalBooking with DANCAR10, addons, extra km and discount days', () => {
  const payload = {
    driverAge: 25,
    licenseYears: 4,
    groupId: 'executivo',
    days: 7, 
    mileagePlan: 'franquia-100km',
    estimatedKm: 800,
    protectionPlan: 'completa',
    addonIds: ['cadeirinha-bebe'],
    coupon: 'DANCAR10'
  };
  
  const booking = createRentalBooking(payload);
  
  // calculations:
  // daily = 349 * 0.88 * 0.85 = 261.052 * 7 = 1827.364 -> rounded 1827.36
  // extraKm = 100 * 1.20 = 120.00
  // dropoff = 0
  // rentalBase breakdown = { totalDailyCost: 1827.36, extraKmCost: 120.00, dropoffFee: 0 }
  // protections = 54 * 7 = 378
  // addons = 18 * 7 = 126
  // protectionTotal = 504.00
  
  // subtotal = 1827.36 + 120.00 + 0 + 504.00 = 2451.36
  // discount = 10% of (1827.36 + 504.00 = 2331.36) = 233.136 -> rounded to 233.14
  // netSubtotal = 2451.36 - 233.14 = 2218.22
  // patioFee = 2218.22 * 0.08 = 177.4576 -> rounded to 177.46
  // finalTotal = 2218.22 + 177.46 = 2395.68
  
  assert.strictEqual(booking.cautionValue, 2500);
  assert.strictEqual(booking.breakdown.subtotal, 2451.36);
  assert.strictEqual(booking.breakdown.discount, 233.14);
  assert.strictEqual(booking.breakdown.netSubtotal, 2218.22);
  assert.strictEqual(booking.breakdown.patioFee, 177.46);
  assert.strictEqual(booking.breakdown.couponApplied, true);
  assert.strictEqual(booking.total, 2395.68);
});

test('createRentalBooking ignores unknown or improperly cased coupons but works with trimmed/cased valid ones', () => {
  // Test valid cased coupon
  let booking = createRentalBooking({
    driverAge: 25, licenseYears: 3, groupId: 'economico', days: 5, coupon: ' dAncAr10 '
  });
  assert.strictEqual(booking.breakdown.couponApplied, true);
  assert.ok(booking.breakdown.discount > 0);

  // Test unknown coupon
  booking = createRentalBooking({
    driverAge: 25, licenseYears: 3, groupId: 'economico', days: 5, coupon: 'INVALID'
  });
  assert.strictEqual(booking.breakdown.couponApplied, false);
  assert.strictEqual(booking.breakdown.discount, 0);
  
  // Test invalid type for coupon
  booking = createRentalBooking({
    driverAge: 25, licenseYears: 3, groupId: 'economico', days: 5, coupon: 123
  });
  assert.strictEqual(booking.breakdown.couponApplied, false);
});

test('createRentalBooking handles missing payload or missing days/invalid plans by throwing errors', () => {
  assert.throws(() => createRentalBooking(), /Vehicle group not found/);
  
  assert.throws(() => createRentalBooking({
    driverAge: 25, licenseYears: 3, groupId: 'economico'
    // missing days
  }), /Days must be a positive integer|invalid days/i);
  
  assert.throws(() => createRentalBooking({
    driverAge: 25, licenseYears: 3, groupId: 'economico', days: -1
  }), /Days must be a positive integer|invalid days/i);
  
  assert.throws(() => createRentalBooking({
    driverAge: 25, licenseYears: 3, groupId: 'economico', days: 5, mileagePlan: 'unknown_plan'
  }), /Invalid mileage plan/i);
  
  assert.throws(() => createRentalBooking({
    driverAge: 25, licenseYears: 3, groupId: 'economico', days: 5, protectionPlan: 'unknown_plan'
  }), /invalid protection plan/i);
});

test('createRentalBooking boundary tests for eligibility', () => {
  // minAge for economico is 21, license 2 years
  
  // Age exact match
  assert.doesNotThrow(() => createRentalBooking({
    driverAge: 21, licenseYears: 2, groupId: 'economico', days: 5
  }));
  
  // License years exact match
  assert.throws(() => createRentalBooking({
    driverAge: 25, licenseYears: 1, groupId: 'economico', days: 5
  }), /Driver not eligible/);
});

test('createRentalBooking generates deterministic contract IDs', (t) => {
  t.mock.method(crypto, 'randomBytes', () => Buffer.from([0x00, 0x00]));
  let booking = createRentalBooking({ driverAge: 25, licenseYears: 3, groupId: 'economico', days: 5 });
  assert.strictEqual(booking.contractId, 'CAR-0000');
  
  t.mock.method(crypto, 'randomBytes', () => Buffer.from([0xFF, 0xFF]));
  booking = createRentalBooking({ driverAge: 25, licenseYears: 3, groupId: 'economico', days: 5 });
  assert.strictEqual(booking.contractId, 'CAR-FFFF');
});
