/* Product detail page: size selection, size guide, feedback and 404. */
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
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; },
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
function byClass(app, cls) { return find(app, function (n) { return n.className.split(' ').indexOf(cls) !== -1; }); }

function boot(hash) {
  const app = makeNode('main');
  const store = {};
  const win = { location: { hash: hash }, listeners: {},
    localStorage: { getItem(k) { return k in store ? store[k] : null; }, setItem(k, v) { store[k] = String(v); } },
    addEventListener(t, fn) { win.listeners[t] = fn; } };
  const doc = {
    readyState: 'complete', title: '', createElement: makeNode,
    createDocumentFragment() { return makeNode('#fragment'); },
    getElementById(id) { return id === 'app' ? app : null; },
    querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {},
  };
  const ctx = { window: win, document: doc };
  vm.createContext(ctx);
  ['products.js', 'cart.js', 'script.js'].forEach(function (f) { vm.runInContext(read(f), ctx); });
  return { app, store };
}

const buttons = function (t) { return byClass(t.app, 'size-button'); };
const pressed = function (t) { return buttons(t).filter(function (b) { return b.attrs['aria-pressed'] === 'true'; }).map(function (b) { return b.textContent; }); };
const text = function (t, cls) { return byClass(t.app, cls)[0].textContent; };

test('detail shows description, specialty, bay time and BRL price', function () {
  const t = boot('#/produto/oil-change');
  const all = [];
  walk(t.app, function (n) { if (n.textContent) { all.push(n.textContent); } });
  ['R$ 249,90', 'Revisao & Motor', '1h', 'Hatch/Sedan, SUV/Picape, Utilitario', 'Oleo do motor, filtro de oleo e filtro de ar com checklist de 20 itens.'].forEach(function (s) {
    assert.ok(all.indexOf(s) !== -1, s);
  });
});

test('technical table lists a row per porte with bay time', function () {
  const t = boot('#/produto/oil-change');
  const rows = find(t.app, function (n) { return n.tagName === 'tr' && n.attrs['data-size']; });
  const sizes = rows.map(function (r) { return r.attrs['data-size']; });
  ['Hatch/Sedan', 'SUV/Picape', 'Utilitario'].forEach(function (s) { assert.ok(sizes.indexOf(s) !== -1, s); });
  const m = rows.filter(function (r) { return r.attrs['data-size'] === 'SUV/Picape'; })[0];
  assert.deepEqual(m.children.map(function (c) { return c.textContent; }), ['SUV/Picape', '1h15', '90 dias', '10.000 km ou 12 meses']);
});

test('size buttons are real buttons with aria-pressed; selection is exclusive', function () {
  const t = boot('#/produto/oil-change');
  buttons(t).forEach(function (b) { assert.equal(b.tagName, 'button'); assert.equal(b.type, 'button'); });
  assert.deepEqual(pressed(t), []);
  assert.equal(text(t, 'size-selected'), 'No vehicle size selected');
  buttons(t)[0].listeners.click();
  assert.deepEqual(pressed(t), ['Hatch/Sedan']);
  buttons(t)[1].listeners.click();
  assert.deepEqual(pressed(t), ['SUV/Picape']);
  assert.equal(text(t, 'size-selected'), 'Selected vehicle size: SUV/Picape');
});

test('selecting a size highlights its row in the size guide', function () {
  const t = boot('#/produto/oil-change');
  buttons(t)[0].listeners.click();
  let marked = byClass(t.app, 'is-selected');
  assert.equal(marked.length, 1);
  assert.equal(marked[0].attrs['data-size'], 'Hatch/Sedan');
  buttons(t)[1].listeners.click();
  marked = byClass(t.app, 'is-selected');
  assert.equal(marked.length, 1);
  assert.equal(marked[0].attrs['data-size'], 'SUV/Picape');
});

test('add without a size shows an error, flags the picker and focuses it; nothing is added', function () {
  const t = boot('#/produto/oil-change');
  byClass(t.app, 'add-to-cart')[0].listeners.click();
  const status = byClass(t.app, 'cart-status')[0];
  assert.equal(status.textContent, 'Select a vehicle size first.');
  assert.match(status.className, /is-error/);
  assert.match(byClass(t.app, 'size-picker')[0].className, /needs-size/);
  assert.equal(buttons(t)[0].focusCount, 1);
  assert.equal(byClass(t.app, 'size-picker')[0].attrs['aria-describedby'], status.id);
  assert.equal(t.store['dan-cart'], undefined);
  buttons(t)[1].listeners.click();
  assert.doesNotMatch(byClass(t.app, 'size-picker')[0].className, /needs-size/);
  assert.equal(byClass(t.app, 'cart-status')[0].textContent, '');
  assert.doesNotMatch(byClass(t.app, 'cart-status')[0].className, /is-error/);
  assert.equal(byClass(t.app, 'size-picker')[0].attrs['aria-describedby'], undefined);
});

test('max quantity shows an error status', function () {
  const t = boot('#/produto/oil-change');
  buttons(t)[0].listeners.click();
  const add = byClass(t.app, 'add-to-cart')[0];
  for (let i = 0; i < 99; i++) { add.listeners.click(); }
  assert.match(byClass(t.app, 'cart-status')[0].className, /is-success/);
  add.listeners.click();
  const status = byClass(t.app, 'cart-status')[0];
  assert.equal(status.textContent, 'Maximum quantity reached.');
  assert.match(status.className, /is-error/);
});

test('add with a size confirms with a success state and stores the size', function () {
  const t = boot('#/produto/brake-pads');
  buttons(t)[1].listeners.click();
  byClass(t.app, 'add-to-cart')[0].listeners.click();
  const status = byClass(t.app, 'cart-status')[0];
  assert.equal(status.textContent, 'Added SUV/Picape to cart.');
  assert.match(status.className, /is-success/);
  assert.deepEqual(JSON.parse(t.store['dan-cart']), [{ id: 'brake-pads', size: 'SUV/Picape', qty: 1 }]);
});

test('unknown piece still renders the 404 state', function () {
  const t = boot('#/produto/nao-existe');
  const h1 = find(t.app, function (n) { return n.tagName === 'h1'; })[0];
  assert.match(h1.textContent, /404/);
  assert.equal(buttons(t).length, 0);
});
