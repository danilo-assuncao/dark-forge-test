'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../catalog.js');

const ROOT = path.join(__dirname, '..');

test('required files exist', () => {
  ['index.html', 'styles.css', 'catalog.js'].forEach((f) =>
    assert.ok(fs.existsSync(path.join(ROOT, f)), f));
});

test('styles.css is light-only with no dark mode selectors', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /color-scheme:\s*only light\s*;/);
  assert.doesNotMatch(css, /prefers-color-scheme|data-theme/i);
});

test('catalog covers the 4 categories, each with items', () => {
  assert.deepEqual(C.CATEGORIES.map((c) => c.name), ['Caes', 'Gatos', 'Banho & Tosa', 'Farmacia Pet']);
  C.CATEGORIES.forEach((c) => assert.ok(C.itemsByCategory(c.id).length > 0, c.id));
  C.ITEMS.forEach((i) => assert.ok(C.CATEGORIES.some((c) => c.id === i.category)));
});

test('sizes are Mini, Medio, Grande', () => {
  assert.deepEqual(C.SIZES.map((s) => s.name), ['Mini', 'Medio', 'Grande']);
  assert.equal(C.sizeForWeight(4).name, 'Mini');
  assert.equal(C.sizeForWeight(10).name, 'Mini');
  assert.equal(C.sizeForWeight(20).name, 'Medio');
  assert.equal(C.sizeForWeight(30).name, 'Grande');
  assert.equal(C.sizeForWeight(0), null);
});

test('dosage table covers all sizes contiguously', () => {
  const sizes = new Set(C.DOSAGE_TABLE.map((r) => r.size));
  assert.deepEqual([...sizes], ['mini', 'medio', 'grande']);
  assert.equal(C.DOSAGE_TABLE[0].minKg, 0);
  for (let i = 1; i < C.DOSAGE_TABLE.length; i++) {
    assert.equal(C.DOSAGE_TABLE[i].minKg, C.DOSAGE_TABLE[i - 1].maxKg);
  }
  assert.equal(C.DOSAGE_TABLE[C.DOSAGE_TABLE.length - 1].maxKg, Infinity);
  assert.equal(C.dosageForWeight(3).dose, '1/2 comprimido');
  assert.equal(C.dosageForWeight(12).dose, '2 comprimidos');
  assert.equal(C.dosageForWeight(50).dose, '5 comprimidos');
});

test('pricing and formatting', () => {
  const banho = C.ITEMS.find((i) => i.id === 'banho-simples');
  assert.equal(C.priceFor(banho, 'mini'), 5000);
  assert.equal(C.priceFor(banho, 'grande'), 9000);
  assert.equal(C.priceFor(C.ITEMS.find((i) => i.id === 'arranhador'), 'grande'), null);
  assert.equal(C.formatBRL(189900), 'R$ 1.899,00');
});

test('boundaries for size and dosage', () => {
  [[5, 'mini', '1/2 comprimido'], [5.01, 'mini', '1 comprimido'], [10, 'mini', '1 comprimido'],
   [10.01, 'medio', '2 comprimidos'], [17.5, 'medio', '2 comprimidos'], [17.51, 'medio', '3 comprimidos'],
   [25, 'medio', '3 comprimidos'], [25.01, 'grande', '4 comprimidos'], [40, 'grande', '4 comprimidos'],
   [40.01, 'grande', '5 comprimidos']].forEach(([kg, size, dose]) => {
    assert.equal(C.sizeForWeight(kg).id, size, 'size ' + kg);
    assert.equal(C.dosageForWeight(kg).dose, dose, 'dose ' + kg);
  });
});

test('invalid weights return null', () => {
  [0, -1, NaN, '5', undefined, null].forEach((v) => {
    assert.equal(C.sizeForWeight(v), null, String(v));
    assert.equal(C.dosageForWeight(v), null, String(v));
  });
  assert.equal(C.dosageForWeight(Infinity).dose, '5 comprimidos');
});

test('SIZES, DOSAGE_TABLE and ITEMS are consistent', () => {
  for (let kg = 0.5; kg <= 80; kg += 0.5) {
    assert.equal(C.dosageForWeight(kg).size, C.sizeForWeight(kg).id, 'kg ' + kg);
  }
  C.DOSAGE_TABLE.forEach((r) => {
    const s = C.SIZES.find((x) => x.id === r.size);
    assert.ok(r.minKg >= s.minKg && r.maxKg <= s.maxKg, r.size);
  });
  const ids = C.ITEMS.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  C.ITEMS.forEach((i) => {
    assert.ok(Number.isInteger(i.price));
    i.sizes.forEach((sz) => assert.ok(C.SIZES.some((x) => x.id === sz), i.id + ' ' + sz));
  });
});

test('priceFor covers medio rounding, non-service and unavailable sizes', () => {
  const get = (id) => C.ITEMS.find((i) => i.id === id);
  assert.equal(C.priceFor(get('banho-simples'), 'medio'), 7000);
  assert.equal(C.priceFor(get('tosa-higienica'), 'medio'), 5600);
  assert.equal(C.priceFor(get('banho-e-tosa'), 'grande'), 16200);
  assert.equal(C.priceFor(get('vermifugo'), 'grande'), 4590);
  assert.equal(C.priceFor(get('suplemento-articular'), 'mini'), null);
});

test('formatBRL edge values', () => {
  assert.equal(C.formatBRL(0), 'R$ 0,00');
  assert.equal(C.formatBRL(5), 'R$ 0,05');
  assert.equal(C.formatBRL(99999), 'R$ 999,99');
  assert.equal(C.formatBRL(100000000), 'R$ 1.000.000,00');
});

function fakeNode(tag) {
  return {
    tagName: tag, className: '', textContent: '', children: [], attrs: {}, dataset: {}, listeners: {}, type: '',
    get firstChild() { return this.children[0] || null; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(e, f) { this.listeners[e] = f; },
  };
}

test('index.html inline script renders nav, cards, sizes and dosage table', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /catalog\.js/);
  assert.match(html, /styles\.css/);
  const src = /<script>([\s\S]*?)<\/script>/.exec(html)[1];
  const els = { categories: fakeNode('nav'), catalog: fakeNode('section'), sizes: fakeNode('ul') };
  const tbody = fakeNode('tbody');
  const document = {
    getElementById: (id) => els[id],
    querySelector: (sel) => { assert.equal(sel, '#dosage tbody'); return tbody; },
    createElement: fakeNode,
  };
  const ctx = { window: { DanPetsCatalog: C }, document };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const text = (n) => n.textContent;
  assert.equal(els.categories.children.length, 4);
  assert.equal(els.catalog.children.length, C.itemsByCategory('caes').length);
  assert.equal(els.sizes.children.length, 3);
  assert.equal(text(els.sizes.children[1]), 'Medio (acima de 10 ate 25 kg)');
  assert.equal(tbody.children.length, 6);
  assert.equal(text(tbody.children[5].children[1]), 'acima de 40 kg');
  assert.equal(text(tbody.children[1].children[1]), 'acima de 5 ate 10 kg');
  els.categories.children[3].listeners.click();
  assert.equal(els.catalog.children.length, C.itemsByCategory('farmacia').length);
  assert.equal(text(els.catalog.children[0].children[0]), 'Vermifugo Oral');
  assert.equal(els.categories.children[3].attrs['aria-pressed'], 'true');
  assert.equal(els.categories.children[0].attrs['aria-pressed'], 'false');
});
