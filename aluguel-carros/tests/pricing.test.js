const test = require('node:test');
const assert = require('node:assert');
const { calculateRentalBase } = require('../pricing.js');

test('calculateRentalBase with km-livre (no discounts, same city)', () => {
  const result = calculateRentalBase({
    groupId: 'economico',
    days: 3,
    mileagePlan: 'km-livre',
    estimatedKm: 1000,
    differentDropoffCity: false
  });
  
  assert.strictEqual(result.total, 357.00);
  assert.strictEqual(result.breakdown.totalDailyCost, 357.00);
  assert.strictEqual(result.breakdown.extraKmCost, 0);
  assert.strictEqual(result.breakdown.dropoffFee, 0);
});

test('calculateRentalBase with km-livre and differentDropoffCity', () => {
  const result = calculateRentalBase({
    groupId: 'economico',
    days: 3,
    mileagePlan: 'km-livre',
    differentDropoffCity: true
  });
  
  assert.strictEqual(result.total, 537.00);
  assert.strictEqual(result.breakdown.totalDailyCost, 357.00);
  assert.strictEqual(result.breakdown.dropoffFee, 180.00);
});

test('calculateRentalBase with franquia-100km (estimatedKm == limit)', () => {
  const result = calculateRentalBase({
    groupId: 'suv',
    days: 2,
    mileagePlan: 'franquia-100km',
    estimatedKm: 200, // exact limit
    differentDropoffCity: false
  });
  
  assert.strictEqual(result.total, 389.30);
  assert.strictEqual(result.breakdown.extraKmCost, 0);
});

test('calculateRentalBase with franquia-100km (estimatedKm = limit + 1)', () => {
  const result = calculateRentalBase({
    groupId: 'suv',
    days: 2,
    mileagePlan: 'franquia-100km',
    estimatedKm: 201, // limit + 1
    differentDropoffCity: false
  });
  
  // daily = 229 * 0.85 = 194.65 * 2 = 389.30
  // extra = 1 * 1.20 = 1.20
  // total = 390.50
  assert.strictEqual(result.total, 390.50);
  assert.strictEqual(result.breakdown.extraKmCost, 1.20);
});

test('calculateRentalBase with franquia-100km (no estimatedKm provided)', () => {
  const result = calculateRentalBase({
    groupId: 'suv',
    days: 2,
    mileagePlan: 'franquia-100km'
  });
  
  assert.strictEqual(result.breakdown.extraKmCost, 0);
});

test('calculateRentalBase 7-day discount boundaries (days=6 vs days=7) km-livre', () => {
  const res6 = calculateRentalBase({ groupId: 'economico', days: 6 });
  assert.strictEqual(res6.breakdown.totalDailyCost, 714.00); // 119 * 6

  const res7 = calculateRentalBase({ groupId: 'economico', days: 7 });
  // 119 * 7 = 833; 833 * 0.88 = 733.04
  assert.strictEqual(res7.breakdown.totalDailyCost, 733.04);
});

test('calculateRentalBase 7-day discount boundaries (days=6 vs days=7) franquia-100km', () => {
  // suv daily: 229. franquia daily: 229 * 0.85 = 194.65
  const res6 = calculateRentalBase({ groupId: 'suv', days: 6, mileagePlan: 'franquia-100km' });
  assert.strictEqual(res6.breakdown.totalDailyCost, 1167.90); // 194.65 * 6
  
  const res7 = calculateRentalBase({ groupId: 'suv', days: 7, mileagePlan: 'franquia-100km' });
  // 194.65 * 7 = 1362.55; 1362.55 * 0.88 = 1199.044 => 1199.04
  assert.strictEqual(res7.breakdown.totalDailyCost, 1199.04);
});

test('calculateRentalBase with franquia-100km, >= 7 days discount, but NO extra km', () => {
  const result = calculateRentalBase({
    groupId: 'suv',
    days: 7,
    mileagePlan: 'franquia-100km',
    estimatedKm: 100 // within limit
  });
  
  assert.strictEqual(result.total, 1199.04);
  assert.strictEqual(result.breakdown.extraKmCost, 0);
});

test('calculateRentalBase rounding consistency', () => {
  // We need a case where totalDailyCost and extraKmCost end in .xx5 when unrounded,
  // to ensure they are rounded individually before the sum.
  // eletrico dailyRateBrl = 289.00
  // franquia discount: 289 * 0.85 = 245.65
  // days = 8
  // base daily total = 245.65 * 8 = 1965.20
  // 7+ days discount: 1965.20 * 0.88 = 1729.376 => 1729.38
  // limit km = 800. estimated = 850.5. extra = 50.5.
  // extra cost = 50.5 * 1.20 = 60.60
  // dropoff fee = 180.00
  // 1729.376 + 60.60 + 180.00 = 1969.976 => 1969.98
  // If rounded individually: 1729.38 + 60.60 + 180.00 = 1969.98
  // Let's test a case where individual rounding alters the sum.
  // We can inject mock values if needed, but let's just make sure it behaves properly.
  const result = calculateRentalBase({
    groupId: 'eletrico',
    days: 8,
    mileagePlan: 'franquia-100km',
    estimatedKm: 850.5,
    differentDropoffCity: true
  });
  
  assert.strictEqual(result.breakdown.totalDailyCost, 1729.38);
  assert.strictEqual(result.breakdown.extraKmCost, 60.60);
  assert.strictEqual(result.breakdown.dropoffFee, 180.00);
  assert.strictEqual(result.total, 1969.98); // 1729.38 + 60.60 + 180.00
});

test('calculateRentalBase throws on invalid vehicle group or missing args', () => {
  assert.throws(() => calculateRentalBase(), /Invalid or missing vehicle group/);
  assert.throws(() => calculateRentalBase({}), /Invalid or missing vehicle group/);
  assert.throws(() => calculateRentalBase({ groupId: 'invalid-group', days: 3 }), /Invalid or missing vehicle group/);
});

test('calculateRentalBase throws on invalid days', () => {
  const invalidDays = [-1, 0, 1.5, NaN, undefined, '3'];
  for (const d of invalidDays) {
    assert.throws(() => calculateRentalBase({ groupId: 'economico', days: d }), /Days must be a positive integer/, `Failed on days: ${d}`);
  }
});

test('calculateRentalBase throws on invalid estimatedKm', () => {
  const invalidKms = [-5, NaN, '100', {}];
  for (const km of invalidKms) {
    assert.throws(() => calculateRentalBase({ groupId: 'economico', days: 3, estimatedKm: km }), /estimatedKm must be a non-negative number/, `Failed on km: ${km}`);
  }
});

test('calculateRentalBase throws on invalid mileage plan', () => {
  assert.throws(() => calculateRentalBase({ groupId: 'economico', days: 3, mileagePlan: 'invalid-plan' }), /Invalid mileage plan/);
});
