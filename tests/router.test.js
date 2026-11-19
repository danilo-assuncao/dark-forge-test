/* Behavioural tests of the SPA router: script.js runs in a vm context with a
   minimal fake DOM (Node built-ins only). Static checks cover index.html. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'script.js'), 'utf8');
const productsJs = fs.readFileSync(path.join(ROOT, 'products.js'), 'utf8');
const cartJs = fs.readFileSync(path.join(ROOT, 'cart.js'), 'utf8');

function makeNode(tag) {
  const node = {
    tagName: tag, className: '', textContent: '', children: [], attrs: {}, listeners: {},
    appendChild(child) { this.children.push(child); return child; },
    setAttribute(k, v) { this.attrs[k] = String(v); },
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : (k === 'href' ? this.href : null); },
    removeAttribute(k) { delete this.attrs[k]; },
    addEventListener(type, fn) { this.listeners[type] = fn; },
    focus() { this.focusCount = (this.focusCount || 0) + 1; },
  };
  // Setting textContent = '' clears children, like the DOM does.
  let text = '';
  Object.defineProperty(node, 'textContent', {
    get() { return text; },
    set(v) { text = v; if (v === '') { node.children = []; } },
  });
  return node;
}

function walk(node, fn) {
  fn(node);
  node.children.forEach(function (c) { walk(c, fn); });
}

function boot(hash, opts) {
  opts = opts || {};
  const app = makeNode('main');
  const skip = makeNode('a');
  const navLinks = ['#/', '#/catalog', '#/about'].map(function (href) {
    const a = makeNode('a');
    a.href = href;
    return a;
  });
  const cartBadge = makeNode('span');
  const win = { location: { hash: hash }, listeners: {} };
  if (opts.cartStorage) {
    win.localStorage = {
      getItem(k) { return k in opts.cartStorage ? opts.cartStorage[k] : null; },
      setItem(k, v) { opts.cartStorage[k] = String(v); },
    };
  }
  win.addEventListener = function (type, fn) { win.listeners[type] = fn; };
  const doc = {
    readyState: 'complete', title: '',
    createElement: makeNode,
    createDocumentFragment() { return makeNode('#fragment'); },
    getElementById(id) { return id === 'app' ? app : (id === 'cart-count' ? cartBadge : null); },
    querySelector(sel) { return sel === '.skip-link' ? skip : null; },
    querySelectorAll(sel) { return sel === '.nav-link' ? navLinks : []; },
    addEventListener() {},
  };
  const ctx = { window: win, document: doc };
  vm.createContext(ctx);
  if (opts.products) {
    ctx.window.DanProducts = {
      all() { return opts.products.slice(); },
      find(id) { return opts.products.find(function (p) { return p.id === id; }) || null; },
    };
  } else if (!opts.noProducts) {
    vm.runInContext(productsJs, ctx);
    if (!opts.noCart) {
      vm.runInContext(cartJs, ctx);
    }
  }
  vm.runInContext(js, ctx);
  return {
    app, skip, navLinks, doc, win, cartBadge,
    go(h) { win.location.hash = h; win.listeners.hashchange(); },
    heading() {
      let found = null;
      walk(app, function (n) { if (!found && n.tagName === 'h1') { found = n; } });
      return found && found.textContent;
    },
    has(cls) {
      let found = false;
      walk(app, function (n) { if (n.className === cls) { found = true; } });
      return found;
    },
  };
}

test('index.html holds the shared header, main outlet and footer once', function () {
  assert.equal((html.match(/<header\b/g) || []).length, 1);
  assert.equal((html.match(/<footer\b/g) || []).length, 1);
  assert.match(html, /<main[^>]*id="app"/);
  assert.match(html, /href="#\/about"/);
});

const KNOWN = [
  ['', 'home'], ['#', 'home'], ['#/', 'home'], ['#//', 'home'], ['#///', 'home'],
  ['#/about', 'about'], ['#/about/', 'about'], ['#/about?x=1', 'about'], ['#about', 'about'],
];
KNOWN.forEach(function (c) {
  test('hash ' + JSON.stringify(c[0]) + ' routes to ' + c[1], function () {
    const t = boot(c[0]);
    if (c[1] === 'home') {
      assert.ok(t.has('home'));
      assert.equal(t.doc.title, 'Dan');
    } else {
      assert.equal(t.heading(), 'About');
      assert.equal(t.doc.title, 'About – Dan');
    }
  });
});

['#/nope', '#/constructor', '#/__proto__', '#/toString', '#/about/x'].forEach(function (h) {
  test('hash ' + h + ' shows the 404 page', function () {
    const t = boot(h);
    assert.match(t.heading(), /404/);
    assert.match(t.doc.title, /^404/);
  });
});

test('navigating swaps the view, moves aria-current and focuses main only after first load', function () {
  const t = boot('#/');
  assert.equal(t.app.focusCount, undefined, 'first render must not steal focus');
  assert.equal(t.navLinks[0].attrs['aria-current'], 'page');
  assert.equal(t.navLinks[1].attrs['aria-current'], undefined);
  assert.equal(t.navLinks[2].attrs['aria-current'], undefined);
  t.go('#/about');
  assert.equal(t.heading(), 'About');
  assert.equal(t.app.children.length, 1, 'old view must be replaced');
  assert.equal(t.navLinks[0].attrs['aria-current'], undefined);
  assert.equal(t.navLinks[2].attrs['aria-current'], 'page');
  assert.equal(t.app.focusCount, 1);
  t.go('#/missing');
  assert.match(t.heading(), /404/);
  assert.equal(t.navLinks[2].attrs['aria-current'], undefined);
});

function collect(node, pred) {
  const out = [];
  walk(node, function (n) { if (pred(n)) { out.push(n); } });
  return out;
}

test('products.js holds well-formed mock data', function () {
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  const all = ctx.window.DanProducts.all();
  assert.ok(all.length >= 12);
  const cats = ctx.window.DanProducts.categories();
  assert.deepEqual(Array.from(cats), ['Supplements', 'Accessories', 'Equipment']);
  cats.forEach(function (c) {
    assert.ok(all.filter(function (p) { return p.category === c; }).length >= 3, c);
  });
  assert.equal(new Set(all.map(function (p) { return p.id; })).size, all.length);
  all.forEach(function (p) {
    assert.ok(p.name && p.description && Number.isInteger(p.priceCents) && p.priceCents > 0);
  });
  assert.ok(all.some(function (p) { return /whey/i.test(p.name); }));
  assert.ok(all.some(function (p) { return /creatine/i.test(p.name); }));
  assert.equal(ctx.window.DanProducts.find('nope'), null);
  assert.equal(ctx.window.DanProducts.find('creatine').id, 'creatine');
  const n = ctx.window.DanProducts.all().length;
  const copy = ctx.window.DanProducts.all();
  copy.push({ id: 'x' });
  copy.pop();
  copy.length = 0;
  assert.equal(ctx.window.DanProducts.all().length, n, 'all() must return a copy');
});

test('formatPrice pads cents and groups thousands', function () {
  const cases = [[5, 'R$ 0,05'], [100, 'R$ 1,00'], [100005, 'R$ 1.000,05'],
    [123456789, 'R$ 1.234.567,89'], [99900, 'R$ 999,00']];
  const products = cases.map(function (c, i) {
    return { id: 'p' + i, name: 'P' + i, description: 'd', priceCents: c[0] };
  });
  const t = boot('#/catalog', { products: products });
  const prices = collect(t.app, function (n) { return n.className === 'product-price'; })
    .map(function (n) { return n.textContent; });
  assert.deepEqual(prices, cases.map(function (c) { return c[1]; }));
});

test('without product data the catalog is empty and details give a 404', function () {
  const t = boot('#/catalog', { noProducts: true });
  assert.equal(t.heading(), 'Catalog');
  assert.equal(collect(t.app, function (n) { return n.className === 'product-card'; }).length, 0);
  assert.match(boot('#/produto/creatine', { noProducts: true }).heading(), /404/);
});

test('the catalog grid shows name, placeholder image and price, linking to detail', function () {
  const t = boot('#/catalog');
  assert.equal(t.heading(), 'Catalog');
  assert.equal(t.doc.title, 'Catalog – Dan');
  assert.equal(t.navLinks[1].attrs['aria-current'], 'page');
  const cards = collect(t.app, function (n) { return n.className === 'product-card'; });
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  const all = ctx.window.DanProducts.all();
  assert.equal(cards.length, all.length);
  cards.forEach(function (card, i) {
    assert.equal(card.href, '#/produto/' + all[i].id);
    const classes = card.children.map(function (c) { return c.className; });
    assert.deepEqual(classes, ['product-image', 'product-name', 'product-price']);
    assert.equal(card.children[1].textContent, all[i].name);
    assert.match(card.children[2].textContent, /^R\$ \d{1,3}(\.\d{3})*,\d{2}$/);
  });
  assert.equal(cards[0].children[2].textContent, 'R$ 159,90');
});

test('category filter shows only matching products and All restores the grid', function () {
  const t = boot('#/catalog');
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  const all = Array.from(ctx.window.DanProducts.all());
  const buttons = collect(t.app, function (n) { return n.className === 'filter-button'; });
  assert.deepEqual(buttons.map(function (b) { return b.textContent; }),
    ['All', 'Supplements', 'Accessories', 'Equipment']);
  const cards = function () { return collect(t.app, function (n) { return n.className === 'product-card'; }); };
  assert.equal(cards().length, all.length);
  assert.equal(buttons[0].attrs['aria-pressed'], 'true');
  buttons.slice(1).forEach(function (b) {
    b.listeners.click();
    const expected = all.filter(function (p) { return p.category === b.textContent; });
    assert.deepEqual(cards().map(function (c) { return c.href; }),
      expected.map(function (p) { return '#/produto/' + p.id; }));
    assert.equal(b.attrs['aria-pressed'], 'true');
    assert.equal(buttons[0].attrs['aria-pressed'], 'false');
  });
  buttons[0].listeners.click();
  assert.equal(cards().length, all.length);
});

test('nutrition section appears exactly for products with nutrition data', function () {
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  Array.from(ctx.window.DanProducts.all()).forEach(function (p) {
    const t = boot('#/produto/' + p.id);
    const tables = collect(t.app, function (n) { return n.tagName === 'table'; }).length;
    if (p.category === 'Supplements') {
      assert.equal(tables, 1, p.id);
      assert.equal(t.has('nutrition'), true, p.id);
    } else {
      assert.equal(tables, 0, p.id);
      assert.equal(t.has('nutrition'), false, p.id);
    }
  });
  const bare = boot('#/produto/x', { products: [{ id: 'x', name: 'X', description: 'd', priceCents: 100 }] });
  assert.equal(bare.has('nutrition'), false);
});

test('catalog without categories() renders the grid and no filter', function () {
  const products = [{ id: 'a', name: 'A', description: 'd', priceCents: 100, category: 'C' }];
  const t = boot('#/catalog', { products: products });
  assert.equal(collect(t.app, function (n) { return n.className === 'filter-button'; }).length, 0);
  assert.equal(collect(t.app, function (n) { return n.className === 'product-card'; }).length, 1);
});

test('a product detail route renders the product; unknown ids give a 404', function () {
  const t = boot('#/produto/creatine');
  assert.match(t.heading(), /Creatine/);
  assert.match(t.doc.title, /Creatine/);
  assert.equal(t.navLinks[1].attrs['aria-current'], 'page');
  assert.equal(t.navLinks[0].attrs['aria-current'], undefined);
  assert.equal(t.navLinks[2].attrs['aria-current'], undefined);
  const texts = [];
  walk(t.app, function (n) { if (n.textContent) { texts.push(n.textContent); } });
  assert.ok(texts.indexOf('R$ 89,90') !== -1, 'price shown');
  assert.ok(texts.some(function (x) { return /micronized creatine/.test(x); }), 'description shown');
  assert.equal(collect(t.app, function (n) { return n.className === 'product-image'; }).length, 1);
  const rows = collect(t.app, function (n) { return n.tagName === 'tr'; });
  assert.equal(rows.length, 6, 'header + 5 nutrient rows');
  assert.ok(texts.indexOf('Creatine monohydrate') !== -1 && texts.indexOf('5 g') !== -1, 'nutrition shown');
  const btn = collect(t.app, function (n) { return n.tagName === 'button'; });
  assert.equal(btn.length, 1);
  assert.equal(btn[0].textContent, 'Add to cart');
  assert.equal(btn[0].type, 'button');
  const back = collect(t.app, function (n) { return n.tagName === 'a'; })[0];
  assert.equal(back.href, '#/catalog');
  assert.equal(back.textContent, 'Back to catalog');
  ['#/produto/nope', '#/produtos', '#/catalog/creatine', '#/produto/creatine/x', '#/produto/%E0%A4%A'].forEach(function (h) {
    const u = boot(h);
    assert.match(u.heading(), /404/, h);
    u.navLinks.forEach(function (l) { assert.equal(l.attrs['aria-current'], undefined, h); });
  });
  ['#/produto/nope', '#/produto/%E0%A4%A', '#/produto/constructor', '#/produto/creatine/x'].forEach(function (h) {
    assert.match(boot(h).heading(), /404/, h);
  });
});

test('the skip link focuses main without changing the hash or the view', function () {
  const t = boot('#/about');
  let prevented = false;
  t.skip.listeners.click({ preventDefault() { prevented = true; } });
  assert.ok(prevented);
  assert.equal(t.app.focusCount, 1);
  assert.equal(t.win.location.hash, '#/about');
  assert.equal(t.heading(), 'About');
});

test('script.js never writes HTML strings', function () {
  const code = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(code, /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  // A hostile hash is only ever shown as a 404, never injected as markup.
  const t = boot('#/<img src=x onerror=alert(1)>');
  assert.match(t.heading(), /404/);
  let injected = false;
  walk(t.app, function (n) { if (n.tagName === 'img') { injected = true; } });
  assert.equal(injected, false);
});

test('nutrition table has caption, scoped headers and paired label/amount cells', function () {
  const t = boot('#/produto/creatine');
  const table = collect(t.app, function (n) { return n.tagName === 'table'; })[0];
  assert.equal(collect(table, function (n) { return n.tagName === 'caption'; })[0].textContent,
    'Per serving: 5 g (1 scoop)');
  const ths = collect(table, function (n) { return n.tagName === 'th'; });
  assert.deepEqual(ths.slice(0, 2).map(function (n) { return n.attrs.scope; }), ['col', 'col']);
  ths.slice(2).forEach(function (n) { assert.equal(n.attrs.scope, 'row'); });
  const row = collect(table, function (n) { return n.tagName === 'tr'; }).filter(function (r) {
    return r.children[0].textContent === 'Creatine monohydrate';
  })[0];
  assert.ok(row, 'row for label exists');
  assert.equal(row.children[1].tagName, 'td');
  assert.equal(row.children[1].textContent, '5 g');
});

test('every supplement has nutrition data and its detail renders rows + 1 tr', function () {
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  ctx.window.DanProducts.all().filter(function (p) { return p.category === 'Supplements'; }).forEach(function (p) {
    assert.ok(p.nutrition && p.nutrition.serving, p.id + ' serving');
    assert.ok(p.nutrition.rows.length > 0, p.id + ' rows');
    p.nutrition.rows.forEach(function (r) { assert.ok(r.label && r.amount, p.id + ' row'); });
    const t = boot('#/produto/' + p.id);
    const trs = collect(t.app, function (n) { return n.tagName === 'tr'; });
    assert.equal(trs.length, p.nutrition.rows.length + 1, p.id);
  });
});

test('missing or empty nutrition shows a fallback, keeping heading and cart button', function () {
  [undefined, { serving: '1 g', rows: [] }, { serving: '1 g' }].forEach(function (nutrition) {
    const product = { id: 'x', name: 'Xyz', description: 'd', priceCents: 100, nutrition: nutrition };
    const t = boot('#/produto/x', { products: [product] });
    assert.equal(t.heading(), 'Xyz');
    assert.equal(collect(t.app, function (n) { return n.tagName === 'table'; }).length, 0);
    const texts = [];
    walk(t.app, function (n) { if (n.textContent) { texts.push(n.textContent); } });
    assert.ok(texts.indexOf('Nutrition information not available.') !== -1);
    const btn = collect(t.app, function (n) { return n.tagName === 'button'; });
    assert.equal(btn.length, 1);
    assert.equal(btn[0].textContent, 'Add to cart');
  });
});

test('cart view lists items with total, and the product button adds to the cart', function () {
  const store = {};
  const t = boot('#/produto/creatine', { cartStorage: store });
  const add = collect(t.app, function (n) { return n.className === 'action-button add-to-cart'; })[0];
  add.listeners.click();
  add.listeners.click();
  t.go('#/cart');
  assert.equal(t.heading(), 'Cart');
  const total = collect(t.app, function (n) { return n.className === 'cart-total'; })[0];
  assert.equal(total.textContent, 'Total: R$ 179,80');
  const plus = collect(t.app, function (n) { return n.className === 'qty-button'; })[1];
  plus.listeners.click();
  const total2 = collect(t.app, function (n) { return n.className === 'cart-total'; })[0];
  assert.equal(total2.textContent, 'Total: R$ 269,70');
  assert.equal(t.cartBadge.textContent, '3');
  collect(t.app, function (n) { return n.className === 'text-button'; })[0].listeners.click();
  assert.ok(t.has('cart-empty'));
  assert.equal(t.cartBadge.textContent, '0');
});

function byClass(t, cls) {
  return collect(t.app, function (n) { return n.className === cls; });
}

test('minus decrements and removes the line at quantity 1; focus returns to main', function () {
  const t = boot('#/produto/creatine', { cartStorage: {} });
  byClass(t, 'action-button add-to-cart')[0].listeners.click();
  byClass(t, 'action-button add-to-cart')[0].listeners.click();
  t.go('#/cart');
  const before = t.app.focusCount;
  byClass(t, 'qty-button')[0].listeners.click();
  assert.equal(t.cartBadge.textContent, '1');
  assert.equal(t.app.focusCount, before + 1);
  byClass(t, 'qty-button')[0].listeners.click();
  assert.ok(t.has('cart-empty'));
  assert.equal(t.cartBadge.textContent, '0');
});

test('Clear cart empties the view and resets the badge', function () {
  const t = boot('#/produto/creatine', { cartStorage: {} });
  byClass(t, 'action-button add-to-cart')[0].listeners.click();
  t.go('#/cart');
  const buttons = byClass(t, 'text-button');
  const clear = buttons.filter(function (b) { return b.textContent === 'Clear cart'; })[0];
  clear.listeners.click();
  assert.ok(t.has('cart-empty'));
  assert.equal(t.cartBadge.textContent, '0');
  const link = collect(t.app, function (n) { return n.className === 'text-link'; })[0];
  assert.equal(link.href, '#/catalog');
});

test('plus is disabled at max quantity and the product page reports status', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 99 }]) };
  const t = boot('#/cart', { cartStorage: store });
  assert.equal(byClass(t, 'qty-button')[1].attrs.disabled, 'disabled');
  t.go('#/produto/creatine');
  const add = byClass(t, 'action-button add-to-cart')[0];
  add.listeners.click();
  assert.equal(byClass(t, 'cart-status')[0].textContent, 'Maximum quantity reached.');
  t.go('#/produto/magnesium');
  byClass(t, 'action-button add-to-cart')[0].listeners.click();
  assert.equal(byClass(t, 'cart-status')[0].textContent, 'Added to cart.');
});

test('script.js degrades gracefully without cart.js', function () {
  const t = boot('#/produto/creatine', { noCart: true });
  byClass(t, 'action-button add-to-cart')[0].listeners.click();
  t.go('#/cart');
  assert.ok(t.has('cart-empty'));
});

// ----- Checkout -----

function fillCheckout(t, values) {
  const inputs = collect(t.app, function (n) { return n.tagName === 'input'; });
  inputs.forEach(function (i) { i.value = values[i.name] || ''; });
  return inputs;
}

const VALID = {
  name: 'Maria Silva', email: 'maria@example.com', phone: '(11) 91234-5678',
  cep: '01310-100', address: 'Av. Paulista 1000', city: 'Sao Paulo',
};

function submitForm(t) {
  const form = collect(t.app, function (n) { return n.tagName === 'form'; })[0];
  let prevented = false;
  form.listeners.submit({ preventDefault() { prevented = true; } });
  return prevented;
}

test('checkout with an empty cart shows the empty state and no form', function () {
  const t = boot('#/checkout', { cartStorage: {} });
  assert.equal(t.heading(), 'Checkout');
  assert.ok(t.has('cart-empty'));
  assert.equal(collect(t.app, function (n) { return n.tagName === 'form'; }).length, 0);
});

test('checkout summary reflects the cart and the cart view links to checkout', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 2 }]) };
  const t = boot('#/cart', { cartStorage: store });
  const link = byClass(t, 'action-button checkout-link')[0];
  assert.equal(link.href, '#/checkout');
  t.go('#/checkout');
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 179,80');
  assert.match(byClass(t, 'cart-name')[0].textContent, /^2 × /);
});

test('checkout validates required fields and formats, focusing the first invalid field', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 1 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  const inputs = fillCheckout(t, {});
  assert.ok(submitForm(t), 'default submit must be prevented');
  const errs = byClass(t, 'form-error');
  assert.equal(errs.length, 6);
  errs.forEach(function (e) { assert.equal(e.textContent, 'This field is required.'); });
  assert.equal(inputs[0].focusCount, 1);
  assert.equal(inputs[0].attrs['aria-invalid'], 'true');
  assert.equal(t.cartBadge.textContent, '1', 'cart must be kept on invalid submit');

  const bad = Object.assign({}, VALID, { email: 'nope', phone: '123', cep: '1234', name: 'Maria' });
  fillCheckout(t, bad);
  submitForm(t);
  const messages = byClass(t, 'form-error').map(function (e) { return e.textContent; });
  assert.match(messages[0], /first and last name/);
  assert.match(messages[1], /valid email/);
  assert.match(messages[2], /phone/);
  assert.match(messages[3], /CEP/);
  assert.equal(messages[4], '');
  assert.equal(messages[5], '');
  assert.equal(inputs[1].attrs['aria-invalid'], 'true');
  assert.equal(inputs[4].attrs['aria-invalid'], undefined);
  assert.equal(t.cartBadge.textContent, '1');
});

test('valid checkout shows a simulated confirmation and clears the cart', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 2 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  fillCheckout(t, VALID);
  submitForm(t);
  assert.equal(t.heading(), 'Order confirmed');
  assert.match(byClass(t, 'order-confirmation')[0].textContent, /Maria Silva.*R\$ 179,80/);
  assert.equal(t.cartBadge.textContent, '0');
  assert.deepEqual(JSON.parse(store['dan-cart']), []);
  t.go('#/checkout');
  assert.ok(t.has('cart-empty'));
});

// ----- Checkout review follow-ups -----

test('checkout re-renders instead of confirming when the cart changed after render', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 1 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  fillCheckout(t, VALID);
  store['dan-cart'] = JSON.stringify([{ id: 'creatine', qty: 3 }]);
  t.win.DanCart.reload();
  submitForm(t);
  assert.equal(t.heading(), 'Checkout');
  assert.equal(byClass(t, 'checkout-notice').length, 1);
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 269,70');
  assert.equal(t.cartBadge.textContent, '3', 'cart must not be cleared');

  const t2 = boot('#/checkout', { cartStorage: { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 1 }]) } });
  fillCheckout(t2, VALID);
  t2.win.DanCart.clear();
  submitForm(t2);
  assert.ok(t2.has('cart-empty'));
  assert.equal(t2.heading(), 'Checkout');
});

test('checkout validator boundaries', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 1 }]) };
  const cases = [
    ['phone', '1112345678', true], ['phone', '11912345678', true], ['phone', '119123456789', false],
    ['phone', '11 9123a5678', false], ['cep', '01310100', true], ['cep', '013101000', false],
    ['cep', '01310-100', true], ['address', 'abcd', false], ['address', 'abcde', true],
    ['city', 'S', false], ['city', 'SP', true], ['email', 'a@b', false], ['email', 'a@b.co', true],
    ['name', '   ', false], ['address', '     ', false],
  ];
  cases.forEach(function (c) {
    const t = boot('#/checkout', { cartStorage: Object.assign({}, store) });
    const inputs = fillCheckout(t, Object.assign({}, VALID, { [c[0]]: c[1] }));
    submitForm(t);
    const idx = inputs.findIndex(function (i) { return i.name === c[0]; });
    const msg = byClass(t, 'form-error')[idx];
    if (c[2]) {
      assert.equal(t.heading(), 'Order confirmed', c[0] + ' ' + c[1]);
    } else {
      assert.notEqual(msg.textContent, '', c[0] + ' ' + JSON.stringify(c[1]));
    }
  });
});

test('confirmation updates focus, title and order id; errors clear and refocus on retry; multi-line summary', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 1 }, { id: 'whey-protein', qty: 2 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  assert.equal(byClass(t, 'cart-name').length, 2);
  const inputs = fillCheckout(t, Object.assign({}, VALID, { email: 'x', city: '' }));
  submitForm(t);
  assert.equal(inputs[1].focusCount, 1);
  fillCheckout(t, Object.assign({}, VALID, { city: '' }));
  submitForm(t);
  assert.equal(byClass(t, 'form-error')[1].textContent, '');
  assert.equal(inputs[1].attrs['aria-invalid'], undefined);
  assert.equal(inputs[5].focusCount, 1);
  const before = t.app.focusCount || 0;
  fillCheckout(t, VALID);
  submitForm(t);
  assert.equal(t.app.focusCount, before + 1);
  assert.equal(t.doc.title, 'Order confirmed – Dan');
  assert.match(byClass(t, 'order-confirmation')[0].textContent, /#[0-9A-Z]+/);
});
