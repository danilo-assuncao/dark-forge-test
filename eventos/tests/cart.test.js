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

test('CommonJS import works without DOM or global mutation and accepts injected storage', () => {
  const before = globalThis.DanCart;
  const cart = require('../cart.js');
  assert.equal(globalThis.DanCart, before);
  const storage = memStorage();
  const state = cart.applyCoupon(cart.addItem(cart.emptyState(), line({ type: 'meia', qty: 3 })), 'DANSHOW10').state;
  assert.equal(cart.save(state, storage), true);
  assert.deepEqual(cart.load(storage), state);
  assert.deepEqual(cart.totals(cart.load(storage)), {
    tickets: 3, subtotalCents: 15000, discountCents: 1500, serviceFeeCents: 1350, totalCents: 14850
  });
});

test('missing, denied and full storage are handled without throwing', () => {
  const cart = require('../cart.js');
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
  for (const storage of [null, denied]) {
    assert.deepEqual(cart.load(storage), cart.emptyState());
    assert.equal(cart.save(cart.emptyState(), storage), false);
  }
  const ctx = { window: {} };
  Object.defineProperty(ctx.window, 'localStorage', { get() { throw Error('denied'); } });
  vm.createContext(ctx);
  vm.runInContext(read('cart.js'), ctx);
  assert.equal(ctx.window.DanCart.load().items.length, 0);
  assert.equal(ctx.window.DanCart.save({ items: [], coupon: '' }), false);
});

test('invalid lines and quantities do not change the cart', () => {
  const cart = require('../cart.js');
  const state = cart.addItem(cart.emptyState(), line());
  for (const invalid of [null, line({ eventId: '' }), line({ sectorId: null }), line({ lotId: ' ' }),
    line({ qty: 1.5 }), line({ qty: Infinity }), line({ unitCents: Number.MAX_SAFE_INTEGER + 1 })]) {
    assert.equal(cart.addItem(state, invalid), state);
  }
  for (const qty of [NaN, Infinity, 1.5]) assert.equal(cart.setQty(state, 0, qty), state);
  assert.equal(cart.setQty(state, '0', 2), state);
});

test('cart operations preserve their inputs and keep lots and types separate', () => {
  const cart = require('../cart.js');
  const state = cart.addItem(cart.emptyState(), line());
  Object.freeze(state.items[0]); Object.freeze(state.items); Object.freeze(state);
  const merged = cart.addItem(state, line());
  assert.equal(merged.items[0].qty, 2);
  assert.equal(state.items[0].qty, 1);
  assert.equal(cart.setQty(state, 0, 3).items[0].qty, 3);
  assert.equal(cart.removeItem(state, 0).items.length, 0);
  assert.equal(cart.addItem(state, line({ lotId: 'lote-2' })).items.length, 2);
  assert.equal(cart.addItem(state, line({ type: 'meia' })).items.length, 2);
});

test('odd-cent prices round per ticket and coupon removal restores totals', () => {
  const cart = require('../cart.js');
  const state = cart.addItem(cart.emptyState(), line({ unitCents: 101, type: 'meia', qty: 3 }));
  const discounted = cart.applyCoupon(state, 'DANSHOW10').state;
  assert.deepEqual(cart.totals(discounted), {
    tickets: 3, subtotalCents: 153, discountCents: 15, serviceFeeCents: 14, totalCents: 152
  });
  assert.equal(cart.totals(cart.applyCoupon(discounted, '').state).totalCents, 168);
  assert.equal(cart.totals({ items: state.items, coupon: 'constructor' }).discountCents, 0);
});

test('cart route round-trips and UI explains the service fee basis', () => {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('app.js'), ctx);
  const sectors = ctx.window.DanSectors;
  assert.equal(sectors.buildHash(sectors.parseHash('#/sacola')), '#/sacola');
  assert.match(read('app.js'), /Taxa de serviço de 10% sobre o subtotal após descontos/);
  assert.match(read('app.js'), /if \(!cart.save\(st\)\)/);
  assert.match(read('index.html'), /href="#\/sacola"/);
});

// Minimal DOM harness exercises actual form handlers and renders without dependencies.
function mount(storage, hash) {
  class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.handlers = {}; this.value = ''; this.text = ''; }
    set textContent(value) { this.text = String(value); this.children = []; }
    get textContent() { return this.text + this.children.map(child => child.textContent).join(''); }
    appendChild(child) {
      this.children.push(child);
      if (this.tag === 'select' && (child.selected || this.children.length === 1)) this.value = child.value;
      return child;
    }
    setAttribute(key, value) { this.attrs[key] = value; }
    getAttribute(key) { return this.attrs[key] || null; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    fire(name) { this.handlers[name]({ preventDefault() {} }); }
  }
  const app = new Element('main');
  const count = new Element('span');
  const listeners = {};
  const window = {
    localStorage: storage, location: { hash },
    document: { readyState: 'complete', createElement: tag => new Element(tag), getElementById: id => id === 'app' ? app : count },
    addEventListener: (name, fn) => { listeners[name] = fn; }
  };
  const ctx = vm.createContext({ window });
  for (const file of ['events.js', 'cart.js', 'app.js']) vm.runInContext(read(file), ctx);
  function all(node = app) { return [node, ...node.children.flatMap(child => all(child))]; }
  return {
    app, count, window,
    find: predicate => all().find(predicate),
    navigate(hash) { window.location.hash = hash; listeners.hashchange(); }
  };
}

