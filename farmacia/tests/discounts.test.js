const test = require('node:test');
const assert = require('node:assert/strict');
const { calculatePharmacyPricing } = require('../discounts.js');

test('calculatePharmacyPricing', async (t) => {
  await t.test('calculates correctly without discounts', () => {
    const result = calculatePharmacyPricing({
      items: [{ id: 'p1', qty: 2 }] // p1 is 22.50 -> 45
    });
    assert.equal(result.originalTotal, 45);
    assert.equal(result.lineDiscountsTotal, 0);
    assert.equal(result.subtotalAfterLines, 45);
    assert.equal(result.globalDiscount, 0);
    assert.equal(result.finalPrice, 45);
  });

  await t.test('applies 15% discount for 3+ items on the same line', () => {
    const result = calculatePharmacyPricing({
      items: [{ id: 'p1', qty: 3 }] // p1: 22.50 * 3 = 67.50
    });
    assert.equal(result.originalTotal, 67.50);
    assert.equal(result.lineDiscountsTotal, 10.13); 
    assert.equal(result.subtotalAfterLines, 57.37);
    assert.equal(result.globalDiscount, 0);
    assert.equal(result.finalPrice, 57.37);
  });

  await t.test('applies 12% global discount for assinatura', () => {
    const result = calculatePharmacyPricing({
      items: [{ id: 'p1', qty: 2 }],
      purchaseMode: 'assinatura'
    });
    assert.equal(result.globalDiscount, 5.40);
    assert.equal(result.finalPrice, 39.60);
  });

  await t.test('applies 12% global discount for assinatura combining with line discounts', () => {
    const result = calculatePharmacyPricing({
      items: [{ id: 'p1', qty: 3 }],
      purchaseMode: 'assinatura'
    });
    // subtotalAfterLines: 67.50 - 10.13 = 57.38
    // globalDiscount: 57.38 * 0.12 = 6.89
    // finalPrice: 57.38 - 6.89 = 50.49
    assert.equal(result.subtotalAfterLines, 57.37);
    assert.equal(result.globalDiscount, 6.88);
    assert.equal(result.finalPrice, 50.49);
  });

  await t.test('applies 10% global discount for DANFARMA10 on avulsa mode', () => {
    const result = calculatePharmacyPricing({
      items: [{ id: 'p1', qty: 2 }],
      purchaseMode: 'avulsa',
      couponCode: 'DANFARMA10'
    });
    // 45 * 0.10 = 4.5
    assert.equal(result.globalDiscount, 4.50);
    assert.equal(result.finalPrice, 40.50);
  });

  await t.test('coupon DANFARMA10 does not apply if mode is assinatura', () => {
    const result = calculatePharmacyPricing({
      items: [{ id: 'p1', qty: 2 }],
      purchaseMode: 'assinatura',
      couponCode: 'DANFARMA10'
    });
    // 45 * 0.12 = 5.40 (12% of assinatura wins over 10% coupon)
    assert.equal(result.globalDiscount, 5.40);
    assert.equal(result.finalPrice, 39.60);
  });

  await t.test('throws error for unknown products', () => {
    assert.throws(() => calculatePharmacyPricing({
      items: [
        { id: 'invalid-id', qty: 1 }
      ]
    }), /Product not found/);
  });

  await t.test('handles missing qty (defaults to 1)', () => {
    const result = calculatePharmacyPricing({
      items: [{ id: 'p1' }] // qty defaults to 1 -> 22.50
    });
    assert.equal(result.originalTotal, 22.50);
    assert.equal(result.finalPrice, 22.50);
  });

  await t.test('throws error for invalid purchaseMode', () => {
    assert.throws(() => calculatePharmacyPricing({ items: [{ id: 'p1', qty: 1 }], purchaseMode: 'assinature' }), /Invalid purchaseMode/);
  });

  await t.test('normalizes coupon string ignoring case and whitespace', () => {
    const result = calculatePharmacyPricing({
      items: [{ id: 'p1', qty: 2 }],
      purchaseMode: 'avulsa',
      couponCode: ' danfarma10 '
    });
    assert.equal(result.globalDiscount, 4.50);
    assert.equal(result.finalPrice, 40.50);
  });

  await t.test('throws error for invalid quantities', () => {
    const invalidQuantities = [0, -1, 100, 2.5, '3', NaN];
    for (const qty of invalidQuantities) {
      assert.throws(() => calculatePharmacyPricing({ items: [{ id: 'p1', qty }] }), /Invalid quantity/);
    }
  });

  await t.test('throws error for invalid item', () => {
    assert.throws(() => calculatePharmacyPricing({ items: [null] }), /Invalid item/);
    assert.throws(() => calculatePharmacyPricing({ items: ['string'] }), /Invalid item/);
  });

  await t.test('returns 0 for empty items array', () => {
    const result = calculatePharmacyPricing({ items: [] });
    assert.equal(result.originalTotal, 0);
    assert.equal(result.finalPrice, 0);
  });

  await t.test('correctly calculates mixed multi-line cart', () => {
    const result = calculatePharmacyPricing({
      items: [
        { id: 'p1', qty: 3 }, // 3 x 22.50 = 67.50, discount = 10.13, subtotal = 57.37
        { id: 'p2', qty: 2 }  // 2 x 15.00 = 30.00, discount = 0, subtotal = 30.00
      ] // total subtotal = 87.37
    });
    assert.equal(result.originalTotal, 97.50);
    assert.equal(result.lineDiscountsTotal, 10.13);
    assert.equal(result.subtotalAfterLines, 87.37);
    assert.equal(result.finalPrice, 87.37);
  });

  await t.test('throws error if items is not an array', () => {
    assert.throws(() => calculatePharmacyPricing({ items: 'not array' }), /Items must be an array/);
  });
});
