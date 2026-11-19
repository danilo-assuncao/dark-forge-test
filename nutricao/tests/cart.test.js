'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('../products.js');
const cartLib = require('../cart.js');

function memStore(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    data
  };
}
function make(initial) {
  const storage = memStore(initial);
  return { storage, cart: cartLib.create({ storage, catalog }) };
}

test('lines are keyed by id + presentation and persisted under dan-nutri-cart', () => {
  const { storage, cart } = make();
  assert.equal(cartLib.STORAGE_KEY, 'dan-nutri-cart');
  assert.ok(cart.add('whey-isolado', '300g'));
  assert.ok(cart.add('whey-isolado', '900g', 2));
  assert.ok(cart.add('whey-isolado', '300g'));
  assert.deepEqual(cart.items(), [
    { id: 'whey-isolado', presentation: '300g', qty: 2 },
    { id: 'whey-isolado', presentation: '900g', qty: 2 }
  ]);
  const saved = JSON.parse(storage.data.get('dan-nutri-cart'));
  assert.equal(saved.items.length, 2);
  const again = cartLib.create({ storage, catalog });
  assert.deepEqual(again.items(), cart.items());
});

test('rejects unknown products, invalid presentations and bad quantities', () => {
  const { cart } = make();
  assert.equal(cart.add('nope', '300g'), false);
  assert.equal(cart.add('whey-isolado', '60 caps'), false);
  assert.equal(cart.add('whey-isolado', '300g', 0), false);
  assert.equal(cart.items().length, 0);
  cart.add('omega-3', '60 caps', 500);
  assert.equal(cart.items()[0].qty, cartLib.MAX_QTY);
});

test('setQty and remove update lines; qty 0 removes', () => {
  const { cart } = make();
  cart.add('omega-3', '60 caps');
  assert.ok(cart.setQty('omega-3', '60 caps', 4));
  assert.equal(cart.items()[0].qty, 4);
  assert.ok(cart.setQty('omega-3', '60 caps', 0));
  assert.equal(cart.items().length, 0);
  assert.equal(cart.remove('omega-3', '60 caps'), false);
});

test('computes subtotal and combo protein/kcal', () => {
  const { cart } = make();
  cart.add('whey-concentrado', '300g', 2); // 2 x 8990; 48 g protein; 240 kcal
  cart.add('plano-saude', 'Mensal');       // 12990; 30 g; 520 kcal
  const t = cart.totals();
  assert.equal(t.subtotalCents, 2 * 8990 + 12990);
  assert.equal(t.proteinG, 78);
  assert.equal(t.kcal, 760);
  assert.equal(t.count, 3);
  assert.equal(t.discountCents, 0);
  assert.equal(t.totalCents, t.subtotalCents);
});

test('DANNUTRI10 gives 10% off, case-insensitive, and persists', () => {
  const { storage, cart } = make();
  cart.add('whey-isolado', '300g'); // 11990
  assert.equal(cart.applyCoupon(' dannutri10 '), true);
  const t = cart.totals();
  assert.equal(t.coupon, 'DANNUTRI10');
  assert.equal(t.discountCents, 1199);
  assert.equal(t.totalCents, 11990 - 1199);
  assert.equal(cartLib.create({ storage, catalog }).totals().coupon, 'DANNUTRI10');
  cart.removeCoupon();
  assert.equal(cart.totals().discountCents, 0);
});

test('DAN50 takes R$ 50 off only from the R$ 250 minimum', () => {
  const { cart } = make();
  assert.equal(cart.applyCoupon('DAN50'), true);
  cart.add('whey-isolado', '300g'); // 11990 < 25000
  assert.equal(cart.totals().discountCents, 0);
  cart.add('whey-isolado', '900g'); // 41980
  const t = cart.totals();
  assert.equal(t.discountCents, 5000);
  assert.equal(t.totalCents, t.subtotalCents - 5000);
  assert.equal(cart.applyCoupon('BOGUS'), false);
  assert.equal(cart.totals().coupon, 'DAN50');
});

test('corrupt or invalid stored data is ignored', () => {
  assert.deepEqual(make({ 'dan-nutri-cart': '{not json' }).cart.items(), []);
  const bad = JSON.stringify({ items: [
    { id: 'omega-3', presentation: '300g', qty: 1 },
    { id: 'omega-3', presentation: '60 caps', qty: 2 },
    { id: 'omega-3', presentation: '60 caps', qty: 3 },
    { id: 'x', presentation: '300g', qty: 1 }
  ], coupon: 'NOPE' });
  const { cart } = make({ 'dan-nutri-cart': bad });
  assert.deepEqual(cart.items(), [{ id: 'omega-3', presentation: '60 caps', qty: 2 }]);
  assert.equal(cart.totals().coupon, null);
});

test('works without storage and notifies subscribers', () => {
  const cart = cartLib.create({ storage: null, catalog });
  let last = null;
  const off = cart.subscribe((t) => { last = t; });
  cart.add('cafeina', '60 caps');
  assert.equal(last.subtotalCents, 4990);
  off();
  cart.clear();
  assert.equal(last.subtotalCents, 4990);
  assert.equal(cart.items().length, 0);
});

test('exposes window.DanNutriCart in a browser-like context', () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const store = memStore();
  const win = { localStorage: store };
  const ctx = vm.createContext({ window: win });
  vm.runInContext(read('products.js'), ctx);
  vm.runInContext(read('cart.js'), ctx);
  assert.ok(win.DanNutriCart.add('omega-3', '60 caps'));
  assert.ok(store.data.has('dan-nutri-cart'));
  assert.equal(win.DanNutriCart.totals().subtotalCents, 5990);
});

