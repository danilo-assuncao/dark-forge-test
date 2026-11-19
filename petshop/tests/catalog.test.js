'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const C = require('../catalog.js');

const ROOT = path.join(__dirname, '..');

test('required files exist', () => {
  ['index.html', 'styles.css', 'catalog.js', 'tests/catalog.test.js'].forEach((f) =>
    assert.ok(fs.existsSync(path.join(ROOT, f)), f));
});

test('styles.css is light-only with no dark mode selectors', () => {
  const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');
  assert.match(css, /color-scheme:\s*only light\s*;/);
  assert.doesNotMatch(css, /prefers-color-scheme|data-theme|dark/i);
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

test('index.html wires the catalog', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /catalog\.js/);
  assert.match(html, /styles\.css/);
});
