'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const catalog = require('../products.js');

test('declares the four categories, presentations and goals', () => {
  assert.deepEqual([...catalog.categories], ['Proteinas', 'Vitaminas & Longevidade', 'Pre-Treino & Energia', 'Planos Alimentares']);
  assert.deepEqual([...catalog.presentations], ['300g', '900g', '60 caps', 'Mensal']);
  assert.deepEqual([...catalog.goals], ['Hipertrofia', 'Emagrecimento', 'Saude']);
});

test('every product is consistent with the catalog contracts', () => {
  const ids = new Set();
  for (const p of catalog.products) {
    assert.ok(!ids.has(p.id), 'unique id ' + p.id);
    ids.add(p.id);
    assert.ok(catalog.categories.includes(p.category));
    assert.ok(p.presentations.length > 0);
    for (const pr of p.presentations) {
      assert.ok(catalog.presentations.includes(pr));
      assert.ok(Number.isInteger(p.priceCents[pr]) && p.priceCents[pr] > 0);
    }
    assert.deepEqual(Object.keys(p.priceCents).sort(), [...p.presentations].sort(), 'no stray prices ' + p.id);
    assert.equal(p.presentations.includes('Mensal'), p.category === 'Planos Alimentares', 'Mensal only for plans ' + p.id);
    assert.ok(p.goals.length > 0 && p.goals.every((g) => catalog.goals.includes(g)));
    for (const k of ['kcal', 'proteinG', 'carbsG']) {
      assert.ok(typeof p.macros[k] === 'number' && p.macros[k] >= 0, k);
    }
  }
});

test('every category, presentation and goal is used', () => {
  for (const c of catalog.categories) assert.ok(catalog.byCategory(c).length > 0, c);
  for (const g of catalog.goals) assert.ok(catalog.byGoal(g).length > 0, g);
  for (const pr of catalog.presentations) {
    assert.ok(catalog.products.some((p) => p.presentations.includes(pr)), pr);
  }
});

test('find returns a product or null', () => {
  assert.equal(catalog.find('whey-isolado').name, 'Whey Protein Isolado');
  assert.equal(catalog.find('nope'), null);
});

test('byCategory and byGoal filter correctly', () => {
  for (const c of catalog.categories) {
    assert.ok(catalog.byCategory(c).every((p) => p.category === c), c);
  }
  for (const g of catalog.goals) {
    assert.ok(catalog.byGoal(g).every((p) => p.goals.includes(g)), g);
  }
  assert.deepEqual(catalog.byCategory('Proteinas').map((p) => p.id), ['whey-concentrado', 'whey-isolado']);
  assert.deepEqual(catalog.byGoal('Emagrecimento').map((p) => p.id),
    ['whey-isolado', 'omega-3', 'pre-treino', 'cafeina', 'plano-emagrecimento']);
  assert.equal(catalog.byCategory('x').length, 0);
  assert.equal(catalog.byGoal('x').length, 0);
});

test('exposes window.DanNutriProducts when loaded in a browser-like context', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'products.js'), 'utf8');
  const win = {};
  vm.runInNewContext(src, { window: win });
  assert.ok(win.DanNutriProducts);
  assert.equal(win.DanNutriProducts.find('omega-3').name, 'Omega 3');
  assert.equal(win.DanNutriProducts.products.length, catalog.products.length);
});