test('UI adds both ticket types, reloads the bag, applies and removes coupons, edits and removes lines', () => {
  const storage = memStorage();
  const page = mount(storage, '#/evento/rock-festival?setor=pista&lote=lote-2');
  const buy = page.find(n => n.tag === 'form');
  buy.fire('submit');
  page.find(n => n.name === 'tipo').value = 'meia';
  page.find(n => n.name === 'qtd').value = '2';
  buy.fire('submit');
  assert.equal(page.count.textContent, '3');
  const bag = mount(storage, '#/sacola');
  assert.match(bag.app.textContent, /Inteira.*R\$ 150,00/);
  assert.match(bag.app.textContent, /Meia.*R\$ 75,00/);
  assert.match(bag.app.textContent, /SubtotalR\$ 300,00.*TotalR\$ 330,00/);
  bag.find(n => n.name === 'cupom').value = ' danshow10 ';
  bag.find(n => n.tag === 'form').fire('submit');
  assert.match(bag.app.textContent, /Cupom DANSHOW10 \(10%\)− R\$ 30,00.*R\$ 27,00TotalR\$ 297,00/);
  bag.find(n => n.name === 'cupom').value = 'invalid';
  bag.find(n => n.tag === 'form').fire('submit');
  assert.match(bag.app.textContent, /Cupom inválido/);
  assert.equal(JSON.parse(storage._m['dan-tickets-cart']).coupon, 'DANSHOW10');
  bag.find(n => n.name === 'cupom').value = '';
  bag.find(n => n.tag === 'form').fire('submit');
  const quantity = bag.find(n => n.type === 'number');
  quantity.value = '1.5'; quantity.fire('change');
  assert.equal(quantity.value, '1');
  quantity.value = '2'; quantity.fire('change');
  assert.equal(bag.count.textContent, '4');
  bag.find(n => n.tag === 'button' && n.textContent === 'Remover').fire('click');
  assert.equal(bag.count.textContent, '2');
  bag.find(n => n.tag === 'button' && n.textContent === 'Remover').fire('click');
  assert.match(bag.app.textContent, /Sua sacola está vazia/);
  assert.equal(bag.count.textContent, '0');
});

test('UI reports partial additions and does not claim success when the line is full', () => {
  const storage = memStorage();
  const page = mount(storage, '#/evento/rock-festival?setor=pista&lote=lote-2');
  const buy = page.find(n => n.tag === 'form');
  page.find(n => n.name === 'qtd').value = '8';
  buy.fire('submit');
  page.find(n => n.name === 'qtd').value = '3';
  buy.fire('submit');
  assert.equal(page.count.textContent, '10');
  assert.match(page.app.textContent, /Adicionados 2 de 3 ingressos solicitados/);
  assert.equal(JSON.parse(storage._m['dan-tickets-cart']).items[0].qty, 10);
  storage.setItem = () => { throw Error('A full line must not write to storage'); };
  buy.fire('submit');
  assert.match(page.app.textContent, /Limite de 10 ingressos por evento, setor, lote e tipo atingido/);
  assert.doesNotMatch(page.app.textContent, /Adicionado à sacola|Não foi possível salvar/);
  assert.equal(page.count.textContent, '10');
});

test('UI reports failed persistence and restores the saved quantity', () => {
  const storage = memStorage();
  const cart = require('../cart.js');
  cart.save(cart.addItem(cart.emptyState(), line()), storage);
  storage.setItem = () => { throw Error('quota'); };
  const bag = mount(storage, '#/sacola');
  const quantity = bag.find(n => n.type === 'number');
  quantity.value = '3'; quantity.fire('change');
  assert.equal(quantity.value, '1');
  assert.equal(bag.count.textContent, '1');
  assert.match(bag.app.textContent, /Não foi possível salvar a sacola/);
  bag.navigate('#/evento/rock-festival?setor=pista&lote=lote-2');
  bag.find(n => n.tag === 'form').fire('submit');
  assert.match(bag.app.textContent, /Não foi possível salvar a sacola/);
  assert.equal(bag.count.textContent, '1');
});
