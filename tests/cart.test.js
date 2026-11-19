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
  assert.ok(cart.add('basic-tee', 1, 'M'));
  assert.ok(cart.add('basic-tee', 2, 'M'));
  assert.ok(cart.add('basic-tee', 1, 'G'));
  assert.ok(cart.add('hoodie', 1, 'P'));
  assert.equal(cart.count(), 5);
  assert.equal(cart.lines().length, 3);
  assert.deepEqual(Array.from(cart.lines().map(function (l) { return l.size; })), ['M', 'G', 'P']);
});

test('unknown products, sizes and invalid quantities are rejected', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.add('nope', 1, 'M'), false);
  assert.equal(cart.add('basic-tee', 1), false, 'size is required');
  assert.equal(cart.add('basic-tee', 1, 'XXL'), false);
  assert.equal(cart.add('basic-tee', 0, 'M'), false);
  assert.equal(cart.add('basic-tee', -3, 'M'), false);
  assert.equal(cart.add('basic-tee', NaN, 'M'), false);
  assert.equal(cart.count(), 0);
  assert.equal(cart.add('cap', 1, 'Tamanho \u00fanico'), false, 'removed product');
  assert.equal(cart.add('basic-tee', 1, 'Tamanho \u00fanico'), false, 'one-size sentinel is not a size');
  assert.equal(cart.count(), 0);
  assert.ok(cart.add('hoodie', 1, 'GG'));
});

test('total is computed in cents from quantities', function () {
  const cart = load(fakeStorage());
  cart.add('hoodie', 2, 'M'); // 21990 * 2
  cart.add('basic-tee', 1, 'M'); // 7990
  assert.equal(cart.totalCents(), 21990 * 2 + 7990);
  cart.setQty('hoodie', 'M', 1);
  assert.equal(cart.totalCents(), 21990 + 7990);
});

test('setQty changes, removes below 1 and caps at the maximum', function () {
  const cart = load(fakeStorage());
  cart.add('basic-tee', 1, 'M');
  cart.setQty('basic-tee', 'M', 5);
  assert.equal(cart.count(), 5);
  cart.setQty('basic-tee', 'M', 1000);
  assert.equal(cart.count(), cart.MAX_QTY);
  cart.setQty('basic-tee', 'M', 0);
  assert.equal(cart.count(), 0);
  assert.equal(cart.setQty('basic-tee', 'M', 2), false);
});

test('remove deletes one size line and clear empties the cart', function () {
  const cart = load(fakeStorage());
  cart.add('basic-tee', 1, 'M');
  cart.add('basic-tee', 1, 'G');
  cart.add('hoodie', 1, 'M');
  assert.ok(cart.remove('basic-tee', 'M'));
  assert.equal(cart.remove('basic-tee', 'M'), false);
  assert.equal(cart.lines().length, 2);
  cart.clear();
  assert.equal(cart.count(), 0);
});

test('the cart persists across reloads via storage', function () {
  const storage = fakeStorage();
  const first = load(storage);
  first.add('basic-tee', 3, 'M');
  first.add('hoodie', 1, 'G');
  const second = load(storage);
  assert.equal(second.count(), 4);
  assert.equal(second.totalCents(), 7990 * 3 + 21990);
  second.remove('basic-tee', 'M');
  assert.equal(load(storage).count(), 1);
});

test('corrupt or stale stored data is ignored safely', function () {
  assert.equal(load(fakeStorage({ 'dan-cart': '{not json' })).count(), 0);
  assert.equal(load(fakeStorage({ 'dan-cart': '{"a":1}' })).count(), 0);
  const stored = JSON.stringify([
    { id: 'ghost', size: 'M', qty: 2 }, { id: 'basic-tee', size: 'M', qty: 'x' }, null,
    { id: 'basic-tee', qty: 4 }, { id: 'basic-tee', size: 'XXL', qty: 4 },
    { id: 'basic-tee', size: 'M', qty: 2 }, { id: 'basic-tee', size: 'M', qty: 5 },
  ]);
  const cart = load(fakeStorage({ 'dan-cart': stored }));
  assert.equal(cart.count(), 2);
});

test('works without storage and listeners fire on change', function () {
  const cart = load(null);
  let calls = 0;
  cart.onChange(function () { calls++; });
  cart.add('basic-tee', 1, 'M');
  cart.setQty('basic-tee', 'M', 2);
  cart.remove('basic-tee', 'M');
  assert.equal(calls, 3);
});

