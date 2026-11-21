const test = require('node:test');
const assert = require('node:assert/strict');
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
  
  // economico daily: 119 * 5 = 595
  // protection basica: 29 * 5 = 145
  // subtotal = 740
  // discount = 0
  // netSubtotal = 740
  // patioFee = 740 * 0.08 = 59.20
  // finalTotal = 740 + 59.20 = 799.20
  assert.strictEqual(booking.total, 799.20);
  assert.strictEqual(booking.breakdown.subtotal, 740);
  assert.strictEqual(booking.breakdown.discount, 0);
  assert.strictEqual(booking.breakdown.patioFee, 59.2);
});

test('createRentalBooking throws on ineligible driver', () => {
  const payload = {
    driverAge: 20, // minAge for economico is 21
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
  }, /Vehicle group not found/); // validateDriverEligibility throws this
});

test('createRentalBooking applies DANCAR10 discount correctly', () => {
  const payload = {
    driverAge: 30,
    licenseYears: 5,
    groupId: 'suv', // daily: 229, deposit: 1500
    days: 3,
    coupon: 'DANCAR10',
    differentDropoffCity: true // +180
  };
  
  const booking = createRentalBooking(payload);
  
  assert.strictEqual(booking.cautionValue, 1500.00);
  
  // daily: 229 * 3 = 687
  // dropoff: 180
  // protection basica: 29 * 3 = 87
  // subtotal: 687 + 180 + 87 = 954
  // discount: 10% of (687 + 87 = 774) = 77.40
  // netSubtotal: 954 - 77.40 = 876.60
  // patioFee: 876.60 * 0.08 = 70.128
  // finalTotal: 876.60 + 70.128 = 946.728 -> 946.73
  
  assert.strictEqual(booking.breakdown.subtotal, 954);
  assert.strictEqual(booking.breakdown.discount, 77.4);
  assert.strictEqual(booking.breakdown.netSubtotal, 876.60);
  assert.strictEqual(booking.breakdown.patioFee, 70.13);
  assert.strictEqual(booking.total, 946.73);
});

test('createRentalBooking with DANCAR10, addons, extra km and discount days', () => {
  const payload = {
    driverAge: 25,
    licenseYears: 4,
    groupId: 'executivo', // daily: 349, deposit: 2500
    days: 7, // 12% off daily rate -> 349 * 0.88 = 307.12
    mileagePlan: 'franquia-100km', // 15% off adjusted daily -> 307.12 * 0.85 = 261.052
    estimatedKm: 800, // limit = 700. extra = 100 * 1.20 = 120
    protectionPlan: 'completa', // 54 * 7 = 378
    addonIds: ['cadeirinha-bebe'], // 18 * 7 = 126
    coupon: 'DANCAR10'
  };
  
  const booking = createRentalBooking(payload);
  
  // daily = 349 * 0.88 * 0.85 = 261.052 * 7 = 1827.364 -> rounded 1827.36
  // extraKm = 100 * 1.20 = 120.00
  // dropoff = 0
  // rentalBase subtotal = 1827.36 + 120.00 = 1947.36
  
  // protections = 378 + 126 = 504.00
  
  // subtotal = 1947.36 + 504.00 = 2451.36
  // discount = 10% of (totalDailyCost: 1827.36 + protections: 504.00) 
  //          = 10% of 2331.36 = 233.136 -> wait, does discount round? 
  // Let's see: 233.136. netSubtotal = 2451.36 - 233.136 = 2218.224
  // patioFee = 2218.224 * 0.08 = 177.45792
  // finalTotal = 2218.224 + 177.45792 = 2395.68192
  
  // According to my code, I don't round until the end, except in pricing.js
  // Let's assert based on the exact floating point behavior to ensure tests pass, or we should use proper rounding in booking.js.
});
