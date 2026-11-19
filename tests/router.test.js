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
const checkoutJs = fs.readFileSync(path.join(ROOT, 'checkout.js'), 'utf8');

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
  const metas = opts.noMeta ? {} : {
    'meta[name="description"]': makeNode('meta'),
    'meta[property="og:title"]': makeNode('meta'),
    'meta[property="og:description"]': makeNode('meta'),
  };
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
    querySelector(sel) {
      if (sel === '.skip-link') { return skip; }
      return Object.prototype.hasOwnProperty.call(metas, sel) ? metas[sel] : null;
    },
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
      vm.runInContext(checkoutJs, ctx);
    }
  }
  vm.runInContext(js, ctx);
  return {
    app, skip, navLinks, doc, win, cartBadge,
    description() { return (metas['meta[name="description"]'] || { attrs: {} }).attrs.content; },
    ogTitle() { return (metas['meta[property="og:title"]'] || { attrs: {} }).attrs.content; },
    ogDescription() { return (metas['meta[property="og:description"]'] || { attrs: {} }).attrs.content; },
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
      assert.equal(t.doc.title, 'Dan Food \u2013 Restaurante delivery');
    } else {
      assert.equal(t.heading(), 'Sobre');
      assert.equal(t.doc.title, 'Sobre – Dan Food');
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
  assert.equal(t.heading(), 'Sobre');
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
  assert.equal(all.length, 12);
  const cats = ctx.window.DanProducts.categories();
  assert.deepEqual(Array.from(cats), ['Pratos Executivos', 'Massas & Risotos', 'Burgers Artesanais', 'Sobremesas & Bebidas']);
  cats.forEach(function (c) {
    assert.ok(all.filter(function (p) { return p.category === c; }).length >= 3, c);
  });
  assert.equal(new Set(all.map(function (p) { return p.id; })).size, all.length);
  all.forEach(function (p) {
    assert.ok(p.name && p.description && Number.isInteger(p.priceCents) && p.priceCents > 0);
    assert.ok(Array.isArray(p.sizes) && p.sizes.length > 0, p.id + ' sizes');
    assert.ok(/^(\d+ min|\dh(\d\d)?)$/.test(p.boxTime), p.id + ' bay time');
    p.sizes.forEach(function (sz) { assert.ok(['Individual', 'Duplo', 'Familia', 'Porcao unica'].indexOf(sz) !== -1, p.id + ' ' + sz); });
    assert.deepEqual(Array.from(p.measurements.columns), ['Tempo de preparo', 'Calorias', 'Carboidratos', 'Proteinas', 'Gorduras', 'Sodio'], p.id);
    assert.equal(p.measurements.rows[0].values[0], p.boxTime, p.id + ' base prep time matches the first portion row');
    assert.ok(p.specs.some(function (x) { return x.label === 'Porcoes' && x.value === p.sizes.join(', '); }), p.id);
    assert.ok(Array.isArray(p.checklist) && p.checklist.length > 0, p.id + ' ingredients');
    p.measurements.rows.forEach(function (r) {
      assert.match(r.values[1], /^\d+ kcal$/, p.id);
      r.values.slice(2, 5).forEach(function (v) { assert.match(v, /^\d+ g$/, p.id); });
      assert.match(r.values[5], /^\d+ mg$/, p.id);
    });
    assert.deepEqual(Array.from(p.measurements.rows.map(function (r) { return r.size; })), Array.from(p.sizes), p.id);
    p.measurements.rows.forEach(function (r) {
      assert.equal(r.values.length, p.measurements.columns.length, p.id);
    });
  });
  assert.ok(all.some(function (p) { return /burger/i.test(p.name); }));
  assert.ok(all.some(function (p) { return p.sizes.length === 1; }), 'has a single-portion dish');
  assert.equal(ctx.window.DanProducts.find('nope'), null);
  assert.equal(ctx.window.DanProducts.find('file-parmegiana').id, 'file-parmegiana');
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
  assert.equal(t.heading(), 'Cardápio');
  assert.equal(collect(t.app, function (n) { return n.className === 'product-card'; }).length, 0);
  assert.match(boot('#/produto/file-parmegiana', { noProducts: true }).heading(), /404/);
});

test('the catalog grid shows name, placeholder image and price, linking to detail', function () {
  const t = boot('#/catalog');
  assert.equal(t.heading(), 'Cardápio');
  assert.equal(t.doc.title, 'Cardápio – Dan Food');
  assert.equal(t.navLinks[1].attrs['aria-current'], 'page');
  const cards = collect(t.app, function (n) { return n.className === 'product-card'; });
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  const all = ctx.window.DanProducts.all();
  assert.equal(cards.length, all.length);
  cards.forEach(function (card, i) {
    assert.equal(card.href, '#/produto/' + all[i].id);
    const classes = card.children.map(function (c) { return c.className; });
    assert.deepEqual(classes, ['product-image', 'product-name', 'product-category', 'product-price', 'product-box-time', 'product-sizes']);
    assert.equal(card.children[1].textContent, all[i].name);
    assert.equal(card.children[2].textContent, all[i].category);
    assert.equal(card.children[4].textContent, 'Tempo de preparo: ' + all[i].boxTime);
    assert.equal(card.children[5].textContent, 'Porções: ' + all[i].sizes.join(', '));
    assert.match(card.children[3].textContent, /^R\$ \d{1,3}(\.\d{3})*,\d{2}$/);
  });
  assert.equal(cards[0].children[3].textContent, 'R$ 39,90');
});

