'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
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
