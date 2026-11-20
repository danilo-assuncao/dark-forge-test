const { test } = require('node:test');
const assert = require('node:assert');
const { Cart, STORAGE_KEY } = require('../cart');

function memStorage() {
    const m = new Map();
    return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        raw: m
    };
}

function filled(storage) {
    const c = new Cart(storage);
    c.addItem('gpu', 'GPU', 100000, 1);
    c.addItem('ram', 'RAM', 25000, 2);
    return c; // subtotal 150000
}

test('persists to dan-tech-cart and reloads', () => {
    const s = memStorage();
    const c = filled(s);
    c.applyCoupon('dantech10');
    assert.strictEqual(STORAGE_KEY, 'dan-tech-cart');
    assert.ok(s.raw.has('dan-tech-cart'));
    const again = new Cart(s);
    assert.strictEqual(again.subtotalCents(), 150000);
    assert.strictEqual(again.couponCode, 'DANTECH10');
});

test('corrupt or invalid stored data is ignored', () => {
    const s = memStorage();
    s.setItem(STORAGE_KEY, '{nope');
    assert.strictEqual(new Cart(s).items.length, 0);
    s.setItem(STORAGE_KEY, JSON.stringify({ items: [{ id: 'x', priceCents: -1, qty: 1 }, { id: 'y', priceCents: 100, qty: 2 }], coupon: 'FAKE' }));
    const c = new Cart(s);
    assert.strictEqual(c.items.length, 1);
    assert.strictEqual(c.couponCode, null);
});

test('works in memory without storage', () => {
    const c = new Cart(null);
    c.addItem('a', 'A', 500, 2);
    assert.strictEqual(c.subtotalCents(), 1000);
});

test('merges lines, removes and clears', () => {
    const c = filled(memStorage());
    c.addItem('gpu', 'GPU', 100000, 1);
    assert.strictEqual(c.subtotalCents(), 250000);
    c.removeItem('gpu');
    assert.strictEqual(c.subtotalCents(), 50000);
    c.clear();
    assert.strictEqual(c.items.length, 0);
});

test('rejects invalid items', () => {
    const c = new Cart(null);
    assert.throws(() => c.addItem('', 'A', 100, 1), /Invalid cart item/);
    assert.throws(() => c.addItem('a', 'A', 1.5, 1), /Invalid cart item/);
    assert.throws(() => c.addItem('a', 'A', 100, 0), /Invalid cart item/);
    assert.throws(() => c.addItem('a', 'A', 100, 100), /Invalid cart item/);
    c.addItem('a', 'A', 100, 99);
    assert.throws(() => c.addItem('a', 'A', 100, 1), /Invalid cart item/);
    assert.throws(() => c.addItem('a', 'A', 200, 1), /Price mismatch/);
});

test('PIX gives 10% off', () => {
    const t = filled(memStorage()).totals();
    assert.strictEqual(t.pixDiscountCents, 15000);
    assert.strictEqual(t.pixTotalCents, 135000);
    assert.strictEqual(t.totalCents, 150000);
});

test('DANTECH10 gives 10% off and stacks with PIX', () => {
    const c = filled(memStorage());
    c.applyCoupon(' DanTech10 ');
    const t = c.totals();
    assert.strictEqual(t.couponDiscountCents, 15000);
    assert.strictEqual(t.totalCents, 135000);
    assert.strictEqual(t.pixTotalCents, 121500);
    c.removeCoupon();
    assert.strictEqual(c.totals().totalCents, 150000);
});

test('rejects unknown coupons', () => {
    const c = filled(memStorage());
    ['', 'FOO', undefined, 10].forEach((x) => assert.throws(() => c.applyCoupon(x), /Invalid coupon/));
    assert.strictEqual(c.couponCode, null);
});

test('installments up to 12x with no interest and exact sum', () => {
    const c = new Cart(null);
    c.addItem('a', 'A', 100000, 1);
    const i12 = c.installments(12);
    assert.strictEqual(i12.amounts.length, 12);
    assert.strictEqual(i12.amounts.reduce((a, b) => a + b, 0), 100000);
    const c2 = new Cart(null);
    c2.addItem('a', 'A', 10001, 1);
    const i3 = c2.installments(3);
    assert.deepStrictEqual(i3.amounts, [3334, 3334, 3333]);
    assert.strictEqual(c2.installments(1).amounts[0], 10001);
});

test('rejects invalid installment counts', () => {
    const c = filled(memStorage());
    [0, 13, 1.5, '3', undefined].forEach((n) => assert.throws(() => c.installments(n), /Invalid installments/));
});

test('empty cart totals are zero', () => {
    const t = new Cart(null).totals();
    assert.strictEqual(t.pixTotalCents, 0);
});
