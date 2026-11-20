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
    assert.throws(() => c.addItem('b', 'B', 100000001, 1), /Invalid cart item/);
    assert.strictEqual(c.items.length, 1);
    assert.strictEqual(c.items[0].qty, 99);
    assert.strictEqual(c.subtotalCents(), 9900);
});

test('failed addItem does not persist anything', () => {
    const s = memStorage();
    const c = new Cart(s);
    assert.throws(() => c.addItem('a', 'A', -1, 1));
    assert.strictEqual(s.raw.size, 0);
});

test('floor rounding for coupon and PIX', () => {
    const c = new Cart(null);
    c.addItem('a', 'A', 10005, 1);
    let t = c.totals();
    assert.strictEqual(t.pixDiscountCents, 1000);
    assert.strictEqual(t.pixTotalCents, 9005);
    c.applyCoupon('DANTECH10');
    t = c.totals();
    assert.strictEqual(t.couponDiscountCents, 1000);
    assert.strictEqual(t.totalCents, 9005);
    assert.strictEqual(t.pixDiscountCents, 900);
    assert.strictEqual(t.pixTotalCents, 8105);
});

test('installments with coupon and on empty cart', () => {
    const c = filled(memStorage());
    c.applyCoupon('DANTECH10');
    const i = c.installments(12);
    assert.strictEqual(i.amounts.reduce((a, b) => a + b, 0), c.totals().totalCents);
    assert.deepStrictEqual(new Cart(null).installments(3).amounts, [0, 0, 0]);
});

test('storage failures keep the cart working in memory', () => {
    const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
    const c = new Cart(bad);
    c.addItem('a', 'A', 100, 1);
    assert.strictEqual(c.subtotalCents(), 100);
    assert.doesNotThrow(() => new Cart());
});

test('remove, removeCoupon and clear persist', () => {
    const s = memStorage();
    const c = filled(s);
    c.applyCoupon('DANTECH10');
    c.removeCoupon();
    assert.strictEqual(new Cart(s).couponCode, null);
    c.removeItem('gpu');
    assert.strictEqual(new Cart(s).items.length, 1);
    c.applyCoupon('DANTECH10');
    c.clear();
    const r = new Cart(s);
    assert.strictEqual(r.items.length, 0);
    assert.strictEqual(r.couponCode, null);
});

test('load filters bad stored data, merges duplicates, rejects non-canonical coupon', () => {
    const s = memStorage();
    s.setItem(STORAGE_KEY, JSON.stringify({
        items: [
            { id: 'a', priceCents: 100, qty: 100 },
            { id: 'b', priceCents: 1.5, qty: 1 },
            { id: 'c', priceCents: 1e21, qty: 1 },
            { id: 'd', priceCents: 100, qty: 2 },
            { id: 'd', priceCents: 100, qty: 3 },
            { id: 'd', priceCents: 200, qty: 1 },
            { id: 'e', priceCents: 100, qty: 60 },
            { id: 'e', priceCents: 100, qty: 60 }
        ],
        coupon: 'dantech10'
    }));
    const c = new Cart(s);
    assert.deepStrictEqual(c.items.map((i) => [i.id, i.qty]), [['d', 5], ['e', 60]]);
    assert.strictEqual(c.couponCode, null);
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

test('paymentOptions compares PIX with 12x card', () => {
    const o = filled(memStorage()).paymentOptions();
    assert.strictEqual(o.pix.totalCents, 135000);
    assert.strictEqual(o.pix.savingsCents, 15000);
    assert.strictEqual(o.card.totalCents, 150000);
    assert.strictEqual(o.card.installments.length, 12);
    assert.strictEqual(o.card.installments.reduce((a, b) => a + b, 0), 150000);
});
