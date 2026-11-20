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

    test('calculateWarranty should floor non-round subtotals and accept zero', () => {
        assert.strictEqual(calculateWarranty(999, 12), 99);
        assert.strictEqual(calculateWarranty(12345, 12), 1234);
        assert.strictEqual(calculateWarranty(12345, 24), 2469);
        assert.strictEqual(calculateWarranty(0, 24), 0);
    });

    test('calculateWarranty should reject invalid months variants', () => {
        [undefined, null, '12', 0, 'constructor', 'toString', '__proto__', NaN].forEach((m) => {
            assert.throws(() => calculateWarranty(100000, m), /Invalid warranty months/);
        });
    });

    test('calculateWarranty should reject non-finite and fractional subtotals', () => {
        [Infinity, NaN, 100.5, undefined].forEach((v) => {
            assert.throws(() => calculateWarranty(v, 12), /Invalid subtotal/);
        });
    });

    test('calculateInsuredShipping region by first digit and boundary prefixes', () => {
        const expected = ['Sudeste', 'Sudeste', 'Sudeste', 'Sudeste', 'Nordeste', 'Nordeste',
            'Centro-Oeste/Norte', 'Centro-Oeste/Norte', 'Sul', 'Sul'];
        expected.forEach((region, d) => {
            assert.strictEqual(calculateInsuredShipping(`${d}${d === 6 ? 6 : 0}000-000`, 1000).region, region);
        });
        // 60-65 are Nordeste (CE, PI, MA); 66+ stay Norte
        assert.strictEqual(calculateInsuredShipping('60000-000', 1000).region, 'Nordeste');
        assert.strictEqual(calculateInsuredShipping('65999-999', 1000).region, 'Nordeste');
        assert.strictEqual(calculateInsuredShipping('66000-000', 1000).region, 'Centro-Oeste/Norte');
    });

    test('calculateInsuredShipping should floor insurance and handle zero subtotal', () => {
        assert.strictEqual(calculateInsuredShipping('90000-000', 12345).insuranceCents, 185);
        assert.strictEqual(calculateInsuredShipping('01000-000', 12345).insuranceCents, 123);
        const zero = calculateInsuredShipping('01000-000', 0);
        assert.strictEqual(zero.insuranceCents, 0);
        assert.strictEqual(zero.totalCents, 1500);
    });

    test('calculateInsuredShipping should reject malformed CEP input', () => {
        ['', undefined, '010000000', 1000000, 'abc01000000xyz', '0-1-0-0-0-0-0-0', '0100-0000'].forEach((c) => {
            assert.throws(() => calculateInsuredShipping(c, 1000), /Invalid CEP/);
        });
    });

    test('calculateInsuredShipping should normalize cep and validate subtotal first', () => {
        assert.strictEqual(calculateInsuredShipping('01000-000', 1000).cep, '01000000');
        assert.strictEqual(calculateInsuredShipping('01000000', 1000).cep, '01000000');
        assert.throws(() => calculateInsuredShipping('bad', -1), /Invalid subtotal/);
    });

    console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
