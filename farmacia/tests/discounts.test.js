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
    assert.equal(result.subtotalAfterLines, 57.38);
    assert.equal(result.globalDiscount, 0);
    assert.equal(result.finalPrice, 57.38);
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
    // subtotalAfterLines = 57.375
    // globalDiscount = 57.375 * 0.12 = 6.885 -> 6.88 or 6.89 based on node behavior
    assert.equal(result.subtotalAfterLines, 57.38);
    // Let's assert based on actual calculation matching discounts.js
    const subtotal = 57.375;
    assert.equal(result.globalDiscount, Number((subtotal * 0.12).toFixed(2))); 
    assert.equal(result.finalPrice, Number((subtotal - subtotal * 0.12).toFixed(2)));
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

  await t.test('ignores invalid products and handles missing qty (defaults to 1)', () => {
    const result = calculatePharmacyPricing({
      items: [
        { id: 'invalid-id', qty: 10 },
        { id: 'p1' } // qty defaults to 1 -> 22.50
      ]
    });
    assert.equal(result.originalTotal, 22.50);
    assert.equal(result.finalPrice, 22.50);
  });

  await t.test('throws error if items is not an array', () => {
    assert.throws(() => calculatePharmacyPricing({ items: 'not array' }), /Items must be an array/);
  });
});