test('category filter shows only matching products and Todas restores the grid', function () {
  const t = boot('#/catalog');
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  const all = Array.from(ctx.window.DanProducts.all());
  const buttons = collect(t.app, function (n) { return n.className === 'filter-button'; });
  assert.deepEqual(buttons.map(function (b) { return b.textContent; }),
    ['Todas', 'Pratos Executivos', 'Massas & Risotos', 'Burgers Artesanais', 'Sobremesas & Bebidas']);
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

test('size guide table appears exactly for products with measurements', function () {
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  Array.from(ctx.window.DanProducts.all()).forEach(function (p) {
    const t = boot('#/produto/' + p.id);
    const tables = collect(t.app, function (n) { return n.tagName === 'table'; }).length;
    if (p.measurements) {
      assert.equal(tables, 1, p.id);
      const trs = collect(t.app, function (n) { return n.tagName === 'tr'; });
      assert.equal(trs.length, p.measurements.rows.length + 1, p.id);
    } else {
      assert.equal(tables, 0, p.id);
    }
    assert.equal(t.has('measurements'), true, p.id);
    assert.equal(byClass(t, 'size-button').length, p.sizes.length, p.id);
  });
  const bare = boot('#/produto/x', { products: [{ id: 'x', name: 'X', description: 'd', priceCents: 100 }] });
  assert.equal(bare.has('measurements'), false);
  assert.equal(byClass(bare, 'size-button').length, 0);
});

test('catalog cards omit category and sizes rows when the data is absent', function () {
  const cases = [
    [{ id: 'a', name: 'A', description: 'd', priceCents: 100 }, ['product-image', 'product-name', 'product-price']],
    [{ id: 'b', name: 'B', description: 'd', priceCents: 100, sizes: [] }, ['product-image', 'product-name', 'product-price']],
    [{ id: 'c', name: 'C', description: 'd', priceCents: 100, category: 'X' }, ['product-image', 'product-name', 'product-category', 'product-price']],
  ];
  cases.forEach(function (c) {
    const t = boot('#/catalog', { products: [c[0]] });
    const cards = collect(t.app, function (n) { return n.className === 'product-card'; });
    assert.equal(cards.length, 1);
    assert.deepEqual(cards[0].children.map(function (x) { return x.className; }), c[1]);
  });
});

test('catalog without categories() renders the grid and no filter', function () {
  const products = [{ id: 'a', name: 'A', description: 'd', priceCents: 100, category: 'C' }];
  const t = boot('#/catalog', { products: products });
  assert.equal(collect(t.app, function (n) { return n.className === 'filter-button'; }).length, 0);
  assert.equal(collect(t.app, function (n) { return n.className === 'product-card'; }).length, 1);
});

test('a product detail route renders the product; unknown ids give a 404', function () {
  const t = boot('#/produto/file-parmegiana');
  assert.match(t.heading(), /File a parmegiana/);
  assert.match(t.doc.title, /File a parmegiana/);
  assert.equal(t.navLinks[1].attrs['aria-current'], 'page');
  assert.equal(t.navLinks[0].attrs['aria-current'], undefined);
  assert.equal(t.navLinks[2].attrs['aria-current'], undefined);
  const texts = [];
  walk(t.app, function (n) { if (n.textContent) { texts.push(n.textContent); } });
  assert.ok(texts.indexOf('R$ 39,90') !== -1, 'price shown');
  assert.ok(texts.some(function (x) { return /molho de tomate/.test(x); }), 'description shown');
  assert.equal(collect(t.app, function (n) { return n.className === 'product-image'; }).length, 1);
  const rows = collect(t.app, function (n) { return n.tagName === 'tr'; });
  assert.equal(rows.length, 4, 'header + 3 porte rows');
  assert.deepEqual(byClass(t, 'size-button').map(function (b) { return b.textContent; }), ['Individual', 'Duplo', 'Familia']);
  const btn = collect(t.app, function (n) { return n.tagName === 'button' && n.className !== 'size-button'; });
  assert.equal(btn.length, 1);
  assert.equal(btn[0].textContent, 'Adicionar à sacola');
  assert.equal(btn[0].type, 'button');
  const back = collect(t.app, function (n) { return n.tagName === 'a'; })[0];
  assert.equal(back.href, '#/catalog');
  assert.equal(back.textContent, 'Voltar ao cardápio');
  ['#/produto/nope', '#/produtos', '#/catalog/file-parmegiana', '#/produto/file-parmegiana/x', '#/produto/%E0%A4%A'].forEach(function (h) {
    const u = boot(h);
    assert.match(u.heading(), /404/, h);
    u.navLinks.forEach(function (l) { assert.equal(l.attrs['aria-current'], undefined, h); });
  });
  ['#/produto/nope', '#/produto/%E0%A4%A', '#/produto/constructor'].forEach(function (h) {
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
  assert.equal(t.heading(), 'Sobre');
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

test('size guide table has caption, scoped headers and size rows', function () {
  const t = boot('#/produto/file-parmegiana');
  const table = collect(t.app, function (n) { return n.tagName === 'table'; })[0];
  assert.equal(collect(table, function (n) { return n.tagName === 'caption'; })[0].textContent,
    'Informacao nutricional por porcao');
  const ths = collect(table, function (n) { return n.tagName === 'th'; });
  assert.deepEqual(ths.slice(0, 7).map(function (n) { return n.attrs.scope; }), ['col', 'col', 'col', 'col', 'col', 'col', 'col']);
  ths.slice(7).forEach(function (n) { assert.equal(n.attrs.scope, 'row'); });
  const row = collect(table, function (n) { return n.tagName === 'tr'; }).filter(function (r) {
    return r.children[0].textContent === 'Duplo';
  })[0];
  assert.ok(row, 'row for Duplo exists');
  assert.deepEqual(row.children.slice(1).map(function (c) { return c.textContent; }), ['40 min', '1560 kcal', '124 g', '92 g', '76 g', '2500 mg']);
  assert.equal(row.children[1].tagName, 'td');
});

test('size guide without data shows a fallback, keeping the cart button', function () {
  const product = { id: 'x', name: 'Xyz', description: 'd', priceCents: 100, sizes: ['U'], measurements: { rows: [] } };
  const t = boot('#/produto/x', { products: [product] });
  assert.equal(collect(t.app, function (n) { return n.tagName === 'table'; }).length, 0);
  const texts = [];
  walk(t.app, function (n) { if (n.textContent) { texts.push(n.textContent); } });
  assert.ok(texts.indexOf('Este prato não tem tabela nutricional.') !== -1);
  assert.equal(byClass(t, 'action-button add-to-cart').length, 1);
});

test('cart view lists items with total, and the product button adds the chosen size', function () {
  const store = {};
  const t = boot('#/produto/file-parmegiana', { cartStorage: store });
  addWithSize(t, 'Individual');
  addWithSize(t, 'Individual');
  t.go('#/cart');
  assert.equal(t.heading(), 'Sacola');
  assert.equal(byClass(t, 'cart-size')[0].textContent, 'Porção: Individual');
  const total = byClass(t, 'cart-total')[0];
  assert.equal(total.textContent, 'Total: R$ 79,80');
  const plus = byClass(t, 'qty-button')[1];
  plus.listeners.click();
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 119,70');
  assert.equal(t.cartBadge.textContent, '3');
  assert.deepEqual(JSON.parse(store['dan-cart']), [{ id: 'file-parmegiana', size: 'Individual', qty: 3, note: '' }]);
  byClass(t, 'text-button').filter(function (b) { return b.textContent === 'Remover'; })[0].listeners.click();
  assert.ok(t.has('cart-empty'));
  assert.equal(t.cartBadge.textContent, '0');
});

test('adding without a size asks for one; different sizes become separate lines', function () {
  const t = boot('#/produto/file-parmegiana', { cartStorage: {} });
  byClass(t, 'action-button add-to-cart')[0].listeners.click();
  assert.equal(byClass(t, 'cart-status')[0].textContent, 'Escolha uma porção primeiro.');
  assert.equal(t.win.DanCart.count(), 0);
  addWithSize(t, 'Familia');
  assert.equal(byClass(t, 'cart-status')[0].textContent, 'Adicionado: Familia na sacola.');
  const pressed = byClass(t, 'size-button').filter(function (b) { return b.attrs['aria-pressed'] === 'true'; });
  assert.deepEqual(pressed.map(function (b) { return b.textContent; }), ['Familia']);
  addWithSize(t, 'Duplo');
  t.go('#/cart');
  assert.deepEqual(byClass(t, 'cart-size').map(function (n) { return n.textContent; }), ['Porção: Familia', 'Porção: Duplo']);
  assert.equal(t.cartBadge.textContent, '2');
});

function byClass(t, cls) {
  const want = cls.split(' ');
  return collect(t.app, function (n) {
    const have = n.className.split(' ');
    return want.every(function (w) { return have.indexOf(w) !== -1; });
  });
}

// Picks a size on the product page (by label) and clicks Add to cart.
function addWithSize(t, size) {
  byClass(t, 'size-button').filter(function (b) { return b.textContent === size; })[0].listeners.click();
  byClass(t, 'action-button add-to-cart')[0].listeners.click();
}

test('minus decrements and removes the line at quantity 1; focus returns to main', function () {
  const t = boot('#/produto/file-parmegiana', { cartStorage: {} });
  addWithSize(t, 'Individual');
  addWithSize(t, 'Individual');
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
  const t = boot('#/produto/file-parmegiana', { cartStorage: {} });
  addWithSize(t, 'Individual');
  t.go('#/cart');
  const buttons = byClass(t, 'text-button');
  const clear = buttons.filter(function (b) { return b.textContent === 'Esvaziar sacola'; })[0];
  clear.listeners.click();
  assert.ok(t.has('cart-empty'));
  assert.equal(t.cartBadge.textContent, '0');
  const link = collect(t.app, function (n) { return n.className === 'text-link'; })[0];
  assert.equal(link.href, '#/catalog');
});

test('plus is disabled at max quantity and the product page reports status', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 99 }]) };
  const t = boot('#/cart', { cartStorage: store });
  assert.equal(byClass(t, 'qty-button')[1].attrs.disabled, 'disabled');
  t.go('#/produto/file-parmegiana');
  addWithSize(t, 'Individual');
  assert.equal(byClass(t, 'cart-status')[0].textContent, 'Quantidade máxima atingida.');
  addWithSize(t, 'Duplo');
  assert.equal(byClass(t, 'cart-status')[0].textContent, 'Adicionado: Duplo na sacola.');
  t.go('#/produto/frango-grelhado');
  addWithSize(t, 'Individual');
  assert.equal(byClass(t, 'cart-status')[0].textContent, 'Adicionado: Individual na sacola.');
});

test('script.js degrades gracefully without cart.js', function () {
  const t = boot('#/produto/file-parmegiana', { noCart: true });
  addWithSize(t, 'Individual');
  t.go('#/cart');
  assert.ok(t.has('cart-empty'));
});

// ----- Checkout -----

function fillCheckout(t, values) {
  const inputs = collect(t.app, function (n) { return n.tagName === 'input' && n.type !== 'radio'; });
  inputs.forEach(function (i) { i.value = values[i.name] || ''; });
  return inputs;
}

const VALID = { name: 'Maria Silva', cep: '01310-100' };

// Selects the fulfilment radio ('delivery' or 'pickup') like a user would.
function chooseMode(t, mode) {
  collect(t.app, function (n) { return n.type === 'radio'; }).forEach(function (r) { r.checked = r.value === mode; });
  collect(t.app, function (n) { return n.type === 'radio' && n.value === mode; })[0].listeners.change();
}

function submitForm(t) {
  const form = collect(t.app, function (n) { return n.tagName === 'form'; })[0];
  let prevented = false;
  form.listeners.submit({ preventDefault() { prevented = true; } });
  return prevented;
}

test('checkout with an empty cart shows the empty state and no form', function () {
  const t = boot('#/checkout', { cartStorage: {} });
  assert.equal(t.heading(), 'Fechar pedido');
  assert.ok(t.has('cart-empty'));
  assert.equal(collect(t.app, function (n) { return n.tagName === 'form'; }).length, 0);
});

test('checkout summary reflects the cart and the cart view links to checkout', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 2 }]) };
  const t = boot('#/cart', { cartStorage: store });
  const link = byClass(t, 'action-button checkout-link')[0];
  assert.equal(link.href, '#/checkout');
  t.go('#/checkout');
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 79,80');
  assert.match(byClass(t, 'cart-name')[0].textContent, /^2 × /);
});

