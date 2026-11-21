const test = require('node:test');
const assert = require('node:assert/strict');
const { searchCatalog, getProductById, findGenericAlternatives, products } = require('../catalog.js');

test('searchCatalog filters by query and stripe', () => {
  const all = searchCatalog();
  assert.equal(all.length, 8);

  const isento = searchCatalog({ stripe: 'isento' });
  assert.equal(isento.length, 2);
  assert.ok(isento.every(p => p.stripe === 'isento'));

  const amox = searchCatalog({ query: 'amoxi' });
  assert.equal(amox.length, 2);

  const combined = searchCatalog({ query: 'amoxi', stripe: 'vermelha' });
  assert.equal(combined.length, 1);
  assert.equal(combined[0].id, 'p7');
});

test('getProductById returns correct product or null', () => {
  const p = getProductById('p5');
  assert.ok(p);
  assert.equal(p.name, 'Roacutan 20mg 30cp');
  assert.equal(p.stripe, 'vermelha');
  assert.equal(p.requiresPrescription, true);

  const missing = getProductById('not-found');
  assert.equal(missing, null);
});

test('findGenericAlternatives returns products with same active ingredient and lower price', () => {
  const altsP1 = findGenericAlternatives('p1');
  assert.equal(altsP1.length, 1);
  assert.equal(altsP1[0].id, 'p2');
  assert.ok(altsP1[0].priceBrl < 22.50);

  const altsP5 = findGenericAlternatives('p5');
  assert.equal(altsP5.length, 1);
  assert.equal(altsP5[0].id, 'p6');
  assert.ok(altsP5[0].priceBrl < 250.00);

  // For the lowest price alternative, it should return an empty array
  const altsP6 = findGenericAlternatives('p6');
  assert.equal(altsP6.length, 0);

  const missingAlts = findGenericAlternatives('not-found');
  assert.deepEqual(missingAlts, []);
});

test('Products have valid properties according to rules', () => {
  assert.ok(products.length >= 6);
  const stripes = new Set(products.map(p => p.stripe));
  assert.ok(stripes.has('isento'));
  assert.ok(stripes.has('vermelha'));
  assert.ok(stripes.has('generico'));

  products.forEach(p => {
    assert.ok(p.id);
    assert.ok(p.name);
    assert.ok(p.activeIngredient);
    assert.ok(typeof p.priceBrl === 'number');
    assert.equal(p.requiresPrescription, p.stripe === 'vermelha');
  });
});
