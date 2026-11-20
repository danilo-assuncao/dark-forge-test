const assert = require('assert');
const { Cart } = require('../cart');

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
    console.log('Running Cart tests...');

    const cpu = { id: 'cpu-123', name: 'Ryzen 5' };
    const gpu = { id: 'gpu-456', name: 'RTX 3060' };

    test('should add items correctly', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        cart.addItem(gpu, 2000, 1);
        assert.strictEqual(cart.items.length, 2);
        assert.strictEqual(cart.getSubtotal(), 3000);
    });

    test('should increase quantity for existing item', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        cart.addItem(cpu, 1000, 2);
        assert.strictEqual(cart.items.length, 1);
        assert.strictEqual(cart.items[0].quantity, 3);
        assert.strictEqual(cart.getSubtotal(), 3000);
    });

    test('should remove item correctly', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        cart.addItem(gpu, 2000, 1);
        cart.removeItem('cpu-123');
        assert.strictEqual(cart.items.length, 1);
        assert.strictEqual(cart.items[0].component.id, 'gpu-456');
    });

    test('should apply DANTECH10 coupon successfully', () => {
        const cart = new Cart();
        const result = cart.applyCoupon('DANTECH10');
        assert.strictEqual(result, true);
        assert.strictEqual(cart.coupon, 'DANTECH10');
    });

    test('should fail to apply invalid coupon', () => {
        const cart = new Cart();
        const result = cart.applyCoupon('INVALID');
        assert.strictEqual(result, false);
        assert.strictEqual(cart.coupon, null);
    });

    test('checkout with credit_card should not apply PIX discount', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        const details = cart.checkout('credit_card', 1);
        assert.strictEqual(details.subtotal, 1000);
        assert.strictEqual(details.total, 1000);
        assert.strictEqual(details.paymentMethod, 'credit_card');
    });

    test('checkout with PIX should apply 10% discount', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        const details = cart.checkout('pix', 1);
        assert.strictEqual(details.subtotal, 1000);
        assert.strictEqual(details.paymentDiscount, 100);
        assert.strictEqual(details.total, 900);
    });

    test('checkout with DANTECH10 coupon should apply 10% discount', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        cart.applyCoupon('DANTECH10');
        const details = cart.checkout('credit_card', 1);
        assert.strictEqual(details.couponDiscount, 100);
        assert.strictEqual(details.total, 900);
    });

    test('checkout with PIX and DANTECH10 should stack discounts', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        cart.applyCoupon('DANTECH10');
        const details = cart.checkout('pix', 1);
        // Subtotal = 1000
        // Coupon 10% = 100 -> Total = 900
        // PIX 10% on 900 = 90 -> Total = 810
        assert.strictEqual(details.couponDiscount, 100);
        assert.strictEqual(details.paymentDiscount, 90);
        assert.strictEqual(details.total, 810);
    });

    test('checkout in installments should calculate correct installmentValue', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        const details = cart.checkout('credit_card', 5);
        assert.strictEqual(details.total, 1000);
        assert.strictEqual(details.installments, 5);
        assert.strictEqual(details.installmentValue, 200);
    });

    test('checkout with empty cart should throw', () => {
        const cart = new Cart();
        assert.throws(() => cart.checkout('pix', 1), /Cart is empty/);
    });

    test('PIX with installments > 1 should throw', () => {
        const cart = new Cart();
        cart.addItem(cpu, 1000, 1);
        assert.throws(() => cart.checkout('pix', 2), /PIX must be paid in a single installment/);
    });

    test('checkout rounds monetary values to cents', () => {
        const cart = new Cart();
        cart.addItem(cpu, 19.99, 3);
        cart.applyCoupon('DANTECH10');
        const details = cart.checkout('pix', 1);
        assert.strictEqual(details.subtotal, 59.97);
        assert.strictEqual(details.couponDiscount, 6);
        assert.strictEqual(details.paymentDiscount, 5.4);
        assert.strictEqual(details.total, 48.57);
        assert.strictEqual(cart.checkout('credit_card', 3).installmentValue, 17.99);
    });

    console.log(`\nTests complete: ${passed} passed, ${failed} failed.`);
    if (failed > 0) {
        process.exit(1);
    }
}

runTests();
