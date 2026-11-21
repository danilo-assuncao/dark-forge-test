const test = require('node:test');
const assert = require('node:assert');
const { vehiclePrices, generateVoucherCode, calculateTotal, validateDriver, processRental } = require('../app.js');

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

test('calculateTotal ignores invalid coupon and returns full price', () => {
    const total = calculateTotal('D', 2, 'limited', 0, 'INVALID');
    assert.strictEqual(total, 400);
});

test('calculateTotal calculates correct amount with coupon, extras and unlimited KM', () => {
    const total = calculateTotal('B', 2, 'unlimited', 35, ' dancar10 ');
    // B = 100, unlimited = 30, extras = 35 => 165/day * 2 = 330.
    // 330 * 0.9 = 297
    assert.strictEqual(total, 297);
});

test('validateDriver requires age >= 18 and checks integer/NaN', () => {
    assert.strictEqual(validateDriver(17, '12345678901').valid, false);
    assert.strictEqual(validateDriver(18, '12345678901').valid, true);
    assert.strictEqual(validateDriver(NaN, '12345678901').valid, false);
    assert.strictEqual(validateDriver(undefined, '12345678901').valid, false);
    assert.strictEqual(validateDriver(18.5, '12345678901').valid, false);
});

test('validateDriver requires 11 digit CNH', () => {
    assert.strictEqual(validateDriver(20, '123').valid, false);
    assert.strictEqual(validateDriver(20, '123456789012').valid, false);
    assert.strictEqual(validateDriver(20, '12345678901').valid, true);
    assert.strictEqual(validateDriver(20, '1234567890a').valid, false);
    assert.strictEqual(validateDriver(20, 12345678901).valid, false);
    assert.strictEqual(validateDriver(20, ['12345678901']).valid, false);
});

test('processRental generates voucher for valid data and unlimited KM', () => {
    const data = {
        vehicleGroup: 'A',
        days: 2,
        kmModality: 'unlimited',
        extrasDaily: 0,
        age: 25,
        cnh: '12345678901',
        coupon: 'DANCAR10'
    };
    const result = processRental(data);
    assert.strictEqual(result.success, true);
    assert.match(result.voucherCode, /^CAR-\d{4}$/);
    assert.strictEqual(result.total, 198); // (80 + 30) * 2 = 220 -> 220 * 0.9 = 198
    assert.ok(result.voucherText.includes(result.voucherCode));
    assert.ok(result.voucherText.includes('KM Livre'));
    assert.ok(result.voucherText.includes('R$ 198.00'));
});

test('processRental fails for invalid age', () => {
    const data = {
        vehicleGroup: 'A', days: 2, kmModality: 'limited', extrasDaily: 0,
        age: 16, cnh: '12345678901', coupon: ''
    };
    const result = processRental(data);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.voucherCode, undefined);
    assert.strictEqual(result.message, 'Idade mínima para aluguel é 18 anos.');
});

test('processRental fails for invalid CNH', () => {
    const data = {
        vehicleGroup: 'A', days: 2, kmModality: 'limited', extrasDaily: 0,
        age: 20, cnh: '123', coupon: ''
    };
    const result = processRental(data);
    assert.strictEqual(result.success, false);
    assert.strictEqual(result.voucherCode, undefined);
    assert.strictEqual(result.message, 'CNH inválida. Deve conter 11 dígitos numéricos.');
});

test('processRental fails for invalid days boundaries', () => {
    const baseData = { vehicleGroup: 'A', kmModality: 'limited', extrasDaily: 0, age: 20, cnh: '12345678901', coupon: '' };
    
    assert.strictEqual(processRental({ ...baseData, days: 0 }).success, false);
    assert.strictEqual(processRental({ ...baseData, days: -1 }).success, false);
    assert.strictEqual(processRental({ ...baseData, days: NaN }).success, false);
    assert.strictEqual(processRental({ ...baseData, days: 366 }).success, false);
    assert.strictEqual(processRental({ ...baseData, days: 1.5 }).success, false);
    assert.strictEqual(processRental({ ...baseData, days: 1 }).success, true);
    assert.strictEqual(processRental({ ...baseData, days: 365 }).success, true);
});

test('processRental fails for invalid kmModality', () => {
    const baseData = { vehicleGroup: 'A', days: 2, extrasDaily: 0, age: 20, cnh: '12345678901', coupon: '' };
    
    const resultInvalid = processRental({ ...baseData, kmModality: 'other' });
    assert.strictEqual(resultInvalid.success, false);
    assert.strictEqual(resultInvalid.message, 'Por favor, preencha todos os campos obrigatórios corretamente.');

    assert.strictEqual(processRental({ ...baseData, kmModality: undefined }).success, false);
});

test('processRental fails for invalid extrasDaily', () => {
    const baseData = { vehicleGroup: 'A', days: 2, kmModality: 'limited', age: 20, cnh: '12345678901', coupon: '' };
    
    const resultNegative = processRental({ ...baseData, extrasDaily: -1 });
    assert.strictEqual(resultNegative.success, false);
    assert.strictEqual(resultNegative.message, 'Adicionais inválidos.');

    assert.strictEqual(processRental({ ...baseData, extrasDaily: NaN }).success, false);
    assert.strictEqual(processRental({ ...baseData, extrasDaily: Infinity }).success, false);
    assert.strictEqual(processRental({ ...baseData, extrasDaily: undefined }).success, false);
    assert.strictEqual(processRental({ ...baseData, extrasDaily: '10' }).success, false);

    assert.strictEqual(processRental({ ...baseData, extrasDaily: 0 }).success, true);
});

test('processRental fails for empty or unknown vehicleGroup', () => {
    const baseData = { days: 2, kmModality: 'limited', extrasDaily: 0, age: 20, cnh: '12345678901', coupon: '' };
    
    const resultEmpty = processRental({ ...baseData, vehicleGroup: '' });
    assert.strictEqual(resultEmpty.success, false);
    assert.strictEqual(resultEmpty.message, 'Por favor, preencha todos os campos obrigatórios corretamente.');

    const resultUnknown = processRental({ ...baseData, vehicleGroup: 'Z' });
    assert.strictEqual(resultUnknown.success, false);
    
    const resultProto = processRental({ ...baseData, vehicleGroup: 'toString' });
    assert.strictEqual(resultProto.success, false);
});

test('generateVoucherCode uses random and stays within bounds', (t) => {
    t.mock.method(Math, 'random', () => 0);
    assert.strictEqual(generateVoucherCode(), 'CAR-1000');

    t.mock.method(Math, 'random', () => 0.999999);
    assert.strictEqual(generateVoucherCode(), 'CAR-9999');
});
