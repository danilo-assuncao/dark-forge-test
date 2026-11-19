/* End-to-end flow: home -> catalog -> detail -> cart with DAN10 -> checkout
   with CEP shipping -> confirmation. script.js runs in a vm with a fake DOM. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = function (f) { return fs.readFileSync(path.join(ROOT, f), 'utf8'); };

function makeNode(tag) {
  const node = {
    tagName: tag, className: '', children: [], attrs: {}, listeners: {},
    appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : (k === 'href' ? this.href : null); },
    removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(t, fn) { this.listeners[t] = fn; },
    focus() { this.focusCount = (this.focusCount || 0) + 1; },
  };
  let text = '';
  Object.defineProperty(node, 'textContent', {
    get() { return text; },
    set(v) { text = v; if (v === '') { node.children = []; } },
  });
  return node;
}

function walk(n, fn) { fn(n); n.children.forEach(function (c) { walk(c, fn); }); }
function find(app, pred) { const out = []; walk(app, function (n) { if (pred(n)) { out.push(n); } }); return out; }
function byClass(app, cls) {
  return find(app, function (n) { return n.className.split(' ').indexOf(cls) !== -1; });
}

function boot(hash, load) {
  const app = makeNode('main');
  const store = {};
  const win = { location: { hash: hash }, listeners: {},
    localStorage: { getItem(k) { return k in store ? store[k] : null; }, setItem(k, v) { store[k] = String(v); } },
    addEventListener(t, fn) { win.listeners[t] = fn; } };
  const badge = makeNode('span');
  const doc = {
    readyState: 'complete', title: '', createElement: makeNode,
    getElementById(id) { return id === 'app' ? app : (id === 'cart-count' ? badge : null); },
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
  };
  const ctx = { window: win, document: doc };
  vm.createContext(ctx);
  (load || ['products.js', 'cart.js', 'checkout.js', 'script.js']).forEach(function (f) {
    vm.runInContext(read(f), ctx);
  });
  return { app, win, doc, badge, store, go(h) { win.location.hash = h; win.listeners.hashchange(); } };
}

const VALID = { name: 'Maria Silva', cep: '01310-100' };

function fill(t, values) {
  find(t.app, function (n) { return n.tagName === 'input' && n.type !== 'radio'; }).forEach(function (i) { i.value = values[i.name] || ''; });
}
function typeCep(t, value) {
  const cep = find(t.app, function (n) { return n.tagName === 'input' && n.name === 'cep'; })[0];
  cep.value = value;
  cep.listeners.input();
}
function submit(t) {
  find(t.app, function (n) { return n.tagName === 'form'; })[0].listeners.submit({ preventDefault() {} });
}
function text(t, cls) { return byClass(t.app, cls)[0].textContent; }

test('checkout.js quotes shipping by CEP and rejects invalid CEPs', function () {
  const ctx = { window: {} };
  vm.runInNewContext(read('checkout.js'), ctx);
  const api = ctx.window.DanCheckout;
  const expected = [
    ['Grande São Paulo', 1490], ['Interior de São Paulo', 1890], ['Rio de Janeiro e Espírito Santo', 2190],
    ['Minas Gerais', 2290], ['Bahia e Sergipe', 2990], ['Nordeste', 3290], ['Norte e Nordeste', 3890],
    ['Centro-Oeste', 2890], ['Paraná e Santa Catarina', 2490], ['Rio Grande do Sul', 2690],
  ];
  expected.forEach(function (e, d) {
    const q = api.quote(d + '1310-100');
    assert.equal(q.region, e[0], 'region ' + d);
    assert.equal(q.cents, e[1], 'cents ' + d);
  });
  assert.equal(api.quote('01310100').cep, '01310100');
  assert.equal(api.quote(' 01310-100 ').cep, '01310100');
  assert.equal(api.quote('0131010'), null);
  ['', '1234', '0131-0100', '012345678', 'abcdefgh', null, undefined].forEach(function (bad) {
    assert.equal(api.quote(bad), null, String(bad));
  });
});

test('home shows the Dan Food hero, featured dishes linking to detail, and a catalog call', function () {
  const t = boot('#/');
  assert.equal(text(t, 'hero-eyebrow'), 'Cozinha Dan Food');
  assert.equal(byClass(t.app, 'action-button')[0].href, '#/catalog');
  const cards = byClass(t.app, 'product-card');
  assert.equal(cards.length, 4);
  cards.forEach(function (c) { assert.match(c.href, /^#\/produto\//); });
  assert.equal(byClass(t.app, 'showcase-link')[0].href, '#/catalog');
});

test('full flow: catalog, detail, bag with DAN10, delivery checkout by CEP, tracking code', function () {
  const t = boot('#/');
  t.go('#/catalog');
  assert.ok(byClass(t.app, 'product-card').length >= 10);
  t.go('#/produto/file-parmegiana');
  byClass(t.app, 'size-button').filter(function (b) { return b.textContent === 'Individual'; })[0].listeners.click();
  const add = byClass(t.app, 'add-to-cart')[0];
  add.listeners.click();
  add.listeners.click();
  assert.equal(t.badge.textContent, '2');

  t.go('#/cart');
  const input = find(t.app, function (n) { return n.tagName === 'input'; })[0];
  input.value = 'dan10';
  find(t.app, function (n) { return n.tagName === 'form'; })[0].listeners.submit({ preventDefault() {} });
  assert.equal(text(t, 'cart-total'), 'Total: R$ 71,82');

  t.go('#/checkout');
  assert.equal(text(t, 'cart-name'), '2 × File a parmegiana (Individual)');
  assert.equal(text(t, 'cart-discount'), 'Cupom DAN10: −R$ 7,98');
  assert.equal(text(t, 'shipping-line'), 'Delivery: informe o CEP');
  assert.equal(text(t, 'grand-total'), 'Total com delivery: R$ 71,82 + delivery');
  typeCep(t, '01310-100');
  assert.equal(text(t, 'shipping-line'), 'Delivery para Grande São Paulo: R$ 14,90');
  assert.equal(text(t, 'grand-total'), 'Total com delivery: R$ 86,72');
  typeCep(t, '9001');
  assert.equal(text(t, 'shipping-line'), 'Delivery: informe o CEP');
  const cepInput = find(t.app, function (n) { return n.tagName === 'input' && n.name === 'cep'; })[0];
  cepInput.value = '90010-000';
  cepInput.listeners.change();
  assert.equal(text(t, 'shipping-line'), 'Delivery para Rio Grande do Sul: R$ 26,90');

  fill(t, VALID);
  submit(t);
  assert.equal(find(t.app, function (n) { return n.tagName === 'h1'; })[0].textContent, 'Pedido confirmado');
  assert.match(text(t, 'order-confirmation'), /Maria Silva.*R\$ 86,72/);
  assert.match(text(t, 'order-protocol'), /^Código de acompanhamento: DAN-[A-Z2-9]{4}$/);
  assert.equal(text(t, 'order-mode'), 'Modalidade: Delivery por CEP');
  assert.equal(text(t, 'order-eta'), 'Tempo estimado: 45 min');
  assert.equal(t.badge.textContent, '0');
  assert.deepEqual(JSON.parse(t.store['dan-cart']), []);
  t.go('#/checkout');
  assert.equal(byClass(t.app, 'cart-empty').length, 1);
});

test('different CEP regions change the confirmed total; invalid data keeps the cart', function () {
  const t = boot('#/produto/frango-grelhado');
  byClass(t.app, 'size-button')[0].listeners.click();
  byClass(t.app, 'add-to-cart')[0].listeners.click();
  t.go('#/checkout');
  fill(t, Object.assign({}, VALID, { cep: '123' }));
  submit(t);
  const cepError = find(t.app, function (n) { return n.id === 'checkout-cep-error'; })[0];
  assert.match(cepError.textContent, /CEP com 8 d/);
  assert.equal(byClass(t.app, 'order-confirmation').length, 0);
  assert.equal(t.badge.textContent, '1');
  fill(t, Object.assign({}, VALID, { cep: '90010000' }));
  submit(t);
  assert.match(text(t, 'order-confirmation'), /R\$ 59,80/);
});

test('without checkout.js a valid order is blocked instead of confirmed with no shipping', function () {
  const t = boot('#/produto/frango-grelhado', ['products.js', 'cart.js', 'script.js']);
  byClass(t.app, 'size-button')[0].listeners.click();
  byClass(t.app, 'add-to-cart')[0].listeners.click();
  t.go('#/checkout');
  fill(t, VALID);
  submit(t);
  assert.equal(byClass(t.app, 'order-confirmation').length, 0);
  assert.match(find(t.app, function (n) { return n.id === 'checkout-cep-error'; })[0].textContent, /entrega está indispon/);
  assert.equal(t.badge.textContent, '1');
});

test('index.html loads checkout.js before script.js', function () {
  const html = read('index.html');
  assert.ok(html.indexOf('checkout.js') !== -1);
  assert.ok(html.indexOf('checkout.js') < html.indexOf('script.js'));
});

test('home shows the combos of the day with their dishes and a combo add button', function () {
  const t = boot('#/');
  assert.equal(text(t, 'showcase-title'), 'Combos do dia');
  const combos = byClass(t.app, 'combo-card');
  assert.equal(combos.length, 3);
  assert.ok(byClass(combos[0], 'combo-dishes')[0].children.length >= 2);
  assert.equal(byClass(combos[0], 'product-price')[0].textContent, 'R$ 42,80');
  byClass(combos[0], 'combo-add')[0].listeners.click();
  assert.equal(byClass(combos[0], 'combo-status')[0].textContent, 'Combo Executivo adicionado à sacola.');
  assert.equal(t.badge.textContent, '2');
  assert.deepEqual(t.win.DanCart.lines().map(function (l) { return l.id + ':' + l.size + ':' + l.qty; }),
    ['frango-grelhado:Individual:1', 'suco-natural:Individual:1']);
});

test('combo add is all-or-nothing: a dish at the cap blocks the whole combo', function () {
  const t = boot('#/');
  const cart = t.win.DanCart;
  for (let i = 0; i < cart.MAX_QTY; i++) { cart.add('suco-natural', 1, 'Individual'); }
  const card = byClass(t.app, 'combo-card')[0];
  byClass(card, 'combo-add')[0].listeners.click();
  assert.equal(byClass(card, 'combo-status')[0].textContent, 'Quantidade máxima atingida: nada foi adicionado.');
  assert.equal(cart.lines().filter(function (l) { return l.id === 'frango-grelhado'; }).length, 0);
  assert.equal(cart.count(), cart.MAX_QTY);
});

test('combo add without cart.js reports the bag as unavailable', function () {
  const t = boot('#/', ['products.js', 'checkout.js', 'script.js']);
  const card = byClass(t.app, 'combo-card')[0];
  byClass(card, 'combo-add')[0].listeners.click();
  assert.equal(byClass(card, 'combo-status')[0].textContent, 'Sacola indisponível no momento.');
});

test('DanProducts.combos() resolves every dish, sums prices and exposes addable portions', function () {
  const ctx = { window: {} };
  vm.runInNewContext(read('products.js') + read('cart.js'), ctx);
  const combos = ctx.window.DanProducts.combos();
  assert.ok(combos.length > 0);
  combos.forEach(function (c) {
    assert.ok(c.dishes.length >= 2, c.id);
    c.dishes.forEach(function (d) { assert.ok(d && d.id, c.id + ' has an unresolved dish'); });
    assert.equal(c.priceCents, c.dishes.reduce(function (n, d) { return n + d.priceCents; }, 0), c.id);
    assert.equal(c.portions.length, c.dishes.length, c.id);
    c.dishes.forEach(function (d, i) {
      assert.equal(c.portions[i], d.sizes[0], c.id);
      assert.equal(ctx.window.DanCart.add(d.id, 1, c.portions[i]), true, c.id + ' ' + d.id);
    });
  });
});

test('pickup without checkout.js reports the unavailable calculation instead of confirming', function () {
  const t = boot('#/produto/frango-grelhado', ['products.js', 'cart.js', 'script.js']);
  byClass(t.app, 'size-button')[0].listeners.click();
  byClass(t.app, 'add-to-cart')[0].listeners.click();
  t.go('#/checkout');
  fill(t, VALID);
  find(t.app, function (n) { return n.type === 'radio' && n.value === 'pickup'; })[0].listeners.change();
  submit(t);
  assert.equal(byClass(t.app, 'order-confirmation').length, 0);
  assert.match(text(t, 'shipping-line'), /entrega está indispon/);
});

test('CEP validation blocks the booking and nothing is cleared', function () {
  const t = boot('#/produto/frango-grelhado');
  byClass(t.app, 'size-button')[0].listeners.click();
  byClass(t.app, 'add-to-cart')[0].listeners.click();
  t.go('#/checkout');
  ['', '1234567', '123456789', '01310-10a', '0131-0100'].forEach(function (cep) {
    fill(t, Object.assign({}, VALID, { cep: cep }));
    submit(t);
    assert.notEqual(find(t.app, function (n) { return n.id === 'checkout-cep-error'; })[0].textContent, '', cep);
    assert.equal(byClass(t.app, 'order-protocol').length, 0);
  });
  assert.equal(t.badge.textContent, '1');
});

function api() {
  const ctx = { window: {} };
  vm.runInNewContext(read('checkout.js'), ctx);
  return ctx.window.DanCheckout;
}

test('quote estimates delivery minutes for every CEP range', function () {
  const expected = [45, 75, 120, 150, 180, 210, 300, 180, 150, 165];
  const actual = expected.map(function (_, d) { return api().quote(d + '1310-100').minutes; });
  assert.deepEqual(actual, expected);
});

test('fulfillment pickup is free, needs no CEP and has fixed minutes', function () {
  const a = api();
  [undefined, null, 'invalid', '01310-100'].forEach(function (cep) {
    const f = a.fulfillment('pickup', cep);
    assert.deepEqual([f.mode, f.cents, f.minutes, f.region, f.cep], ['pickup', 0, 20, null, null]);
  });
});

test('fulfillment delivery prices by CEP and validates inputs', function () {
  const a = api();
  const d = a.fulfillment('delivery', '01310-100');
  assert.deepEqual([d.mode, d.cents, d.minutes, d.region, d.cep], ['delivery', 1490, 45, 'Grande São Paulo', '01310100']);
  assert.equal(a.fulfillment('delivery', '01310100').cep, '01310100');
  ['123', '', null, undefined].forEach(function (bad) { assert.equal(a.fulfillment('delivery', bad), null, String(bad)); });
  assert.equal(a.fulfillment('delivery'), null);
  assert.equal(a.fulfillment(undefined, '01310-100'), null);
  assert.equal(a.fulfillment('teleport', '01310-100'), null);
});

test('trackingCode is deterministic with an injected rng and uses the safe alphabet', function () {
  const a = api();
  assert.equal(a.trackingCode(function () { return 0; }), 'DAN-AAAA');
  assert.equal(a.trackingCode(function () { return 0.999999; }), 'DAN-9999');
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let i = 0; i < 32; i++) {
    const c = a.trackingCode(function () { return i / 32; });
    assert.equal(c, 'DAN-' + alphabet[i].repeat(4));
    assert.match(c, /^DAN-[A-HJ-NP-Z2-9]{4}$/);
  }
});

test('trackingCode without rng yields well-formed codes', function () {
  const a = api();
  for (let i = 0; i < 50; i++) { assert.match(a.trackingCode(), /^DAN-[A-HJ-NP-Z2-9]{4}$/); }
});