function stubCatalog(prices) {
  const products = Object.keys(prices).map((id) => ({
    id, presentations: ['300g'], priceCents: { '300g': prices[id] },
    macros: { kcal: 1, proteinG: 1, carbsG: 0 }
  }));
  return { find: (id) => products.find((p) => p.id === id) || null };
}

test('prototype keys stored as coupon are rejected and COUPONS is frozen', () => {
  for (const bad of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
    const { cart } = make({ 'dan-nutri-cart': JSON.stringify({ items: [], coupon: bad }) });
    assert.equal(cart.totals().coupon, null, bad);
    assert.equal(cart.applyCoupon(bad), false, bad);
  }
  assert.ok(Object.isFrozen(cartLib.COUPONS));
  assert.ok(Object.isFrozen(cartLib.COUPONS.DAN50));
});

test('DAN50 boundary at 24999/25000, discount cap and 10% rounding', () => {
  const run = (cents, code) => {
    const cart = cartLib.create({ storage: null, catalog: stubCatalog({ a: cents }) });
    cart.add('a', '300g');
    cart.applyCoupon(code);
    return cart.totals();
  };
  assert.equal(run(24999, 'DAN50').discountCents, 0);
  assert.equal(run(25000, 'DAN50').discountCents, 5000);
  assert.equal(run(25000, 'DAN50').totalCents, 20000);
  assert.equal(run(1005, 'DANNUTRI10').discountCents, 101);
  assert.equal(run(1004, 'DANNUTRI10').discountCents, 100);
  const small = cartLib.create({
    storage: null, catalog: stubCatalog({ a: 100 })
  });
  assert.equal(small.add('a', '300g'), true);
});

test('quantity normalisation through add and setQty', () => {
  const { cart } = make();
  assert.equal(cart.add('omega-3', '60 caps', NaN), false);
  assert.equal(cart.add('omega-3', '60 caps', -1), false);
  assert.equal(cart.add('omega-3', '60 caps', 1.9), true);
  assert.equal(cart.items()[0].qty, 1);
  assert.equal(cart.setQty('omega-3', '60 caps', 500), true);
  assert.equal(cart.items()[0].qty, cartLib.MAX_QTY);
  assert.equal(cart.setQty('omega-3', '60 caps', 2.7), true);
  assert.equal(cart.items()[0].qty, 2);
  for (const bad of ['', NaN, 'abc', null, undefined]) {
    assert.equal(cart.setQty('omega-3', '60 caps', bad), false, String(bad));
    assert.equal(cart.items()[0].qty, 2);
  }
  assert.equal(cart.setQty('omega-3', '60 caps', -3), true);
  assert.equal(cart.items().length, 0);
});

test('clear resets coupon; reload re-reads storage and notifies', () => {
  const { storage, cart } = make();
  cart.add('omega-3', '60 caps');
  cart.applyCoupon('DAN50');
  cart.clear();
  assert.equal(cart.totals().coupon, null);
  const other = cartLib.create({ storage, catalog });
  other.add('cafeina', '60 caps');
  let calls = 0;
  cart.subscribe(() => { calls++; });
  cart.reload();
  assert.equal(calls, 1);
  assert.deepEqual(cart.items().map((i) => i.id), ['cafeina']);
});

test('storage failures are tolerated', () => {
  const throwing = { getItem() { throw new Error('x'); }, setItem() { throw new Error('y'); } };
  const cart = cartLib.create({ storage: throwing, catalog });
  assert.equal(cart.add('omega-3', '60 caps'), true);
  assert.equal(cart.totals().subtotalCents, 5990);
});

test('stale lines whose product left the catalog are skipped in totals', () => {
  const live = { find: (id) => catalog.find(id) };
  let hide = false;
  const cat = { find: (id) => (hide && id === 'omega-3' ? null : live.find(id)) };
  const cart = cartLib.create({ storage: null, catalog: cat });
  cart.add('omega-3', '60 caps');
  cart.add('cafeina', '60 caps');
  hide = true;
  assert.equal(cart.totals().subtotalCents, 4990);
});

test('catalog is resolved lazily when products.js loads after cart.js', () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
  const store = memStore({ 'dan-nutri-cart': JSON.stringify({ items: [{ id: 'omega-3', presentation: '60 caps', qty: 2 }], coupon: null }) });
  const win = { localStorage: store };
  const ctx = vm.createContext({ window: win });
  vm.runInContext(read('cart.js'), ctx);
  assert.equal(win.DanNutriCart.add('omega-3', '60 caps'), false);
  assert.ok(store.data.get('dan-nutri-cart').includes('"qty":2'), 'saved cart untouched');
  vm.runInContext(read('products.js'), ctx);
  assert.equal(win.DanNutriCart.items()[0].qty, 2);
  assert.equal(win.DanNutriCart.add('omega-3', '60 caps'), true);
  assert.equal(win.DanNutriCart.items()[0].qty, 3);
});

test('subscribers: one call per mutation, none on rejection, errors isolated', () => {
  const { cart } = make();
  let a = 0, b = 0;
  cart.subscribe(() => { a++; throw new Error('boom'); });
  cart.subscribe(() => { b++; });
  assert.equal(cart.add('omega-3', '60 caps'), true);
  assert.deepEqual([a, b], [1, 1]);
  cart.add('nope', '300g');
  cart.setQty('nope', '300g', 2);
  cart.setQty('omega-3', '60 caps', 'abc');
  cart.remove('nope', '300g');
  assert.deepEqual([a, b], [1, 1]);
  cart.setQty('omega-3', '60 caps', 3);
  assert.deepEqual([a, b], [2, 2]);
});
