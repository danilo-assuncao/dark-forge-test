const test = require('node:test');
const assert = require('node:assert');
const { calculateTotal, validateDriver, processRental } = require('../app.js');

test('calculateTotal calculates correct amount for limited KM', () => {
    const total = calculateTotal('A', 2, 'limited', 0, '');
    assert.strictEqual(total, 160);
});

test('calculateTotal calculates correct amount for unlimited KM', () => {
    const total = calculateTotal('B', 3, 'unlimited', 0, '');
    assert.strictEqual(total, 390);
});

test('calculateTotal calculates correct amount with extras', () => {
    const total = calculateTotal('C', 1, 'limited', 30, '');
    assert.strictEqual(total, 180);
});

test('calculateTotal applies 10% discount for DANCAR10 coupon', () => {
    const total = calculateTotal('D', 2, 'limited', 0, 'DANCAR10');
    assert.strictEqual(total, 360);
});

test('validateDriver requires age >= 18', () => {
    assert.strictEqual(validateDriver(17, '12345678901').valid, false);
    assert.strictEqual(validateDriver(18, '12345678901').valid, true);
});

test('validateDriver requires 11 digit CNH', () => {
    assert.strictEqual(validateDriver(20, '123').valid, false);
    assert.strictEqual(validateDriver(20, '123456789012').valid, false);
    assert.strictEqual(validateDriver(20, '12345678901').valid, true);
});

test('processRental generates voucher for valid data', () => {
    const data = {
        vehicleGroup: 'A',
        days: 2,
        kmModality: 'limited',
        extrasDaily: 0,
        age: 25,
        cnh: '12345678901',
        coupon: ''
    };
    const result = processRental(data);
    assert.strictEqual(result.success, true);
    assert.match(result.voucherCode, /^CAR-\d{4}$/);
    assert.strictEqual(result.total, 160);
    assert.ok(result.voucherText.includes(result.voucherCode));
    assert.ok(result.voucherText.includes('R$ 160.00'));
});

test('processRental fails for invalid age', () => {
    const data = {
        vehicleGroup: 'A',
        days: 2,
        kmModality: 'limited',
        extrasDaily: 0,
        age: 16,
        cnh: '12345678901',
        coupon: ''
    };
    const result = processRental(data);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.message, 'Idade mínima para aluguel é 18 anos.');
});