test('checkout validates required fields and formats, focusing the first invalid field', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 1 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  const inputs = fillCheckout(t, {});
  assert.ok(submitForm(t), 'default submit must be prevented');
  const errs = byClass(t, 'form-error');
  assert.equal(errs.length, 2);
  errs.forEach(function (e) { assert.equal(e.textContent, 'Campo obrigat\u00f3rio.'); });
  assert.equal(inputs[0].focusCount, 1);
  assert.equal(inputs[0].attrs['aria-invalid'], 'true');
  assert.equal(t.cartBadge.textContent, '1', 'cart must be kept on invalid submit');

  fillCheckout(t, Object.assign({}, VALID, { cep: '1234', name: 'Maria' }));
  submitForm(t);
  const messages = byClass(t, 'form-error').map(function (e) { return e.textContent; });
  assert.match(messages[0], /nome e sobrenome/);
  assert.match(messages[1], /CEP/);
  assert.equal(inputs[1].attrs['aria-invalid'], 'true');
  assert.equal(t.cartBadge.textContent, '1');
});

test('delivery by CEP shows fee, ETA and total; pickup is free and needs no CEP', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 2 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  assert.equal(byClass(t, 'shipping-line')[0].textContent, 'Delivery: informe o CEP');
  assert.equal(byClass(t, 'grand-total')[0].textContent, 'Total com delivery: R$ 79,80 + delivery');
  const inputs = fillCheckout(t, VALID);
  inputs[1].listeners.input();
  assert.equal(byClass(t, 'shipping-line')[0].textContent, 'Delivery para Grande S\u00e3o Paulo: R$ 14,90');
  assert.equal(byClass(t, 'eta-line')[0].textContent, 'Tempo estimado: 45 min');
  assert.equal(byClass(t, 'grand-total')[0].textContent, 'Total com delivery: R$ 94,70');

  chooseMode(t, 'pickup');
  assert.equal(byClass(t, 'shipping-line')[0].textContent, 'Retirada no Balc\u00e3o: gr\u00e1tis');
  assert.equal(byClass(t, 'eta-line')[0].textContent, 'Tempo estimado: 20 min');
  assert.equal(byClass(t, 'grand-total')[0].textContent, 'Total do pedido: R$ 79,80');
  assert.equal(byClass(t, 'cep-field')[0].hidden, true);
  chooseMode(t, 'delivery');
  assert.equal(byClass(t, 'cep-field')[0].hidden, false);
});

