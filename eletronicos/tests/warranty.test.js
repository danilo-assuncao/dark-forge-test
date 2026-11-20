const assert = require('assert');
const { calculateWarranty, calculateInsuredShipping } = require('../warranty');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (e) {
        console.error(`❌ ${name}`);
        console.error(e);
        failed++;
    }
}

function runTests() {
    console.log('Running Warranty tests...');

    test('calculateWarranty should return correct amount for 12 months', () => {
        // 10% of 1000.00 (100000 cents) = 100.00 (10000 cents)
        const amount = calculateWarranty(100000, 12);
        assert.strictEqual(amount, 10000);
    });

    test('calculateWarranty should return correct amount for 24 months', () => {
        // 20% of 1000.00 (100000 cents) = 200.00 (20000 cents)
        const amount = calculateWarranty(100000, 24);
        assert.strictEqual(amount, 20000);
    });

    test('calculateWarranty should throw on invalid months', () => {
        assert.throws(() => calculateWarranty(100000, 36), /Invalid warranty months/);
    });

    test('calculateWarranty should throw on invalid subtotal', () => {
        assert.throws(() => calculateWarranty(-100, 12), /Invalid subtotal/);
        assert.throws(() => calculateWarranty('1000', 12), /Invalid subtotal/);
    });

    test('calculateInsuredShipping should quote correctly for Sudeste', () => {
        // CEP 01000-000 -> Sudeste. base 1500, risk 1%. Subtotal 100000 -> risk 1000. Total 2500.
        const res = calculateInsuredShipping('01000-000', 100000);
        assert.strictEqual(res.region, 'Sudeste');
        assert.strictEqual(res.baseCents, 1500);
        assert.strictEqual(res.insuranceCents, 1000);
        assert.strictEqual(res.totalCents, 2500);
    });

    test('calculateInsuredShipping should quote correctly for Nordeste', () => {
        // CEP 40000-000 -> Nordeste. base 3500, risk 2%. Subtotal 100000 -> risk 2000. Total 5500.
        const res = calculateInsuredShipping('40000-000', 100000);
        assert.strictEqual(res.region, 'Nordeste');
        assert.strictEqual(res.baseCents, 3500);
        assert.strictEqual(res.insuranceCents, 2000);
        assert.strictEqual(res.totalCents, 5500);
    });

    test('calculateInsuredShipping should quote correctly for Centro-Oeste/Norte', () => {
        // CEP 70000-000 -> Centro-Oeste/Norte. base 4500, risk 2%. Subtotal 100000 -> risk 2000. Total 6500.
        const res = calculateInsuredShipping('70000000', 100000);
        assert.strictEqual(res.region, 'Centro-Oeste/Norte');
        assert.strictEqual(res.baseCents, 4500);
        assert.strictEqual(res.insuranceCents, 2000);
        assert.strictEqual(res.totalCents, 6500);
    });

    test('calculateInsuredShipping should quote correctly for Sul', () => {
        // CEP 90000-000 -> Sul. base 2500, risk 1.5%. Subtotal 100000 -> risk 1500. Total 4000.
        const res = calculateInsuredShipping('90000-000', 100000);
        assert.strictEqual(res.region, 'Sul');
        assert.strictEqual(res.baseCents, 2500);
        assert.strictEqual(res.insuranceCents, 1500);
        assert.strictEqual(res.totalCents, 4000);
    });

    test('calculateInsuredShipping should throw on invalid CEP', () => {
        assert.throws(() => calculateInsuredShipping('123', 100000), /Invalid CEP/);
        assert.throws(() => calculateInsuredShipping(null, 100000), /Invalid CEP/);
    });

    test('calculateInsuredShipping should throw on invalid subtotal', () => {
        assert.throws(() => calculateInsuredShipping('01000-000', -50), /Invalid subtotal/);
        assert.throws(() => calculateInsuredShipping('01000-000', NaN), /Invalid subtotal/);
    });

    console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
