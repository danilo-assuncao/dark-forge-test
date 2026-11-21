const test = require('node:test');
const assert = require('node:assert');
const { calculateSubscriptionCheckout, generateProtocol } = require('../billing');

test('calculates correct monthly total without coupon', () => {
    const result = calculateSubscriptionCheckout({ planId: 'padrao-ads' });
    
    assert.match(result.protocol, /^PLY-[A-Z0-9]{6}$/);
    assert.strictEqual(result.baseCyclePrice, 19.90);
    assert.strictEqual(result.recurrentDiscount, 0);
    assert.strictEqual(result.finalRecurrentPrice, 19.90);
    assert.strictEqual(result.rentalsTotalBrl, 0);
    assert.strictEqual(result.finalTotal, 19.90);
});

test('calculates correct annual total with 16% off and channels', () => {
    // Plan: 19.90 (1990 cents), Channel: 24.90 (2490 cents) => total monthly = 4480 cents
    // Annual = 4480 * 12 = 53760 cents
    // Discount 16% = 53760 * 0.84 = 45158.4 -> 45158 cents => 451.58
    const result = calculateSubscriptionCheckout({ 
        planId: 'padrao-ads', 
        channelIds: ['esportes-live'], 
        cycle: 'anual' 
    });
    
    assert.strictEqual(result.baseCyclePrice, 451.58);
    assert.strictEqual(result.recurrentDiscount, 0);
    assert.strictEqual(result.finalTotal, 451.58);
});

test('applies DANPLAY20 coupon for 20% off recurrent part only', () => {
    // Plan: 39.90 (3990 cents)
    // Discount = 3990 * 0.20 = 798 cents (7.98)
    // Final recurrent = 3990 - 798 = 3192 cents (31.92)
    // Rentals = 15.00 (1500 cents)
    // Final total = 3192 + 1500 = 4692 cents (46.92)
    const result = calculateSubscriptionCheckout({ 
        planId: 'full-hd', 
        rentalsTotalBrl: 15.00, 
        couponCode: 'DANPLAY20' 
    });
    
    assert.strictEqual(result.baseCyclePrice, 39.90);
    assert.strictEqual(result.recurrentDiscount, 7.98);
    assert.strictEqual(result.finalRecurrentPrice, 31.92);
    assert.strictEqual(result.rentalsTotalBrl, 15.00);
    assert.strictEqual(result.finalTotal, 46.92);
});

test('applies both annual discount and DANPLAY20 coupon with rentals', () => {
    // Plan: 55.90, Kids: 12.90 => total monthly 68.80 (6880 cents)
    // Annual: 6880 * 12 * 0.84 = 69350.4 (69350 cents)
    // Coupon: 69350 * 0.20 = 13870 cents
    // Final recurrent = 69350 - 13870 = 55480 cents
    // Rentals = 50.00
    // Final total = 60480 cents
    const result = calculateSubscriptionCheckout({ 
        planId: 'ultra-4k', 
        channelIds: ['kids-plus'], 
        cycle: 'anual',
        rentalsTotalBrl: 50.00,
        couponCode: 'DANPLAY20'
    });
    
    assert.strictEqual(result.baseCyclePrice, 693.50);
    assert.strictEqual(result.recurrentDiscount, 138.70);
    assert.strictEqual(result.finalRecurrentPrice, 554.80);
    assert.strictEqual(result.rentalsTotalBrl, 50.00);
    assert.strictEqual(result.finalTotal, 604.80);
});

test('deduplicates channelIds', () => {
    const result = calculateSubscriptionCheckout({ 
        planId: 'padrao-ads', 
        channelIds: ['esportes-live', 'esportes-live']
    });
    
    assert.strictEqual(result.channelIds.length, 1);
    assert.strictEqual(result.baseCyclePrice, 44.80);
});

test('throws error for invalid plan', () => {
    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'invalid-plan' });
    }, /Invalid plan/);
});

test('throws error for invalid channel', () => {
    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'padrao-ads', channelIds: ['invalid-channel'] });
    }, /Invalid channel/);
});

test('throws error for invalid cycle', () => {
    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'padrao-ads', cycle: 'yearly' });
    }, /Invalid cycle/);
});

test('throws error for invalid rentalsTotalBrl', () => {
    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'padrao-ads', rentalsTotalBrl: -10 });
    }, /Invalid rentals total/);

    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'padrao-ads', rentalsTotalBrl: '10' });
    }, /Invalid rentals total/);

    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'padrao-ads', rentalsTotalBrl: NaN });
    }, /Invalid rentals total/);
});

test('throws error for invalid couponCode', () => {
    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'padrao-ads', couponCode: 'INVALIDCOUPON' });
    }, /Invalid coupon code/);
});

test('throws error for non-array channelIds', () => {
    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'padrao-ads', channelIds: 'esportes-live' });
    }, /Invalid channels array/);
});

test('protocol generation works and is random', () => {
    const p1 = generateProtocol();
    const p2 = generateProtocol();
    assert.match(p1, /^PLY-[A-Z0-9]{6}$/);
    assert.notStrictEqual(p1, p2);
});