test('pickup confirms without a CEP and charges no delivery fee', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 2 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  fillCheckout(t, { name: 'Maria Silva', cep: '' });
  chooseMode(t, 'pickup');
  submitForm(t);
  assert.equal(t.heading(), 'Pedido confirmado');
  assert.match(byClass(t, 'order-confirmation')[0].textContent, /Maria Silva.*R\$ 79,80/);
  assert.equal(byClass(t, 'order-mode')[0].textContent, 'Modalidade: Retirada no Balc\u00e3o');
  assert.equal(byClass(t, 'order-shipping')[0].textContent, 'Retirada no Balc\u00e3o: gr\u00e1tis');
  assert.equal(byClass(t, 'order-eta')[0].textContent, 'Tempo estimado: 20 min');
  assert.match(byClass(t, 'order-protocol')[0].textContent, /^C\u00f3digo de acompanhamento: DAN-[A-Z2-9]{4}$/);
});

test('valid delivery checkout confirms with tracking code and clears the cart', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 2 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  fillCheckout(t, VALID);
  submitForm(t);
  assert.equal(t.heading(), 'Pedido confirmado');
  assert.match(byClass(t, 'order-confirmation')[0].textContent, /Maria Silva.*R\$ 94,70/);
  assert.match(byClass(t, 'order-protocol')[0].textContent, /^C\u00f3digo de acompanhamento: DAN-[A-Z2-9]{4}$/);
  assert.equal(byClass(t, 'order-mode')[0].textContent, 'Modalidade: Delivery por CEP');
  assert.equal(byClass(t, 'order-shipping')[0].textContent, 'Delivery (Grande S\u00e3o Paulo): R$ 14,90');
  assert.equal(t.cartBadge.textContent, '0');
  assert.deepEqual(JSON.parse(store['dan-cart']), []);
  t.go('#/checkout');
  assert.ok(t.has('cart-empty'));
});

