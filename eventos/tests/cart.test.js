'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function load(storage) {
  const ctx = { window: {} };
  if (storage) ctx.window.localStorage = storage;
  vm.createContext(ctx);
  vm.runInContext(read('cart.js'), ctx);
  return ctx.window.DanCart;
}

function memStorage(initial) {
  const m = Object.assign({}, initial);
  return {
    getItem: (k) => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    _m: m
  };
}

const line = (o) => Object.assign({
  eventId: 'e', eventName: 'E', sectorId: 's', sectorName: 'S', lotId: 'lote-1', lotName: 'Lote 1',
  type: 'inteira', qty: 1, unitCents: 10000
}, o);

test('index.html loads cart.js before app.js', function () {
  const html = read('index.html');
  assert.ok(html.indexOf('src="cart.js"') !== -1);
  assert.ok(html.indexOf('src="cart.js"') < html.indexOf('src="app.js"'));
});

test('meia is 50% of base price', function () {
  const c = load();
  assert.equal(c.unitPrice(15000, 'inteira'), 15000);
  assert.equal(c.unitPrice(15000, 'meia'), 7500);
  const t = c.totals(c.addItem(c.emptyState(), line({ type: 'meia', qty: 2 })));
  assert.equal(t.subtotalCents, 10000);
});

test('service fee is 10% and shown in total', function () {
  const c = load();
  const t = c.totals(c.addItem(c.emptyState(), line({ qty: 2 })));
  assert.deepEqual(JSON.parse(JSON.stringify(t)),
    { tickets: 2, subtotalCents: 20000, discountCents: 0, serviceFeeCents: 2000, totalCents: 22000 });
});

test('DANSHOW10 gives 10% off, case-insensitive; unknown codes rejected', function () {
  const c = load();
  let st = c.addItem(c.emptyState(), line({ qty: 1 }));
  const bad = c.applyCoupon(st, 'NOPE');
  assert.equal(bad.ok, false);
  assert.equal(bad.state.coupon, '');
  const good = c.applyCoupon(st, ' danshow10 ');
  assert.equal(good.ok, true);
  assert.equal(good.state.coupon, 'DANSHOW10');
  const t = c.totals(good.state);
  assert.equal(t.discountCents, 1000);
  assert.equal(t.serviceFeeCents, 900);
  assert.equal(t.totalCents, 9900);
  assert.equal(c.applyCoupon(good.state, '').state.coupon, '');
});

test('same line merges, quantity is capped, setQty/remove work', function () {
  const c = load();
  let st = c.addItem(c.emptyState(), line({ qty: 6 }));
  st = c.addItem(st, line({ qty: 6 }));
  assert.equal(st.items.length, 1);
  assert.equal(st.items[0].qty, c.MAX_QTY);
  st = c.addItem(st, line({ type: 'meia' }));
  assert.equal(st.items.length, 2);
  st = c.setQty(st, 0, 3);
  assert.equal(st.items[0].qty, 3);
  st = c.removeItem(st, 0);
  assert.equal(st.items.length, 1);
  assert.equal(st.items[0].type, 'meia');
});

test('persists to localStorage under dan-tickets-cart and reloads', function () {
  const store = memStorage();
  const c = load(store);
  assert.equal(c.STORAGE_KEY, 'dan-tickets-cart');
  const st = c.applyCoupon(c.addItem(c.emptyState(), line({ qty: 2 })), 'DANSHOW10').state;
  c.save(st);
  assert.ok('dan-tickets-cart' in store._m);
  const again = load(store).load();
  assert.equal(again.items[0].qty, 2);
  assert.equal(again.coupon, 'DANSHOW10');
});

test('corrupt or tampered storage falls back safely', function () {
  assert.deepEqual(JSON.parse(JSON.stringify(load(memStorage({ 'dan-tickets-cart': '{oops' })).load())), { items: [], coupon: '' });
  const bad = JSON.stringify({ items: [line({ qty: -1 }), line({ type: 'vip' }), line({ unitCents: 'x' }), line({ qty: 2 })], coupon: 'HACK' });
  const st = load(memStorage({ 'dan-tickets-cart': bad })).load();
  assert.equal(st.items.length, 1);
  assert.equal(st.coupon, '');
  assert.deepEqual(JSON.parse(JSON.stringify(load().load())), { items: [], coupon: '' });
});
