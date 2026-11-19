'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../catalog.js');
const K = require('../cart.js');

const ROOT = path.join(__dirname, '..');

function memStorage(initial) {
  const data = new Map(Object.entries(initial || {}));
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { data.set(k, String(v)); },
    data,
  };
}

test('storage key and constants', () => {
  assert.equal(K.STORAGE_KEY, 'dan-pets-cart');
  assert.equal(K.SUBSCRIPTION_PERCENT, 5);
  assert.equal(K.COUPONS.DANPET10, 10);
});

test('lines are indexed by item + size and merge quantities', () => {
  const cart = K.createCart(memStorage());
  assert.equal(cart.add('banho-simples', 'mini', 'avulsa'), true);
  assert.equal(cart.add('banho-simples', 'medio', 'avulsa'), true);
  assert.equal(cart.add('banho-simples', 'mini', 'avulsa', 2), true);
  const t = cart.totals();
  assert.equal(t.lines.length, 2);
  assert.equal(t.lines[0].qty, 3);
  assert.equal(t.lines[1].size, 'medio');
  assert.equal(t.count, 4);
  assert.equal(t.subtotal, 3 * 5000 + 7000);
});

test('rejects unknown items and sizes the item does not offer', () => {
  const cart = K.createCart(memStorage());
  assert.equal(cart.add('nope', 'mini'), false);
  assert.equal(cart.add('arranhador', 'grande'), false);
  assert.equal(cart.add('suplemento-articular', 'mini'), false);
  assert.equal(cart.totals().lines.length, 0);
});

test('persists to localStorage key dan-pets-cart and reloads', () => {
  const st = memStorage();
  const cart = K.createCart(st);
  cart.add('vermifugo', 'grande', 'assinatura', 2);
  cart.applyCoupon('danpet10');
  assert.ok(st.data.has('dan-pets-cart'));
  const saved = JSON.parse(st.data.get('dan-pets-cart'));
  assert.deepEqual(saved.lines, [{ itemId: 'vermifugo', size: 'grande', qty: 2, mode: 'assinatura' }]);
  assert.equal(saved.coupon, 'DANPET10');
  const again = K.createCart(st).totals();
  assert.equal(again.lines.length, 1);
  assert.equal(again.lines[0].mode, 'assinatura');
  assert.equal(again.coupon, 'DANPET10');
});

test('corrupt or stale storage is tolerated', () => {
  assert.equal(K.createCart(memStorage({ 'dan-pets-cart': '{not json' })).totals().lines.length, 0);
  assert.equal(K.createCart(memStorage({ 'dan-pets-cart': '{"lines":"x"}' })).totals().lines.length, 0);
  const st = memStorage({ 'dan-pets-cart': JSON.stringify({
    lines: [
      { itemId: 'gone', size: 'mini', qty: 1 },
      { itemId: 'arranhador', size: 'grande', qty: 1 },
      { itemId: 'osso-natural', size: 'mini', qty: -5, mode: 'weird' },
      { itemId: 'osso-natural', size: 'mini', qty: 3 },
      null,
    ],
    coupon: 'FAKE',
  }) });
  const t = K.createCart(st).totals();
  assert.equal(t.lines.length, 1);
  assert.equal(t.lines[0].qty, 1);
  assert.equal(t.lines[0].mode, 'avulsa');
  assert.equal(t.coupon, null);
  assert.doesNotThrow(() => K.createCart(null).add('osso-natural', 'mini'));
  const broken = { getItem() { throw new Error('x'); }, setItem() { throw new Error('y'); } };
  const c = K.createCart(broken);
  assert.equal(c.add('osso-natural', 'mini'), true);
});

test('subscription gives 5% off, one-off does not', () => {
  const cart = K.createCart(memStorage());
  cart.add('osso-natural', 'mini', 'avulsa'); // 2490
  cart.add('racao-caes-adultos', 'mini', 'assinatura'); // 18990 -> 5% = 949.5 -> 950
  const t = cart.totals();
  assert.equal(t.lines[0].discount, 0);
  assert.equal(t.lines[1].discount, 950);
  assert.equal(t.subscriptionDiscount, 950);
  assert.equal(t.total, 2490 + 18990 - 950);
  cart.setMode('osso-natural', 'mini', 'assinatura');
  assert.equal(cart.totals().lines[0].discount, 125); // 124.5 rounds up
  assert.equal(cart.setMode('osso-natural', 'mini', 'bogus'), false);
  assert.equal(cart.setMode('x', 'mini', 'avulsa'), false);
});

test('DANPET10 takes 10% off after the subscription discount', () => {
  const cart = K.createCart(memStorage());
  cart.add('banho-e-tosa', 'mini', 'assinatura'); // 9000 -> 450 off -> 8550
  assert.equal(cart.applyCoupon('  Danpet10 '), true);
  let t = cart.totals();
  assert.equal(t.couponDiscount, 855);
  assert.equal(t.total, 7695);
  cart.setMode('banho-e-tosa', 'mini', 'avulsa');
  t = cart.totals();
  assert.equal(t.couponDiscount, 900);
  assert.equal(t.total, 8100);
  cart.removeCoupon();
  assert.equal(cart.totals().total, 9000);
});