// ----- Checkout review follow-ups -----

test('checkout re-renders instead of confirming when the cart changed after render', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 1 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  fillCheckout(t, VALID);
  store['dan-cart'] = JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 3, note: '' }]);
  t.win.DanCart.reload();
  submitForm(t);
  assert.equal(t.heading(), 'Fechar pedido');
  assert.equal(byClass(t, 'checkout-notice').length, 1);
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 119,70');
  assert.equal(t.cartBadge.textContent, '3', 'cart must not be cleared');

  const t2 = boot('#/checkout', { cartStorage: { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 1 }]) } });
  fillCheckout(t2, VALID);
  t2.win.DanCart.clear();
  submitForm(t2);
  assert.ok(t2.has('cart-empty'));
  assert.equal(t2.heading(), 'Fechar pedido');
});

test('checkout validator boundaries for CEP and name', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 1 }]) };
  const cases = [
    ['cep', '01310100', true], ['cep', '013101000', false], ['cep', '01310-100', true], ['cep', '0131-0100', false],
    ['name', '   ', false], ['name', 'Maria', false], ['name', 'Ana Li', true],
  ];
  cases.forEach(function (c) {
    const t = boot('#/checkout', { cartStorage: Object.assign({}, store) });
    const inputs = fillCheckout(t, Object.assign({}, VALID, { [c[0]]: c[1] }));
    submitForm(t);
    const idx = inputs.findIndex(function (i) { return i.name === c[0]; });
    const msg = byClass(t, 'form-error')[idx];
    if (c[2]) {
      assert.equal(t.heading(), 'Pedido confirmado', c[0] + ' ' + c[1]);
    } else {
      assert.notEqual(msg.textContent, '', c[0] + ' ' + JSON.stringify(c[1]));
    }
  });
});

test('confirmation updates focus, title and protocol; errors clear and refocus on retry; multi-line summary', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 1 }, { id: 'frango-grelhado', size: 'Individual', qty: 2 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  assert.equal(byClass(t, 'cart-name').length, 2);
  const inputs = fillCheckout(t, Object.assign({}, VALID, { name: 'x', cep: '' }));
  submitForm(t);
  assert.equal(inputs[0].focusCount, 1);
  fillCheckout(t, Object.assign({}, VALID, { cep: '' }));
  submitForm(t);
  assert.equal(byClass(t, 'form-error')[0].textContent, '');
  assert.equal(inputs[0].attrs['aria-invalid'], undefined);
  assert.equal(inputs[1].focusCount, 1);
  const before = t.app.focusCount || 0;
  fillCheckout(t, VALID);
  submitForm(t);
  assert.equal(t.app.focusCount, before + 1);
  assert.equal(t.doc.title, 'Pedido confirmado \u2013 Dan Food');
  assert.match(byClass(t, 'order-confirmation')[0].textContent, /DAN-[A-Z2-9]{4}/);
});

