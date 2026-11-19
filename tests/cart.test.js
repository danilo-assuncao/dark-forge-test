/* Cart state tests: cart.js runs in a vm context with a fake localStorage. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const productsJs = fs.readFileSync(path.join(ROOT, 'products.js'), 'utf8');
const cartJs = fs.readFileSync(path.join(ROOT, 'cart.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function fakeStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    data,
    getItem(k) { return k in data ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
  };
}

function load(storage, win) {
  const ctx = { window: win || { localStorage: storage } };
  vm.createContext(ctx);
  vm.runInContext(productsJs, ctx);
  vm.runInContext(cartJs, ctx);
  return ctx.window.DanCart;
}

test('add merges quantities per product and size, and counts items', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.count(), 0);
  assert.ok(cart.add('oil-change', 1, 'Hatch/Sedan'));
  assert.ok(cart.add('oil-change', 2, 'Hatch/Sedan'));
  assert.ok(cart.add('oil-change', 1, 'SUV/Picape'));
  assert.ok(cart.add('brake-pads', 1, 'Utilitario'));
  assert.equal(cart.count(), 5);
  assert.equal(cart.lines().length, 3);
  assert.deepEqual(Array.from(cart.lines().map(function (l) { return l.size; })), ['Hatch/Sedan', 'SUV/Picape', 'Utilitario']);
});

test('unknown products, sizes and invalid quantities are rejected', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.add('nope', 1, 'Hatch/Sedan'), false);
  assert.equal(cart.add('oil-change', 1), false, 'size is required');
  assert.equal(cart.add('oil-change', 1, 'XXL'), false);
  assert.equal(cart.add('oil-change', 0, 'Hatch/Sedan'), false);
  assert.equal(cart.add('oil-change', -3, 'Hatch/Sedan'), false);
  assert.equal(cart.add('oil-change', NaN, 'Hatch/Sedan'), false);
  assert.equal(cart.count(), 0);
  assert.equal(cart.add('cap', 1, 'Tamanho \u00fanico'), false, 'removed product');
  assert.equal(cart.add('oil-change', 1, 'Tamanho \u00fanico'), false, 'one-size sentinel is not a size');
  assert.equal(cart.count(), 0);
  assert.ok(cart.add('brake-pads', 1, 'Utilitario'));
});

test('total is computed in cents from quantities', function () {
  const cart = load(fakeStorage());
  cart.add('brake-pads', 2, 'Hatch/Sedan'); // 31990 * 2
  cart.add('oil-change', 1, 'Hatch/Sedan'); // 24990
  assert.equal(cart.totalCents(), 31990 * 2 + 24990);
  cart.setQty('brake-pads', 'Hatch/Sedan', 1);
  assert.equal(cart.totalCents(), 31990 + 24990);
});

test('setQty changes, removes below 1 and caps at the maximum', function () {
  const cart = load(fakeStorage());
  cart.add('oil-change', 1, 'Hatch/Sedan');
  cart.setQty('oil-change', 'Hatch/Sedan', 5);
  assert.equal(cart.count(), 5);
  cart.setQty('oil-change', 'Hatch/Sedan', 1000);
  assert.equal(cart.count(), cart.MAX_QTY);
  cart.setQty('oil-change', 'Hatch/Sedan', 0);
  assert.equal(cart.count(), 0);
  assert.equal(cart.setQty('oil-change', 'Hatch/Sedan', 2), false);
});

test('remove deletes one size line and clear empties the cart', function () {
  const cart = load(fakeStorage());
  cart.add('oil-change', 1, 'Hatch/Sedan');
  cart.add('oil-change', 1, 'SUV/Picape');
  cart.add('brake-pads', 1, 'Hatch/Sedan');
  assert.ok(cart.remove('oil-change', 'Hatch/Sedan'));
  assert.equal(cart.remove('oil-change', 'Hatch/Sedan'), false);
  assert.equal(cart.lines().length, 2);
  cart.clear();
  assert.equal(cart.count(), 0);
});

test('the cart persists across reloads via storage', function () {
  const storage = fakeStorage();
  const first = load(storage);
  first.add('oil-change', 3, 'Hatch/Sedan');
  first.add('brake-pads', 1, 'SUV/Picape');
  const second = load(storage);
  assert.equal(second.count(), 4);
  assert.equal(second.totalCents(), 24990 * 3 + 31990);
  second.remove('oil-change', 'Hatch/Sedan');
  assert.equal(load(storage).count(), 1);
});

test('corrupt or stale stored data is ignored safely', function () {
  assert.equal(load(fakeStorage({ 'dan-cart': '{not json' })).count(), 0);
  assert.equal(load(fakeStorage({ 'dan-cart': '{"a":1}' })).count(), 0);
  const stored = JSON.stringify([
    { id: 'ghost', size: 'Hatch/Sedan', qty: 2 }, { id: 'oil-change', size: 'Hatch/Sedan', qty: 'x' }, null,
    { id: 'oil-change', qty: 4 }, { id: 'oil-change', size: 'XXL', qty: 4 },
    { id: 'oil-change', size: 'Hatch/Sedan', qty: 2 }, { id: 'oil-change', size: 'Hatch/Sedan', qty: 5 },
  ]);
  const cart = load(fakeStorage({ 'dan-cart': stored }));
  assert.equal(cart.count(), 2);
});

test('works without storage and listeners fire on change', function () {
  const cart = load(null);
  let calls = 0;
  cart.onChange(function () { calls++; });
  cart.add('oil-change', 1, 'Hatch/Sedan');
  cart.setQty('oil-change', 'Hatch/Sedan', 2);
  cart.remove('oil-change', 'Hatch/Sedan');
  assert.equal(calls, 3);
});

test('index.html has a header cart link with a counter and loads cart.js before script.js', function () {
  assert.match(html, /href="#\/cart"[^>]*>Orçamento \(<span id="cart-count">0<\/span>\)/);
  assert.ok(html.indexOf('cart.js') > html.indexOf('products.js'));
  assert.ok(html.indexOf('cart.js') < html.indexOf('script.js'));
});

test('add caps merged quantity at the maximum and reports no change when capped', function () {
  const cart = load(fakeStorage());
  cart.add('oil-change', 98, 'Hatch/Sedan');
  assert.ok(cart.add('oil-change', 5, 'Hatch/Sedan'));
  assert.equal(cart.count(), 99);
  assert.equal(cart.add('oil-change', 1, 'Hatch/Sedan'), false);
  assert.ok(cart.add('oil-change', 1, 'Utilitario'), 'another size is a separate line');
});

test('fractional quantities are floored and stored quantities are capped on load', function () {
  const cart = load(fakeStorage());
  cart.add('oil-change', 1.5, 'Hatch/Sedan');
  assert.equal(cart.count(), 1);
  const big = load(fakeStorage({ 'dan-cart': JSON.stringify([{ id: 'oil-change', size: 'Hatch/Sedan', qty: 500 }]) }));
  assert.equal(big.count(), 99);
});

test('storage failures keep the cart working in memory', function () {
  const throwing = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); },
  };
  const cart = load(throwing);
  assert.ok(cart.add('oil-change', 2, 'Hatch/Sedan'));
  assert.equal(cart.count(), 2);
  const win = {};
  Object.defineProperty(win, 'localStorage', { get() { throw new Error('denied'); } });
  const cart2 = load(null, win);
  assert.ok(cart2.add('oil-change', 1, 'Hatch/Sedan'));
  assert.equal(cart2.count(), 1);
});

test('reload re-reads storage and notifies listeners', function () {
  const storage = fakeStorage();
  const cart = load(storage);
  let calls = 0;
  cart.onChange(function () { calls++; });
  storage.setItem('dan-cart', JSON.stringify([{ id: 'brake-pads', size: 'Hatch/Sedan', qty: 2 }]));
  cart.reload();
  assert.equal(calls, 1);
  assert.equal(cart.count(), 2);
});

test('coupons: percent discount, case-insensitive codes, invalid codes and removal', function () {
  const cart = load(fakeStorage());
  cart.add('brake-pads', 1, 'Hatch/Sedan'); // 31990
  assert.deepEqual(JSON.parse(JSON.stringify(cart.applyCoupon('nope'))), { ok: false, message: 'This coupon is not valid.' });
  assert.equal(cart.applyCoupon('  ').ok, false);
  assert.equal(cart.coupon(), null);
  assert.equal(cart.applyCoupon(' dan10 ').ok, true);
  assert.equal(cart.coupon().code, 'DAN10');
  assert.equal(cart.subtotalCents(), 31990);
  assert.equal(cart.discountCents(), 3199);
  assert.equal(cart.totalCents(), 28791);
  assert.ok(cart.removeCoupon());
  assert.equal(cart.removeCoupon(), false);
  assert.equal(cart.totalCents(), 31990);
});

test('fixed coupon needs its minimum subtotal and stops applying when the cart shrinks', function () {
  const cart = load(fakeStorage());
  cart.add('oil-change', 1, 'Hatch/Sedan'); // 24990
  const refused = cart.applyCoupon('DAN50');
  assert.equal(refused.ok, false);
  assert.match(refused.message, /R\$ 250,00/);
  cart.add('brake-pads', 1, 'Hatch/Sedan'); // 31990 -> 56980
  assert.ok(cart.applyCoupon('DAN50').ok);
  assert.equal(cart.discountCents(), 5000);
  assert.equal(cart.totalCents(), 56980 - 5000);
  cart.remove('brake-pads', 'Hatch/Sedan'); // 24990 < minimum
  assert.equal(cart.discountCents(), 0);
  assert.equal(cart.totalCents(), 24990);
});

test('the coupon persists with the cart, is dropped when invalid and cleared with the cart', function () {
  const storage = fakeStorage();
  const first = load(storage);
  first.add('brake-pads', 1, 'Hatch/Sedan');
  first.applyCoupon('DAN10');
  assert.equal(load(storage).coupon().code, 'DAN10');
  assert.equal(load(fakeStorage({ 'dan-coupon': 'HACK', 'dan-cart': storage.data['dan-cart'] })).coupon(), null);
  first.clear();
  assert.equal(first.coupon(), null);
  assert.equal(load(storage).coupon(), null);
  assert.equal(load(storage).discountCents(), 0);
});

test('a coupon on an empty cart is stored but discounts nothing', function () {
  const cart = load(fakeStorage());
  assert.ok(cart.applyCoupon('DAN10').ok);
  assert.equal(cart.discountCents(), 0);
  assert.equal(cart.totalCents(), 0);
});

test('a fixed coupon reactivates when the subtotal returns to its minimum', function () {
  const cart = load(fakeStorage());
  cart.add('brake-pads', 1, 'Hatch/Sedan');
  cart.add('wheel-alignment', 1, 'Hatch/Sedan'); // 46980
  cart.applyCoupon('DAN50');
  cart.remove('brake-pads', 'Hatch/Sedan'); // 14990 < 25000
  assert.equal(cart.discountCents(), 0);
  assert.equal(cart.coupon().code, 'DAN50');
  cart.add('brake-pads', 1, 'Hatch/Sedan');
  assert.equal(cart.discountCents(), 5000);
});

test('same service in different portes yields distinct lines and the same porte increments', function () {
  const cart = load(fakeStorage());
  cart.add('oil-change', 1, 'Hatch/Sedan');
  cart.add('oil-change', 1, 'SUV/Picape');
  cart.add('oil-change', 1, 'Hatch/Sedan');
  const lines = cart.lines();
  assert.equal(lines.length, 2);
  assert.equal(lines[0].qty, 2);
  assert.equal(lines[1].qty, 1);
});

test('parts and labour split sums to the subtotal and persists across reloads', function () {
  const storage = fakeStorage();
  const cart = load(storage);
  cart.add('oil-change', 2, 'Hatch/Sedan'); // 40% labour
  cart.add('wheel-alignment', 1, 'SUV/Picape'); // 100% labour
  assert.equal(cart.laborCents(), 9996 * 2 + 14990);
  assert.equal(cart.partsCents(), (24990 - 9996) * 2);
  assert.equal(cart.partsCents() + cart.laborCents(), cart.subtotalCents());
  const lineSum = cart.lines().reduce(function (n, l) { return n + l.partsCents + l.laborCents; }, 0);
  assert.equal(lineSum, cart.subtotalCents());
  assert.equal(JSON.parse(storage.data['dan-cart']).length, 2);
  assert.equal(load(storage).laborCents(), cart.laborCents());
});

test('DAN10 and DAN50 discounts apply to the quote and invalid coupons are reported', function () {
  const cart = load(fakeStorage());
  cart.add('major-service', 1, 'Utilitario'); // 54990
  assert.ok(cart.applyCoupon('DAN10').ok);
  assert.equal(cart.discountCents(), 5499);
  assert.ok(cart.applyCoupon('dan50').ok);
  assert.equal(cart.discountCents(), 5000);
  assert.equal(cart.totalCents(), 49990);
  assert.equal(cart.applyCoupon('DAN99').ok, false);
  assert.equal(cart.coupon().code, 'DAN50', 'invalid code keeps the applied coupon');
});

test('labour + parts equals the unit price for every service, including rounding and the default share', function () {
  const products = vm.runInContext('window.DanProducts.all()', (function () {
    const ctx = { window: {} };
    vm.createContext(ctx);
    vm.runInContext(productsJs, ctx);
    return ctx;
  })());
  const expected = { 'wheel-alignment': 100, 'scanner-diagnosis': 100, 'tire-rotation': 100,
    'major-service': 35, 'timing-belt': 35, 'battery-replacement': 15, 'brake-discs': 30 };
  products.forEach(function (p) {
    const cart = load(fakeStorage());
    cart.add(p.id, 1, p.sizes[0]);
    const pct = Object.prototype.hasOwnProperty.call(expected, p.id) ? expected[p.id] : 40; // 40 = default
    assert.equal(cart.laborCents(), Math.round(p.priceCents * pct / 100), p.id);
    assert.equal(cart.laborCents() + cart.partsCents(), p.priceCents, p.id);
  });
  const cart = load(fakeStorage());
  cart.add('battery-replacement', 1, 'Hatch/Sedan'); // 42990 * 15% = 6448.5 -> 6449
  assert.equal(cart.laborCents(), 6449);
  assert.equal(cart.partsCents(), 36541);
  cart.add('tire-fitting', 1, 'Hatch/Sedan'); // not listed: default share
  assert.equal(cart.laborCents(), 6449 + Math.round(19990 * 0.4));
});

test('parts and labour are zero on an empty cart and ignore coupon discounts', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.laborCents(), 0);
  assert.equal(cart.partsCents(), 0);
  cart.add('brake-pads', 1, 'Hatch/Sedan');
  cart.applyCoupon('DAN10');
  assert.ok(cart.discountCents() > 0);
  assert.equal(cart.partsCents() + cart.laborCents(), cart.subtotalCents());
  assert.notEqual(cart.partsCents() + cart.laborCents(), cart.totalCents());
});
