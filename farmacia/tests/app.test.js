const { test, describe } = require('node:test');
const assert = require('node:assert');

// Mock DOM before requiring app.js
global.document = {
    getElementById: () => ({
        classList: { add: () => {}, remove: () => {} },
        addEventListener: () => {},
        value: '',
        textContent: '',
        innerHTML: ''
    }),
    getElementsByName: () => ([]),
    createElement: () => ({
        classList: { add: () => {}, remove: () => {} },
        appendChild: () => {}
    })
};
global.window = {};

const app = require('../app.js');

describe('Dan Farma App Tests', () => {
    test('Inventory has items', () => {
        assert.ok(app.inventory.length > 0);
    });

    test('getGenericAlternative returns generic if available', () => {
        const brand = app.inventory.find(m => m.name === 'Amoxil');
        const generic = app.getGenericAlternative(brand);
        assert.ok(generic);
        assert.strictEqual(generic.name, 'Amoxicilina');
        assert.ok(generic.price < brand.price);
    });

    test('getGenericAlternative returns null if no generic', () => {
        const genericMed = app.inventory.find(m => m.name === 'Amoxicilina');
        const result = app.getGenericAlternative(genericMed);
        assert.strictEqual(result, null);
    });

    test('calculateTotal without discounts', () => {
        const total = app.calculateTotal(100, false, false);
        assert.strictEqual(total, 100);
    });

    test('calculateTotal with subscription discount (10%)', () => {
        const total = app.calculateTotal(100, true, false);
        assert.strictEqual(total, 90);
    });

    test('calculateTotal with coupon discount (10%)', () => {
        const total = app.calculateTotal(100, false, true);
        assert.strictEqual(total, 90);
    });

    test('calculateTotal with subscription and coupon discount', () => {
        const total = app.calculateTotal(100, true, true);
        assert.strictEqual(total, 81); // 100 * 0.9 * 0.9
    });
});