test('detail page shows description, specifications and price for every product', function () {
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  const all = ctx.window.DanProducts.all();
  assert.ok(all.length > 0);
  all.forEach(function (p) {
    assert.ok(p.specs && p.specs.length > 0, p.id + ' specs');
    const t = boot('#/produto/' + p.id);
    assert.equal(t.has('specs'), true, p.id);
    const texts = [];
    walk(t.app, function (n) { if (n.textContent) { texts.push(n.textContent); } });
    assert.ok(texts.indexOf('Detalhes do prato') !== -1, p.id);
    assert.ok(texts.indexOf(p.description) !== -1, p.id);
    assert.ok(texts.some(function (x) { return /^R\$ /.test(x); }), p.id + ' price');
    const dl = collect(t.app, function (n) { return n.className === 'specs-list'; });
    assert.equal(dl.length, 1, p.id);
    assert.equal(dl[0].tagName, 'dl', p.id);
    assert.equal(dl[0].children.length, p.specs.length * 2, p.id);
    p.specs.forEach(function (s, i) {
      const dt = dl[0].children[i * 2];
      const dd = dl[0].children[i * 2 + 1];
      assert.equal(dt.tagName, 'dt', p.id);
      assert.equal(dt.textContent, s.label, p.id);
      assert.equal(dd.tagName, 'dd', p.id);
      assert.equal(dd.textContent, s.value, p.id);
      assert.ok(typeof s.label === 'string' && s.label.trim() && typeof s.value === 'string' && s.value.trim(), p.id + ' spec shape');
    });
  });
});

test('detail page shows a specifications fallback when a product has none or empty specs', function () {
  [undefined, []].forEach(function (specs) {
    const t = boot('#/produto/x', { products: [{ id: 'x', name: 'Xyz', description: 'd', priceCents: 100, specs: specs }] });
    const texts = [];
    walk(t.app, function (n) { if (n.textContent) { texts.push(n.textContent); } });
    assert.ok(texts.indexOf('Detalhes indisponíveis.') !== -1);
    assert.equal(collect(t.app, function (n) { return n.tagName === 'dl'; }).length, 0);
  });
});

test('catalog cards have no quick add: a size must be chosen on the product page', function () {
  const t = boot('#/catalog', { cartStorage: {} });
  assert.equal(byClass(t, 'catalog-add').length, 0);
  assert.equal(byClass(t, 'product-card').length, t.win.DanProducts.all().length);
  assert.equal(t.win.DanCart.count(), 0);
});

test('catalog honours ?category= from the hash and ignores unknown categories', function () {
  const t = boot('#/catalog?category=Massas%20%26%20Risotos');
  const hrefs = byClass(t, 'product-card').map(function (c) { return c.href; });
  const services = Array.from(t.win.DanProducts.all()).filter(function (p) { return p.category === 'Massas & Risotos'; });
  assert.deepEqual(hrefs, services.map(function (p) { return '#/produto/' + p.id; }));
  const pressed = byClass(t, 'filter-button').filter(function (b) { return b.attrs['aria-pressed'] === 'true'; });
  assert.deepEqual(pressed.map(function (b) { return b.textContent; }), ['Massas & Risotos']);
  assert.equal(byClass(boot('#/catalog?category=Nope'), 'product-card').length, t.win.DanProducts.all().length);
  assert.equal(byClass(boot('#/catalog?category=%E0%A4%A'), 'product-card').length, t.win.DanProducts.all().length);
});

test('home shows category links and a showcase of products', function () {
  const t = boot('#/');
  const links = byClass(t, 'category-link');
  assert.deepEqual(links.map(function (l) { return l.textContent; }), ['Pratos Executivos', 'Massas & Risotos', 'Burgers Artesanais', 'Sobremesas & Bebidas']);
  assert.equal(links[1].href, '#/catalog?category=Massas%20%26%20Risotos');
  assert.equal(byClass(t, 'product-card').length, 4);
});

// ----- Coupon -----

function couponSubmit(t, code) {
  const input = collect(t.app, function (n) { return n.tagName === 'input'; })[0];
  input.value = code;
  const form = collect(t.app, function (n) { return n.tagName === 'form'; })[0];
  form.listeners.submit({ preventDefault() {} });
  return input;
}

