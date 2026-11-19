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

const VALID = {
  name: 'Maria Silva', email: 'maria@example.com', phone: '(11) 91234-5678',
  cep: '01310-100', address: 'Av. Paulista 1000', city: 'Sao Paulo',
};

function fill(t, values) {
  find(t.app, function (n) { return n.tagName === 'input'; }).forEach(function (i) { i.value = values[i.name] || ''; });
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

test('home shows the collection hero, featured pieces linking to detail, and a catalog call', function () {
  const t = boot('#/');
  assert.equal(text(t, 'hero-eyebrow'), 'Dan Wear collection');
  assert.equal(byClass(t.app, 'action-button')[0].href, '#/catalog');
  const cards = byClass(t.app, 'product-card');
  assert.equal(cards.length, 4);
  cards.forEach(function (c) { assert.match(c.href, /^#\/produto\//); });
  assert.equal(byClass(t.app, 'showcase-link')[0].href, '#/catalog');
});

test('full flow: catalog, detail, cart with DAN10, checkout with shipping, confirmation', function () {
  const t = boot('#/');
  t.go('#/catalog');
  assert.ok(byClass(t.app, 'product-card').length >= 10);
  t.go('#/produto/basic-tee');
  byClass(t.app, 'size-button').filter(function (b) { return b.textContent === 'M'; })[0].listeners.click();
  const add = byClass(t.app, 'add-to-cart')[0];
  add.listeners.click();
  add.listeners.click();
  assert.equal(t.badge.textContent, '2');

  t.go('#/cart');
  const input = find(t.app, function (n) { return n.tagName === 'input'; })[0];
  input.value = 'dan10';
  find(t.app, function (n) { return n.tagName === 'form'; })[0].listeners.submit({ preventDefault() {} });
  assert.equal(text(t, 'cart-total'), 'Total: R$ 143,82');

  t.go('#/checkout');
  assert.equal(text(t, 'cart-name'), '2 × DAN Basic Tee (size M)');
  assert.equal(text(t, 'cart-discount'), 'Coupon DAN10: −R$ 15,98');
  assert.equal(text(t, 'shipping-line'), 'Shipping: enter your CEP');
  assert.equal(text(t, 'grand-total'), 'Total with shipping: R$ 143,82 + shipping');
  typeCep(t, '01310-100');
  assert.equal(text(t, 'shipping-line'), 'Shipping to Grande São Paulo: R$ 14,90');
  assert.equal(text(t, 'grand-total'), 'Total with shipping: R$ 158,72');
  typeCep(t, '9001');
  assert.equal(text(t, 'shipping-line'), 'Shipping: enter your CEP');
  const cepInput = find(t.app, function (n) { return n.tagName === 'input' && n.name === 'cep'; })[0];
  cepInput.value = '90010-000';
  cepInput.listeners.change();
  assert.equal(text(t, 'shipping-line'), 'Shipping to Rio Grande do Sul: R$ 26,90');

  fill(t, VALID);
  submit(t);
  assert.equal(find(t.app, function (n) { return n.tagName === 'h1'; })[0].textContent, 'Order confirmed');
  assert.match(text(t, 'order-confirmation'), /Maria Silva.*R\$ 158,72/);
  assert.equal(t.badge.textContent, '0');
  assert.deepEqual(JSON.parse(t.store['dan-cart']), []);
  t.go('#/checkout');
  assert.equal(byClass(t.app, 'cart-empty').length, 1);
});

test('different CEP regions change the confirmed total; invalid data keeps the cart', function () {
  const t = boot('#/produto/hoodie');
  byClass(t.app, 'size-button')[2].listeners.click();
  byClass(t.app, 'add-to-cart')[0].listeners.click();
  t.go('#/checkout');
  fill(t, Object.assign({}, VALID, { cep: '123' }));
  submit(t);
  const cepError = find(t.app, function (n) { return n.id === 'checkout-cep-error'; })[0];
  assert.match(cepError.textContent, /CEP with 8 digits/);
  assert.equal(byClass(t.app, 'order-confirmation').length, 0);
  assert.equal(t.badge.textContent, '1');
  fill(t, Object.assign({}, VALID, { cep: '90010000' }));
  submit(t);
  assert.match(text(t, 'order-confirmation'), /R\$ 246,80/);
});

test('without checkout.js a valid order is blocked instead of confirmed with no shipping', function () {
  const t = boot('#/produto/hoodie', ['products.js', 'cart.js', 'script.js']);
  byClass(t.app, 'size-button')[2].listeners.click();
  byClass(t.app, 'add-to-cart')[0].listeners.click();
  t.go('#/checkout');
  fill(t, VALID);
  submit(t);
  assert.equal(byClass(t.app, 'order-confirmation').length, 0);
  assert.match(find(t.app, function (n) { return n.id === 'checkout-cep-error'; })[0].textContent, /Shipping is unavailable/);
  assert.equal(t.badge.textContent, '1');
});

test('index.html loads checkout.js before script.js', function () {
  const html = read('index.html');
  assert.ok(html.indexOf('checkout.js') !== -1);
  assert.ok(html.indexOf('checkout.js') < html.indexOf('script.js'));
});