test('index.html has a header cart link with a counter and loads cart.js before script.js', function () {
  assert.match(html, /href="#\/cart"[^>]*>Sacola \(<span id="cart-count">0<\/span>\)/);
  assert.ok(html.indexOf('cart.js') > html.indexOf('products.js'));
  assert.ok(html.indexOf('cart.js') < html.indexOf('script.js'));
});

test('add caps merged quantity at the maximum and reports no change when capped', function () {
  const cart = load(fakeStorage());
  cart.add('basic-tee', 98, 'M');
  assert.ok(cart.add('basic-tee', 5, 'M'));
  assert.equal(cart.count(), 99);
  assert.equal(cart.add('basic-tee', 1, 'M'), false);
  assert.ok(cart.add('basic-tee', 1, 'P'), 'another size is a separate line');
});

test('fractional quantities are floored and stored quantities are capped on load', function () {
  const cart = load(fakeStorage());
  cart.add('basic-tee', 1.5, 'M');
  assert.equal(cart.count(), 1);
  const big = load(fakeStorage({ 'dan-cart': JSON.stringify([{ id: 'basic-tee', size: 'M', qty: 500 }]) }));
  assert.equal(big.count(), 99);
});

test('storage failures keep the cart working in memory', function () {
  const throwing = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); },
  };
  const cart = load(throwing);
  assert.ok(cart.add('basic-tee', 2, 'M'));
  assert.equal(cart.count(), 2);
  const win = {};
  Object.defineProperty(win, 'localStorage', { get() { throw new Error('denied'); } });
  const cart2 = load(null, win);
  assert.ok(cart2.add('basic-tee', 1, 'M'));
  assert.equal(cart2.count(), 1);
});

test('reload re-reads storage and notifies listeners', function () {
  const storage = fakeStorage();
  const cart = load(storage);
  let calls = 0;
  cart.onChange(function () { calls++; });
  storage.setItem('dan-cart', JSON.stringify([{ id: 'hoodie', size: 'M', qty: 2 }]));
  cart.reload();
  assert.equal(calls, 1);
  assert.equal(cart.count(), 2);
});

test('coupons: percent discount, case-insensitive codes, invalid codes and removal', function () {
  const cart = load(fakeStorage());
  cart.add('hoodie', 1, 'M'); // 21990
  assert.deepEqual(JSON.parse(JSON.stringify(cart.applyCoupon('nope'))), { ok: false, message: 'This coupon is not valid.' });
  assert.equal(cart.applyCoupon('  ').ok, false);
  assert.equal(cart.coupon(), null);
  assert.equal(cart.applyCoupon(' dan10 ').ok, true);
  assert.equal(cart.coupon().code, 'DAN10');
  assert.equal(cart.subtotalCents(), 21990);
  assert.equal(cart.discountCents(), 2199);
  assert.equal(cart.totalCents(), 19791);
  assert.ok(cart.removeCoupon());
  assert.equal(cart.removeCoupon(), false);
  assert.equal(cart.totalCents(), 21990);
});

test('fixed coupon needs its minimum subtotal and stops applying when the cart shrinks', function () {
  const cart = load(fakeStorage());
  cart.add('basic-tee', 1, 'M'); // 7990
  const refused = cart.applyCoupon('DAN50');
  assert.equal(refused.ok, false);
  assert.match(refused.message, /R\$ 250,00/);
  cart.add('denim-jacket', 1, 'M'); // 29990 -> 37980
  assert.ok(cart.applyCoupon('DAN50').ok);
  assert.equal(cart.discountCents(), 5000);
  assert.equal(cart.totalCents(), 37980 - 5000);
  cart.remove('denim-jacket', 'M'); // 7990 < minimum
  assert.equal(cart.discountCents(), 0);
  assert.equal(cart.totalCents(), 7990);
});

test('the coupon persists with the cart, is dropped when invalid and cleared with the cart', function () {
  const storage = fakeStorage();
  const first = load(storage);
  first.add('hoodie', 1, 'M');
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
  cart.add('denim-jacket', 1, 'M');
  cart.add('hoodie', 1, 'M'); // 51980
  cart.applyCoupon('DAN50');
  cart.remove('denim-jacket', 'M'); // 21990 < 25000
  assert.equal(cart.discountCents(), 0);
  assert.equal(cart.coupon().code, 'DAN50');
  cart.add('denim-jacket', 1, 'M');
  assert.equal(cart.discountCents(), 5000);
});