test('cart coupon: invalid codes show an error, DAN10 discounts the total and can be removed', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 2 }]) };
  const t = boot('#/cart', { cartStorage: store });
  const input = couponSubmit(t, 'nope');
  assert.equal(byClass(t, 'coupon-status')[0].textContent, 'This coupon is not valid.');
  assert.equal(input.attrs['aria-invalid'], 'true');
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 79,80');
  couponSubmit(t, ' dan10 ');
  assert.match(byClass(t, 'coupon-applied')[0].textContent, /Cupom DAN10 aplicado/);
  assert.equal(byClass(t, 'cart-subtotal-line')[0].textContent, 'Subtotal: R$ 79,80');
  assert.equal(byClass(t, 'cart-discount')[0].textContent, 'Cupom DAN10: \u2212R$ 7,98');
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 71,82');
  assert.equal(store['dan-coupon'], 'DAN10');
  t.go('#/checkout');
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 71,82');
  t.go('#/cart');
  byClass(t, 'text-button').filter(function (b) { return b.textContent === 'Remover cupom'; })[0].listeners.click();
  assert.equal(byClass(t, 'cart-discount').length, 0);
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 79,80');
});

test('a coupon persists across reloads and checkout confirms the discounted total', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 2 }]), 'dan-coupon': 'DAN10' };
  const t = boot('#/checkout', { cartStorage: store });
  fillCheckout(t, VALID);
  submitForm(t);
  assert.match(byClass(t, 'order-confirmation')[0].textContent, /R\$ 86,72/);
  assert.equal(t.win.DanCart.coupon(), null, 'coupon is consumed by the order');
});

test('home hero names the shop and links to the catalog', function () {
  const t = boot('#/');
  assert.ok(t.has('hero'));
  assert.equal(t.heading(), 'Dan Food');
  const cta = byClass(t, 'action-button hero-cta')[0];
  assert.equal(cta.tagName, 'a');
  assert.equal(cta.href, '#/catalog');
});

test('every route sets its own title and description, mirrored in og tags', function () {
  const t = boot('#/');
  const first = t.win.DanProducts.all()[0];
  const routes = [
    ['#/', /^Dan Food/],
    ['#/about', /^Sobre/],
    ['#/catalog', /^Cardápio/],
    ['#/cart', /^Sacola/],
    ['#/checkout', /^Fechar pedido/],
    ['#/nope', /^404/],
    ['#/produto/' + encodeURIComponent(first.id), new RegExp(first.name)],
  ];
  const titles = new Set();
  const descriptions = new Set();
  routes.forEach(function (r) {
    t.go(r[0]);
    assert.match(t.doc.title, r[1], r[0]);
    assert.ok(t.description() && t.description().length > 10, r[0] + ' has a description');
    assert.equal(t.ogTitle(), t.doc.title, r[0] + ' og:title');
    assert.equal(t.ogDescription(), t.description(), r[0] + ' og:description');
    titles.add(t.doc.title);
    descriptions.add(t.description());
  });
  assert.equal(titles.size, routes.length);
  assert.equal(descriptions.size, routes.length);
  t.go('#/about');
  assert.equal(t.description(), 'Sobre o Dan Food, um restaurante simulado construido como uma pequena aplicacao de pagina unica.');
  t.go('#/produto/' + encodeURIComponent(first.id));
  assert.equal(t.description(), first.name + ': ' + first.description);
});

test('navigation does not throw when the page has no meta tags', function () {
  const t = boot('#/', { noMeta: true });
  t.go('#/about');
  assert.equal(t.doc.title, 'Sobre \u2013 Dan Food');
  assert.equal(t.description(), undefined);
});

test('checkout submit paths update title and meta', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 1 }]) };
  const t = boot('#/checkout', { cartStorage: store });
  fillCheckout(t, VALID);
  // Cart changes after render: the stale-summary path re-renders with fresh meta.
  store['dan-cart'] = JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 2 }]);
  t.win.DanCart.reload();
  t.doc.title = '';
  submitForm(t);
  assert.equal(t.doc.title, 'Fechar pedido \u2013 Dan Food');
  assert.match(t.description(), /Feche seu pedido Dan Food/);
  fillCheckout(t, VALID);
  submitForm(t);
  assert.equal(t.doc.title, 'Pedido confirmado \u2013 Dan Food');
  assert.equal(t.description(), 'Seu pedido simulado do Dan Food foi confirmado.');
  assert.equal(t.ogTitle(), 'Pedido confirmado \u2013 Dan Food');
});

test('index.html SEO tags are complete and match the home view', function () {
  assert.match(html, /<meta name="description" content="[^"]{20,}"/);
  ['og:type', 'og:site_name', 'og:title', 'og:description'].forEach(function (p) {
    assert.match(html, new RegExp('<meta property="' + p + '" content="[^"]+"'), p);
  });
  assert.match(html, /<meta name="twitter:card" content="[^"]+"/);
  assert.match(html, /<meta name="viewport"/);
  const title = html.match(/<title>([^<]+)<\/title>/)[1];
  assert.equal(title, boot('#/').doc.title);
});

