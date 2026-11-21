const test = require('node:test');
const assert = require('node:assert');
const { calculateSubscriptionCheckout } = require('../billing');

test('calculates correct monthly total without coupon', () => {
    const result = calculateSubscriptionCheckout({ planId: 'padrao-ads' });
    
    assert.match(result.protocol, /^PLY-[A-Z0-9]{4}$/);
    assert.strictEqual(result.baseCyclePrice, 19.90);
    assert.strictEqual(result.recurrentDiscount, 0);
    assert.strictEqual(result.finalRecurrentPrice, 19.90);
    assert.strictEqual(result.rentalsTotalBrl, 0);
    assert.strictEqual(result.finalTotal, 19.90);
});

test('calculates correct annual total with 16% off and channels', () => {
    // Plan: 19.90, Channel: 24.90 => total monthly = 44.80
    // Annual = 44.80 * 12 = 537.60
    // Discount 16% = 537.60 * 0.84 = 451.584
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
    // Plan: 39.90
    // Discount = 39.90 * 0.20 = 7.98
    // Final recurrent = 31.92
    // Rentals = 15.00
    // Final total = 31.92 + 15.00 = 46.92
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
    // Plan: 55.90, Kids: 12.90 => total monthly 68.80
    // Annual: 68.80 * 12 * 0.84 = 693.504 (693.50 base)
    // Coupon: 693.504 * 0.20 = 138.7008 (138.70 discount)
    // Final recurrent = 554.8032 (554.80)
    // Rentals = 50.00
    // Final total = 604.80
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

test('throws error for invalid plan', () => {
    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'invalid-plan' });
    }, /Plan not found: invalid-plan/);
});

test('throws error for invalid channel', () => {
    assert.throws(() => {
        calculateSubscriptionCheckout({ planId: 'padrao-ads', channelIds: ['invalid-channel'] });
    }, /Channel not found: invalid-channel/);
});
