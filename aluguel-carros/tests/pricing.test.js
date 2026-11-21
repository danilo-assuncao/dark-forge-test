const test = require('node:test');
const assert = require('node:assert');
const { calculateRentalBase } = require('../pricing.js');

test('calculateRentalBase with km-livre (no discounts, same city)', () => {
  // economico dailyRateBrl = 119.00
  const result = calculateRentalBase({
    groupId: 'economico',
    days: 3,
    mileagePlan: 'km-livre',
    estimatedKm: 1000, // doesn't matter for km-livre
    differentDropoffCity: false
  });
  
  assert.strictEqual(result.total, 357.00); // 119 * 3
  assert.strictEqual(result.breakdown.totalDailyCost, 357.00);
  assert.strictEqual(result.breakdown.extraKmCost, 0);
  assert.strictEqual(result.breakdown.dropoffFee, 0);
});

test('calculateRentalBase with franquia-100km (no extra km, same city)', () => {
  // suv dailyRateBrl = 229.00
  // discounted dailyRate = 229 * 0.85 = 194.65
  // total daily = 194.65 * 2 = 389.30
  const result = calculateRentalBase({
    groupId: 'suv',
    days: 2,
    mileagePlan: 'franquia-100km',
    estimatedKm: 150, // 200 is the limit
    differentDropoffCity: false
  });
  
  assert.strictEqual(result.total, 389.30);
  assert.strictEqual(result.breakdown.totalDailyCost, 389.30);
  assert.strictEqual(result.breakdown.extraKmCost, 0);
  assert.strictEqual(result.breakdown.dropoffFee, 0);
});

test('calculateRentalBase with franquia-100km (with extra km, same city)', () => {
  // executivo dailyRateBrl = 349.00
  // discounted dailyRate = 349 * 0.85 = 296.65
  // total daily = 296.65 * 4 = 1186.60
  // limit km = 400. estimated = 500. extra = 100.
  // extra cost = 100 * 1.20 = 120.00
  // total = 1186.60 + 120.00 = 1306.60
  const result = calculateRentalBase({
    groupId: 'executivo',
    days: 4,
    mileagePlan: 'franquia-100km',
    estimatedKm: 500,
    differentDropoffCity: false
  });
  
  assert.strictEqual(result.total, 1306.60);
  assert.strictEqual(result.breakdown.totalDailyCost, 1186.60);
  assert.strictEqual(result.breakdown.extraKmCost, 120.00);
  assert.strictEqual(result.breakdown.dropoffFee, 0);
});

test('calculateRentalBase with km-livre and >= 7 days discount', () => {
  // economico dailyRateBrl = 119.00
  // total daily before discount = 119 * 10 = 1190.00
  // total daily after 12% discount = 1190 * 0.88 = 1047.20
  const result = calculateRentalBase({
    groupId: 'economico',
    days: 10,
    mileagePlan: 'km-livre',
    differentDropoffCity: false
  });
  
  assert.strictEqual(result.total, 1047.20);
  assert.strictEqual(result.breakdown.totalDailyCost, 1047.20);
});

test('calculateRentalBase with franquia-100km, >= 7 days discount, extra km, and different city', () => {
  // eletrico dailyRateBrl = 289.00
  // franquia discount: 289 * 0.85 = 245.65
  // days = 8
  // base daily total = 245.65 * 8 = 1965.20
  // 7+ days discount: 1965.20 * 0.88 = 1729.376 => 1729.38
  // limit km = 800. estimated = 850. extra = 50.
  // extra cost = 50 * 1.20 = 60.00
  // dropoff fee = 180.00
  // total = 1729.38 + 60.00 + 180.00 = 1969.38
  const result = calculateRentalBase({
    groupId: 'eletrico',
    days: 8,
    mileagePlan: 'franquia-100km',
    estimatedKm: 850,
    differentDropoffCity: true
  });
  
  // Checking rounding might be tricky, let's look at the numbers.
  // 1965.20 * 0.88 = 1729.376
  assert.strictEqual(result.total, 1969.38);
  assert.strictEqual(result.breakdown.totalDailyCost, 1729.38);
  assert.strictEqual(result.breakdown.extraKmCost, 60.00);
  assert.strictEqual(result.breakdown.dropoffFee, 180.00);
});

test('calculateRentalBase throws on invalid vehicle group', () => {
  assert.throws(() => {
    calculateRentalBase({
      groupId: 'invalid-group',
      days: 3
    });
  }, /Invalid or missing vehicle group/);
});

test('calculateRentalBase throws on invalid days', () => {
  assert.throws(() => {
    calculateRentalBase({
      groupId: 'economico',
      days: -1
    });
  }, /Days must be a positive integer/);
});

test('calculateRentalBase throws on invalid mileage plan', () => {
  assert.throws(() => {
    calculateRentalBase({
      groupId: 'economico',
      days: 3,
      mileagePlan: 'invalid-plan'
    });
  }, /Invalid mileage plan/);
});
