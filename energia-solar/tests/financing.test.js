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
    
    // r = 0.0129, n = 48
    const r = 0.0129;
    const n = 48;
    const expectedPmt = (10000 * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    assert.ok(Math.abs(result.monthlyInstallment - expectedPmt) < 0.0001);
    assert.ok(Math.abs(result.total - expectedPmt * 48) < 0.0001);
});

test('calculateSolarPayment - price method with DANSOLAR5 coupon (24 months)', () => {
    const result = calculateSolarPayment({ systemCostBrl: 10000, method: 'price', months: 24, couponCode: 'DANSOLAR5' });
    assert.equal(result.method, 'price');
    assert.equal(result.principal, 9500);
    assert.equal(result.months, 24);
    
    const r = 0.0129;
    const n = 24;
    const expectedPmt = (9500 * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    
    assert.ok(Math.abs(result.monthlyInstallment - expectedPmt) < 0.0001);
});

test('calculateSolarPayment - invalid systemCostBrl', () => {
    assert.throws(() => {
        calculateSolarPayment({ systemCostBrl: -5000 });
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
