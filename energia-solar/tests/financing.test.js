const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateSolarPayment } = require('../financing.js');

test('calculateSolarPayment - pix method without coupon', () => {
    const result = calculateSolarPayment({ systemCostBrl: 10000, method: 'pix' });
    assert.equal(result.method, 'pix');
    assert.equal(result.principal, 10000);
    assert.equal(result.total, 9400);
    assert.equal(result.discountApplied, 600);
});

test('calculateSolarPayment - pix method with DANSOLAR5 coupon', () => {
    const result = calculateSolarPayment({ systemCostBrl: 10000, method: 'pix', couponCode: 'DANSOLAR5' });
    assert.equal(result.method, 'pix');
    assert.equal(result.principal, 9500); // 5% off
    assert.equal(result.total, 9500 * 0.94); // 8930
    assert.equal(result.discountApplied, 10000 - 8930); // 1070
});

test('calculateSolarPayment - price method without coupon (48 months)', () => {
    const result = calculateSolarPayment({ systemCostBrl: 10000, method: 'price', months: 48 });
    assert.equal(result.method, 'price');
    assert.equal(result.principal, 10000);
    assert.equal(result.months, 48);
    
    // PMT = (10000 * 0.0129 * (1.0129^48)) / ((1.0129^48) - 1) 
    //     = 280.75 (rounded)
    // 280.75 * 48 = 13476.00
    // 13476.00 - 10000 = 3476.00
    
    assert.equal(result.monthlyInstallment, 280.75);
    assert.equal(result.total, 13476);
    assert.equal(result.interestTotal, 3476);
});

test('calculateSolarPayment - price method with DANSOLAR5 coupon (24 months)', () => {
    // 10000 * 0.95 = 9500
    // PMT = (9500 * 0.0129 * (1.0129^24)) / ((1.0129^24) - 1)
    //     = 462.79 (rounded)
    // 462.79 * 24 = 11106.96
    // 11106.96 - 9500 = 1606.96
    const result = calculateSolarPayment({ systemCostBrl: 10000, method: 'price', months: 24, couponCode: 'dansolar5 ' });
    assert.equal(result.method, 'price');
    assert.equal(result.principal, 9500);
    assert.equal(result.months, 24);
    
    assert.equal(result.monthlyInstallment, 462.79);
    assert.equal(result.total, 11106.96);
    assert.equal(result.interestTotal, 1606.96);
});

test('calculateSolarPayment - invalid systemCostBrl types and boundaries', () => {
    assert.throws(() => {
        calculateSolarPayment({ systemCostBrl: -5000 });
    }, /Invalid systemCostBrl/);
    assert.throws(() => {
        calculateSolarPayment({ systemCostBrl: NaN });
    }, /Invalid systemCostBrl/);
    assert.throws(() => {
        calculateSolarPayment({ systemCostBrl: Infinity });
    }, /Invalid systemCostBrl/);
    assert.throws(() => {
        calculateSolarPayment({ systemCostBrl: '10000' });
    }, /Invalid systemCostBrl/);
});

test('calculateSolarPayment - invalid months for price', () => {
    assert.throws(() => {
        calculateSolarPayment({ systemCostBrl: 10000, method: 'price', months: 36 });
    }, /Invalid months for price financing/);
});

test('calculateSolarPayment - invalid method', () => {
    assert.throws(() => {
        calculateSolarPayment({ systemCostBrl: 10000, method: 'boleto' });
    }, /Invalid method/);
});
