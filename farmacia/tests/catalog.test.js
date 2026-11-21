const test = require('node:test');
const assert = require('node:assert/strict');
const { searchCatalog, getProductById, findGenericAlternatives, products } = require('../catalog.js');

test('searchCatalog filter logic and edge cases', async (t) => {
  await t.test('returns all products when no filters are applied', () => {
    const all = searchCatalog();
    assert.equal(all.length, products.length);
  });

  await t.test('filters by query string (case-insensitive, name or ingredient)', () => {
    const amox = searchCatalog({ query: 'AMOXI' });
    assert.equal(amox.length, 3);

    const ingredientMatch = searchCatalog({ query: 'cafeína' });
    assert.ok(ingredientMatch.length >= 2);
  });

  await t.test('filters by stripe', () => {
    const isento = searchCatalog({ stripe: 'isento' });
    assert.ok(isento.length >= 2);
    assert.ok(isento.every(p => p.stripe === 'isento'));
  });

  await t.test('returns empty array when query has no matches', () => {
    const empty = searchCatalog({ query: 'zzz' });
    assert.deepEqual(empty, []);
  });

  await t.test('returns empty array for invalid stripe', () => {
    const empty = searchCatalog({ stripe: 'nope' });
    assert.deepEqual(empty, []);
  });

  await t.test('returns empty array if query is not a string', () => {
    const empty = searchCatalog({ query: ['invalid'] });
    assert.deepEqual(empty, []);
  });
  
  await t.test('returns all if query is empty string', () => {
    const all = searchCatalog({ query: '' });
    assert.equal(all.length, products.length);
  });
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

test('findGenericAlternatives returns cheaper generics and sorts by price', () => {
  const altsP1 = findGenericAlternatives('p1');
  assert.equal(altsP1.length, 2);
  assert.equal(altsP1[0].id, 'p2'); 
  assert.equal(altsP1[1].id, 'p2b'); 
  assert.ok(altsP1.every(a => a.isGeneric === true));
  assert.ok(altsP1.every(a => a.priceBrl < 22.50));

  const altsP7 = findGenericAlternatives('p7');
  assert.equal(altsP7.length, 2);
  assert.equal(altsP7[0].id, 'p8');
  assert.equal(altsP7[1].id, 'p9');
  assert.ok(altsP7.every(a => a.isGeneric === true));
  
  const altsP8 = findGenericAlternatives('p8');
  assert.equal(altsP8.length, 0);

  const missingAlts = findGenericAlternatives('not-found');
  assert.deepEqual(missingAlts, []);
});

test('findGenericAlternatives normalizes ingredient strings', () => {
  const alts = findGenericAlternatives('p1');
  const ids = alts.map(a => a.id);
  assert.ok(ids.includes('p2b'));
});

test('Products have valid properties according to rules', () => {
  assert.ok(products.length >= 6);
  
  const ids = new Set();
  const stripes = new Set(products.map(p => p.stripe));
  assert.ok(stripes.has('isento'));
  assert.ok(stripes.has('vermelha'));
  assert.ok(stripes.has('generico'));

  products.forEach(p => {
    assert.ok(!ids.has(p.id));
    ids.add(p.id);
    
    assert.ok(p.name);
    assert.ok(p.activeIngredient);
    
    assert.ok(Number.isFinite(p.priceBrl));
    assert.ok(p.priceBrl > 0);
    
    assert.ok(['isento', 'vermelha', 'generico'].includes(p.stripe));
    
    if (p.stripe === 'vermelha') {
      assert.equal(p.requiresPrescription, true);
    }
    
    assert.ok(typeof p.isGeneric === 'boolean');
  });
});

test('Catalog immutability and references', () => {
  const originalPrice = products[0].priceBrl;
  
  // In non-strict mode, assigning to a frozen object silently fails.
  // We check that the value did not actually change.
  products[0].priceBrl = 9999;
  assert.equal(products[0].priceBrl, originalPrice);
  
  const results = searchCatalog();
  results[0].priceBrl = 9999;
  assert.notEqual(products[0].priceBrl, 9999);
  assert.equal(products[0].priceBrl, originalPrice);
});
