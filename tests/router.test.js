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

function boot(hash) {
  const app = makeNode('main');
  const skip = makeNode('a');
  const navLinks = ['#/', '#/catalog', '#/about'].map(function (href) {
    const a = makeNode('a');
    a.href = href;
    return a;
  });
  const win = { location: { hash: hash }, listeners: {} };
  win.addEventListener = function (type, fn) { win.listeners[type] = fn; };
  const doc = {
    readyState: 'complete', title: '',
    createElement: makeNode,
    createDocumentFragment() { return makeNode('#fragment'); },
    getElementById(id) { return id === 'app' ? app : null; },
    querySelector(sel) { return sel === '.skip-link' ? skip : null; },
    querySelectorAll(sel) { return sel === '.nav-link' ? navLinks : []; },
    addEventListener() {},
  };
  const ctx = { window: win, document: doc };
  vm.createContext(ctx);
  vm.runInContext(productsJs, ctx);
  vm.runInContext(js, ctx);
  return {
    app, skip, navLinks, doc, win,
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
  assert.ok(all.length >= 6);
  assert.equal(new Set(all.map(function (p) { return p.id; })).size, all.length);
  all.forEach(function (p) {
    assert.ok(p.name && p.description && Number.isInteger(p.priceCents) && p.priceCents > 0);
  });
  assert.ok(all.some(function (p) { return /whey/i.test(p.name); }));
  assert.ok(all.some(function (p) { return /creatine/i.test(p.name); }));
  assert.equal(ctx.window.DanProducts.find('nope'), null);
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
    assert.equal(card.href, '#/catalog/' + all[i].id);
    const classes = card.children.map(function (c) { return c.className; });
    assert.deepEqual(classes, ['product-image', 'product-name', 'product-price']);
    assert.equal(card.children[1].textContent, all[i].name);
    assert.match(card.children[2].textContent, /^R\$ \d{1,3}(\.\d{3})*,\d{2}$/);
  });
  assert.equal(cards[0].children[2].textContent, 'R$ 159,90');
});

test('a product detail route renders the product; unknown ids give a 404', function () {
  const t = boot('#/catalog/creatine');
  assert.match(t.heading(), /Creatine/);
  assert.match(t.doc.title, /Creatine/);
  assert.equal(t.navLinks[1].attrs['aria-current'], 'page');
  ['#/catalog/nope', '#/catalog/%E0%A4%A', '#/catalog/constructor', '#/catalog/creatine/x'].forEach(function (h) {
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