test('cart shows a saved coupon that does not apply, and DAN50 is refused below its minimum', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 1 }]), 'dan-coupon': 'DAN50' };
  const t = boot('#/cart', { cartStorage: store });
  assert.match(byClass(t, 'coupon-applied')[0].textContent, /não se aplica/);
  assert.equal(byClass(t, 'cart-discount').length, 0);
  assert.equal(byClass(t, 'cart-total')[0].textContent, 'Total: R$ 39,90');
  const fresh = boot('#/cart', { cartStorage: { 'dan-cart': store['dan-cart'] } });
  couponSubmit(fresh, 'DAN50');
  assert.match(byClass(fresh, 'coupon-status')[0].textContent, /requires a subtotal/);
});

test('checkout confirms the undiscounted total for a stale fixed coupon', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 1 }]), 'dan-coupon': 'DAN50' };
  const t = boot('#/checkout', { cartStorage: store });
  fillCheckout(t, VALID);
  submitForm(t);
  assert.match(byClass(t, 'order-confirmation')[0].textContent, /R\$ 54,80/);
});

test('a legacy size-less cart is discarded and shows the empty state', function () {
  const t = boot('#/cart', { cartStorage: { 'dan-cart': JSON.stringify([{ id: 'creatine', qty: 2 }, { id: 'file-parmegiana', qty: 1 }]) } });
  assert.ok(t.has('cart-empty'));
  assert.equal(t.cartBadge.textContent, '0');
});

test('shell: language, Portuguese nav labels and footer links', function () {
  assert.match(html, /<html lang="pt-BR">/);
  const nav = html.match(/<nav aria-label="Main"[^>]*>([\s\S]*?)<\/nav>/)[1];
  ['Início', 'Cardápio', 'Sobre', 'Sacola'].forEach(function (label) {
    assert.ok(nav.indexOf(label) !== -1, 'nav should list ' + label);
  });
  assert.match(html, /<nav aria-label="Main" lang="pt-BR">/);
  const footer = html.match(/<footer\b[\s\S]*?<\/footer>/)[0];
  ['#/catalog', '#/about', '#/cart'].forEach(function (href) {
    assert.ok(footer.indexOf('href="' + href + '"') !== -1, 'footer should link ' + href);
  });
  assert.doesNotMatch(footer, /nav-link/, 'footer links must not get aria-current from the nav loop');
});

test('the 404 page has friendly copy and a link home', function () {
  const t = boot('#/nope');
  assert.match(t.heading(), /404/);
  assert.match(t.doc.title, /^404/);
  assert.equal(t.description(), 'The page you are looking for does not exist.');
});

test('prep times per portion are exact, covering rounding and zero-padding', function () {
  const ctx = { window: {} };
  vm.runInNewContext(productsJs, ctx);
  const times = function (id) {
    return Array.from(ctx.window.DanProducts.find(id).measurements.rows.map(function (r) { return r.values[0]; }));
  };
  assert.deepEqual(times('pudim-leite'), ['10 min', '15 min']);
  assert.deepEqual(times('frango-grelhado'), ['25 min', '30 min', '40 min']);
  assert.deepEqual(times('suco-natural'), ['5 min', '5 min']);
  assert.deepEqual(times('file-parmegiana'), ['30 min', '40 min', '45 min']);
  assert.deepEqual(times('feijoada-completa'), ['50 min', '1h05', '1h15']);
  assert.deepEqual(times('burger-classico'), ['20 min', '25 min', '30 min']);
});

test('technical table caption falls back when the table has no unit', function () {
  const product = { id: 'x', name: 'Xyz', description: 'd', priceCents: 100, sizes: ['A'],
    measurements: { columns: ['C'], rows: [{ size: 'A', values: ['1'] }] } };
  const t = boot('#/produto/x', { products: [product] });
  const table = collect(t.app, function (n) { return n.tagName === 'table'; })[0];
  assert.equal(collect(table, function (n) { return n.tagName === 'caption'; })[0].textContent, 'Informação nutricional');
});

test('every service has a technical checklist and the detail route renders it', function () {
  const t = boot('#/produto/frango-grelhado');
  const items = byClass(t, 'checklist-item').map(function (n) { return n.textContent; });
  const product = t.win.DanProducts.find('frango-grelhado');
  assert.deepEqual(items, Array.from(product.checklist));
  Array.from(t.win.DanProducts.all()).forEach(function (p) {
    assert.ok(p.checklist.length >= 3, p.id);
  });
  assert.equal(byClass(t, 'bay-time')[0].textContent, 'Tempo de preparo estimado: ' + product.boxTime);
});

test('cart summary shows packaging (parts) and food (labour) before the subtotal and discount', function () {
  const store = { 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 2 }]) };
  const t = boot('#/cart', { cartStorage: store });
  assert.equal(byClass(t, 'cart-parts')[0].textContent, 'Embalagem térmica: R$ 6,00');
  assert.equal(byClass(t, 'cart-labor')[0].textContent, 'Alimentos: R$ 73,80');
  couponSubmit(t, 'DAN10');
  assert.equal(byClass(t, 'cart-parts')[0].textContent, 'Embalagem térmica: R$ 6,00');
  assert.equal(byClass(t, 'cart-subtotal-line')[0].textContent, 'Subtotal: R$ 79,80');
});