test('invalid coupon is rejected and keeps the current one', () => {
  const cart = K.createCart(memStorage());
  cart.add('osso-natural', 'mini');
  assert.equal(cart.applyCoupon('NOPE'), false);
  assert.equal(cart.applyCoupon(''), false);
  assert.equal(cart.applyCoupon(undefined), false);
  assert.equal(cart.totals().couponDiscount, 0);
  cart.applyCoupon('DANPET10');
  assert.equal(cart.applyCoupon('NOPE'), false);
  assert.equal(cart.totals().coupon, 'DANPET10');
});

test('setQty, remove and clear', () => {
  const st = memStorage();
  const cart = K.createCart(st);
  cart.add('osso-natural', 'mini');
  assert.equal(cart.setQty('osso-natural', 'mini', 5), true);
  assert.equal(cart.totals().count, 5);
  assert.equal(cart.setQty('osso-natural', 'mini', 500), true);
  assert.equal(cart.totals().count, 99);
  assert.equal(cart.setQty('osso-natural', 'grande', 2), false);
  assert.equal(cart.setQty('osso-natural', 'mini', 0), true); // removes
  assert.equal(cart.totals().lines.length, 0);
  assert.equal(cart.remove('osso-natural', 'mini'), false);
  cart.add('osso-natural', 'mini');
  cart.applyCoupon('DANPET10');
  cart.clear();
  assert.deepEqual(JSON.parse(st.data.get('dan-pets-cart')), { lines: [], coupon: null });
  assert.equal(K.lineKey('a', 'mini'), 'a|mini');
});

test('empty cart totals are zero even with a coupon', () => {
  const cart = K.createCart(memStorage());
  cart.applyCoupon('DANPET10');
  const t = cart.totals();
  assert.equal(t.total, 0);
  assert.equal(t.couponDiscount, 0);
});

// --- UI wiring (fake DOM) ---
function fakeNode(tag) {
  return {
    tagName: tag, className: '', textContent: '', children: [], attrs: {}, dataset: {}, listeners: {},
    type: '', href: '', value: '', hidden: false, disabled: false,
    get firstChild() { return this.children[0] || null; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(e, f) { this.listeners[e] = f; },
  };
}
const walk = (n, out = []) => { out.push(n); n.children.forEach((c) => walk(c, out)); return out; };
const texts = (n) => walk(n).map((x) => x.textContent).filter(Boolean);

function boot(storage) {
  const els = {};
  ['categories', 'search', 'catalog', 'empty', 'list-view', 'detail-view', 'sizes', 'cart'].forEach((id) => { els[id] = fakeNode(id); });
  let listener;
  const win = {
    DanPetsCatalog: C, DanPetsCart: K, localStorage: storage,
    location: { hash: '' }, addEventListener: (e, f) => { listener = f; },
  };
  const document = { getElementById: (id) => els[id], querySelector: () => fakeNode('tbody'), createElement: fakeNode };
  const ctx = { window: win, document };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), ctx);
  return { els, go: (h) => { win.location.hash = h; listener(); } };
}

test('UI: add to cart with subscription, coupon, persistence across reload', () => {
  const st = memStorage();
  const { els, go } = boot(st);
  assert.ok(texts(els.cart).some((t) => /vazia/.test(t)));
  go('#/item/banho-simples?size=medio');
  const d = els['detail-view'];
  const modes = walk(d).find((n) => n.className === 'modes');
  modes.children[1].listeners.click();
  assert.equal(modes.children[1].attrs['aria-pressed'], 'true');
  walk(d).find((n) => n.className === 'cta').listeners.click();
  assert.ok(texts(els.cart).some((t) => /Banho - Medio x1 \(assinatura mensal\): R\$ 66,50/.test(t)));
  assert.equal(JSON.parse(st.data.get('dan-pets-cart')).lines[0].mode, 'assinatura');
  const input = walk(els.cart).find((n) => n.tagName === 'input');
  input.value = 'DANPET10';
  walk(els.cart).find((n) => n.textContent === 'Aplicar cupom').listeners.click();
  assert.ok(texts(els.cart).some((t) => /^Total: R\$ 59,85$/.test(t)));
  const again = boot(st);
  assert.ok(texts(again.els.cart).some((t) => /^Total: R\$ 59,85$/.test(t)));
});

test('UI: invalid coupon message, qty and remove buttons', () => {
  const st = memStorage();
  const { els, go } = boot(st);
  go('#/item/osso-natural?size=mini');
  walk(els['detail-view']).find((n) => n.className === 'cta').listeners.click();
  const click = (label) => walk(els.cart).find((n) => n.textContent === label).listeners.click();
  walk(els.cart).find((n) => n.tagName === 'input').value = 'BAD';
  click('Aplicar cupom');
  assert.ok(texts(els.cart).some((t) => /Cupom invalido/.test(t)));
  click('+');
  assert.ok(texts(els.cart).some((t) => /x2/.test(t)));
  click('Assinar');
  assert.ok(texts(els.cart).some((t) => /Desconto assinatura/.test(t)));
  click('-');
  click('Remover');
  assert.ok(texts(els.cart).some((t) => /vazia/.test(t)));
});

test('index.html loads cart.js before app.js and has the cart container', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /id="cart"/);
  assert.ok(html.indexOf('cart.js') !== -1 && html.indexOf('cart.js') < html.indexOf('app.js'));
});
