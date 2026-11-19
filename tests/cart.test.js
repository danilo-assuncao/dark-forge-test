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

function load(storage) {
  const ctx = { window: { localStorage: storage } };
  vm.createContext(ctx);
  vm.runInContext(productsJs, ctx);
  vm.runInContext(cartJs, ctx);
  return ctx.window.DanCart;
}

test('add merges quantities and counts items', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.count(), 0);
  assert.ok(cart.add('creatine'));
  assert.ok(cart.add('creatine', 2));
  assert.ok(cart.add('magnesium'));
  assert.equal(cart.count(), 4);
  assert.equal(cart.lines().length, 2);
});

test('unknown products and invalid quantities are rejected', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.add('nope'), false);
  assert.equal(cart.add('creatine', 0), false);
  assert.equal(cart.add('creatine', -3), false);
  assert.equal(cart.add('creatine', NaN), false);
  assert.equal(cart.count(), 0);
});

test('total is computed in cents from quantities', function () {
  const cart = load(fakeStorage());
  cart.add('whey-protein', 2); // 15990 * 2
  cart.add('creatine'); // 8990
  assert.equal(cart.totalCents(), 15990 * 2 + 8990);
  cart.setQty('whey-protein', 1);
  assert.equal(cart.totalCents(), 15990 + 8990);
});

test('setQty changes, removes below 1 and caps at the maximum', function () {
  const cart = load(fakeStorage());
  cart.add('creatine');
  cart.setQty('creatine', 5);
  assert.equal(cart.count(), 5);
  cart.setQty('creatine', 1000);
  assert.equal(cart.count(), cart.MAX_QTY);
  cart.setQty('creatine', 0);
  assert.equal(cart.count(), 0);
  assert.equal(cart.setQty('creatine', 2), false);
});

test('remove deletes a line and clear empties the cart', function () {
  const cart = load(fakeStorage());
  cart.add('creatine');
  cart.add('magnesium');
  assert.ok(cart.remove('creatine'));
  assert.equal(cart.remove('creatine'), false);
  assert.equal(cart.lines().length, 1);
  cart.clear();
  assert.equal(cart.count(), 0);
});

test('the cart persists across reloads via storage', function () {
  const storage = fakeStorage();
  const first = load(storage);
  first.add('creatine', 3);
  first.add('magnesium');
  const second = load(storage);
  assert.equal(second.count(), 4);
  assert.equal(second.totalCents(), 8990 * 3 + 4690);
  second.remove('creatine');
  assert.equal(load(storage).count(), 1);
});

test('corrupt or stale stored data is ignored safely', function () {
  assert.equal(load(fakeStorage({ 'dan-cart': '{not json' })).count(), 0);
  assert.equal(load(fakeStorage({ 'dan-cart': '{"a":1}' })).count(), 0);
  const stored = JSON.stringify([
    { id: 'ghost', qty: 2 }, { id: 'creatine', qty: 'x' }, null,
    { id: 'creatine', qty: 2 }, { id: 'creatine', qty: 5 },
  ]);
  const cart = load(fakeStorage({ 'dan-cart': stored }));
  assert.equal(cart.count(), 2);
});

test('works without storage and listeners fire on change', function () {
  const cart = load(null);
  let calls = 0;
  cart.onChange(function () { calls++; });
  cart.add('creatine');
  cart.setQty('creatine', 2);
  cart.remove('creatine');
  assert.equal(calls, 3);
});

test('index.html has a header cart link with a counter and loads cart.js before script.js', function () {
  assert.match(html, /href="#\/cart"[^>]*>Cart \(<span id="cart-count">0<\/span>\)/);
  assert.ok(html.indexOf('cart.js') > html.indexOf('products.js'));
  assert.ok(html.indexOf('cart.js') < html.indexOf('script.js'));
});
