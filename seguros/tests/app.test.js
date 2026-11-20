const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');
const DanSeguros = require('../app.js');

test('calculateInsurance - Caso Base (idade normal, uso particular, franquia normal)', () => {
    const result = DanSeguros.calculateInsurance({
        fipe: 50000,
        age: 30,
        usage: 'particular',
        franchise: 'normal',
        coverages: [],
        coupon: ''
    });
    // 50000 * 0.05 = 2500.00
    assert.strictEqual(result.basePremium, 2500.00);
    assert.strictEqual(result.additionalPremium, 0.00);
    assert.strictEqual(result.discount, 0.00);
    assert.strictEqual(result.totalPix, 2375.00); // 2500 * 0.95
    assert.strictEqual(result.totalInstallments, 208.33); // 2500 / 12 = 208.33333 -> 208.33
});

test('calculateInsurance - Idade < 25, Comercial, Franquia Majorada', () => {
    const result = DanSeguros.calculateInsurance({
        fipe: 80000, // base 4000
        age: 24, // < 25 (x1.2) -> 4800
        usage: 'comercial', // (x1.15) -> 5520
        franchise: 'majorada', // (x0.8) -> 4416
        coverages: [],
        coupon: ''
    });
    assert.strictEqual(result.basePremium, 4416.00);
});

test('calculateInsurance - Idade = 25 e Idade = 60 (Sem penalidade de idade)', () => {
    const result25 = DanSeguros.calculateInsurance({ fipe: 100000, age: 25, usage: 'particular', franchise: 'normal', coverages: [], coupon: '' });
    assert.strictEqual(result25.basePremium, 5000.00);

    const result60 = DanSeguros.calculateInsurance({ fipe: 100000, age: 60, usage: 'particular', franchise: 'normal', coverages: [], coupon: '' });
    assert.strictEqual(result60.basePremium, 5000.00);
});

test('calculateInsurance - Idade > 60 (x1.1), Aplicativo, Franquia Reduzida', () => {
    const result = DanSeguros.calculateInsurance({
        fipe: 100000, // base 5000
        age: 61, // > 60 (x1.1) -> 5500
        usage: 'app', // (x1.3) -> 7150
        franchise: 'reduzida', // (x1.2) -> 8580
        coverages: [],
        coupon: ''
    });
    assert.strictEqual(result.basePremium, 8580.00);
});

test('calculateInsurance - Todas as Coberturas e Cupom Inválido', () => {
    assert.throws(() => {
        DanSeguros.calculateInsurance({
            fipe: 50000, age: 30, usage: 'particular', franchise: 'normal',
            coverages: ['vidros', 'terceiros', 'carro_reserva_30'],
            coupon: 'INVALIDO'
        });
    }, /Cupom inválido/);
});

test('calculateInsurance - Múltiplos Carros Reserva (deve falhar)', () => {
    assert.throws(() => {
        DanSeguros.calculateInsurance({
            fipe: 50000, age: 30, usage: 'particular', franchise: 'normal',
            coverages: ['carro_reserva_7', 'carro_reserva_15'],
            coupon: ''
        });
    }, /Apenas uma opção de carro reserva pode ser selecionada/);
});

test('calculateInsurance - Coberturas Diversas e Cupom Válido', () => {
    const result = DanSeguros.calculateInsurance({
        fipe: 50000, // base 2500
        age: 30,
        usage: 'particular',
        franchise: 'normal',
        coverages: ['vidros', 'terceiros', 'carro_reserva_15'], // 200 + 400 + 200 = 800
        coupon: 'DANSEG10'
    });
    
    assert.strictEqual(result.basePremium, 2500.00);
    assert.strictEqual(result.additionalPremium, 800.00);
    
    // total = 3300. discount = 330
    assert.strictEqual(result.discount, 330.00);
    // final = 2970. pix = 2821.50, inst = 247.50
    assert.strictEqual(result.totalPix, 2821.50);
    assert.strictEqual(result.totalInstallments, 247.50);
});

test('generatePolicyId usa formato com UUID criptográfico quando possível', (t) => {
    // Mock crypto.randomUUID
    const originalRandomUUID = crypto.randomUUID;
    const globalCrypto = typeof global !== 'undefined' ? global.crypto : undefined;
    const originalGlobalRandomUUID = globalCrypto ? globalCrypto.randomUUID : undefined;

    crypto.randomUUID = () => '123e4567-e89b-12d3-a456-426614174000';
    if (globalCrypto) {
        globalCrypto.randomUUID = () => '123e4567-e89b-12d3-a456-426614174000';
    }
    
    try {
        const policy = DanSeguros.generatePolicyId();
        assert.strictEqual(policy, 'APO-123E4567-E89B-12D3-A456-426614174000');
    } finally {
        crypto.randomUUID = originalRandomUUID;
        if (globalCrypto) {
            globalCrypto.randomUUID = originalGlobalRandomUUID;
        }
    }
});