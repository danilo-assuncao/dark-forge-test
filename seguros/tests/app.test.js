const test = require('node:test');
const assert = require('node:assert');
const DanSeguros = require('../app.js');

test('calculateInsurance sem coberturas adicionais ou cupom', () => {
    const result = DanSeguros.calculateInsurance({
        fipe: 50000,
        age: 30, // sem penalidade
        usage: 'particular', // sem penalidade
        franchise: 'normal', // normal
        coverages: [],
        coupon: ''
    });

    assert.strictEqual(result.basePremium, 2500); // 5% de 50000
    assert.strictEqual(result.additionalPremium, 0);
    assert.strictEqual(result.discount, 0);
    assert.strictEqual(result.totalPix, 2500 * 0.95);
    assert.strictEqual(result.totalInstallments, 2500 / 12);
});

test('calculateInsurance com penalidades, coberturas e cupom', () => {
    const result = DanSeguros.calculateInsurance({
        fipe: 50000,
        age: 20, // < 25 (x1.2)
        usage: 'app', // app (x1.3)
        franchise: 'reduzida', // reduzida (x1.2)
        coverages: ['vidros', 'carro_reserva_7'], // 200 + 100 = 300
        coupon: 'DANSEG10' // 10% desconto
    });

    // base: 50000 * 0.05 = 2500
    // idade: 2500 * 1.2 = 3000
    // uso: 3000 * 1.3 = 3900
    // franquia: 3900 * 1.2 = 4680
    assert.strictEqual(result.basePremium, 4680);
    assert.strictEqual(result.additionalPremium, 300);

    const totalBeforeDiscount = 4680 + 300; // 4980
    assert.strictEqual(result.discount, 4980 * 0.10); // 498
    
    const finalTotal = 4980 - 498; // 4482
    assert.strictEqual(result.totalPix, 4482 * 0.95); // 4257.9
    assert.strictEqual(result.totalInstallments, 4482 / 12); // 373.5
});

test('generatePolicyId deve ter o formato APO-XXXX', () => {
    const policy = DanSeguros.generatePolicyId();
    assert.match(policy, /^APO-\d{4}$/);
});
