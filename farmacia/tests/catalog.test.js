const test = require('node:test');
const assert = require('node:assert/strict');
const { searchCatalog, getProductById, findGenericAlternatives, products } = require('../catalog.js');

test('searchCatalog filter logic and edge cases', async (t) => {
  await t.test('returns all products when no filters are applied', () => {
    const all = searchCatalog();
    assert.equal(all.length, products.length);
  });

  await t.test('returns all when opts is null', () => {
    const all = searchCatalog(null);
    assert.equal(all.length, products.length);
  });

  await t.test('filters by query string (case-insensitive, accent-insensitive, name or ingredient)', () => {
    const amox = searchCatalog({ query: 'AMOXI' });
    const amoxIds = amox.map(p => p.id).sort();
    assert.deepEqual(amoxIds, ['p12', 'p7', 'p8', 'p9']);

    const ingredientMatch = searchCatalog({ query: 'cafeina' }); 
    const ingredientIds = ingredientMatch.map(p => p.id).sort();
    assert.deepEqual(ingredientIds, ['p1', 'p2', 'p2b']);
    
    const specificIngredient = searchCatalog({ query: 'mucato' }); 
    const specificIds = specificIngredient.map(p => p.id).sort();
    assert.deepEqual(specificIds, ['p1', 'p2', 'p2b']);
  });

  await t.test('filters by stripe', () => {
    const isento = searchCatalog({ stripe: 'isento' });
    const isentoIds = isento.map(p => p.id).sort();
    assert.deepEqual(isentoIds, ['p1', 'p11', 'p13', 'p3']);
    assert.ok(isento.every(p => p.stripe === 'isento'));
  });

  await t.test('filters by query and stripe combined', () => {
    const combined = searchCatalog({ query: 'amoxi', stripe: 'vermelha' });
    const combinedIds = combined.map(p => p.id).sort();
    assert.deepEqual(combinedIds, ['p12', 'p7', 'p8', 'p9']);
    
    const none = searchCatalog({ query: 'amoxi', stripe: 'isento' });
    assert.deepEqual(none, []);
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
  
  await t.test('returns all if query is empty string, whitespace only, or null', () => {
    const allEmpty = searchCatalog({ query: '' });
    assert.equal(allEmpty.length, products.length);
    
    const allSpace = searchCatalog({ query: '   ' });
    assert.equal(allSpace.length, products.length);
    
    const allNull = searchCatalog({ query: null });
    assert.equal(allNull.length, products.length);
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
  
  const undefinedId = getProductById(undefined);
  assert.equal(undefinedId, null);
});

test('findGenericAlternatives rules and boundary cases', async (t) => {
  await t.test('returns cheaper generics and sorts by price, handling normalization', () => {
    const altsP1 = findGenericAlternatives('p1');
    assert.equal(altsP1.length, 2);
    assert.equal(altsP1[0].id, 'p2'); 
    assert.equal(altsP1[1].id, 'p2b'); 
    assert.ok(altsP1.every(a => a.isGeneric === true));
    assert.ok(altsP1.every(a => a.priceBrl < 22.50));
  });

  await t.test('prescription status must match exactly (Rx generic never suggested for OTC)', () => {
    // p11 is OTC. p10 is Rx generic with same ingredient and cheaper.
    // They should not match because an Rx generic cannot sub for an OTC.
    const altsP11 = findGenericAlternatives('p11');
    assert.deepEqual(altsP11, []);
    
    // p10 is Rx. p11 is OTC (not generic, but even if it were, it's not Rx). 
    // findGenericAlternatives only returns generics. So for p10, it shouldn't return anything.
    const altsP10 = findGenericAlternatives('p10');
    assert.deepEqual(altsP10, []);
  });

  await t.test('strict price filter: equal priced generics are not returned', () => {
    // p9 is Amoxicilina Gen B at 35.00
    // p12 is Equal Price Generic 1 at 35.00
    // p8 is Amoxicilina Gen at 30.00
    // If we look for alts for p9, only p8 should return, not p12
    const altsP9 = findGenericAlternatives('p9');
    assert.equal(altsP9.length, 1);
    assert.equal(altsP9[0].id, 'p8');
  });

  await t.test('returns empty array if product has no cheaper generic alternatives', () => {
    // p13 has no generics
    const altsP13 = findGenericAlternatives('p13');
    assert.deepEqual(altsP13, []);
    
    // p14 has no generics
    const altsP14 = findGenericAlternatives('p14');
    assert.deepEqual(altsP14, []);
  });
});

test('Products have valid properties and enforce consistency', () => {
  assert.ok(products.length >= 6);
  
  const ids = new Set();
  const stripes = new Set(products.map(p => p.stripe));
  assert.ok(stripes.has('isento'), 'should contain at least one isento product');
  assert.ok(stripes.has('vermelha'), 'should contain at least one vermelha product');
  assert.ok(stripes.has('generico'), 'should contain at least one generico product');

  products.forEach(p => {
    assert.ok(!ids.has(p.id), `duplicate id found: ${p.id}`);
    ids.add(p.id);
    
    assert.ok(p.name, `missing name for ${p.id}`);
    assert.ok(p.activeIngredient, `missing activeIngredient for ${p.id}`);
    
    assert.ok(Number.isFinite(p.priceBrl) && p.priceBrl > 0, `invalid priceBrl for ${p.id}`);
    
    assert.ok(['isento', 'vermelha', 'generico'].includes(p.stripe), `invalid stripe for ${p.id}`);
    
    // Invariants
    if (p.stripe === 'vermelha') {
      assert.equal(p.requiresPrescription, true, `vermelha must require prescription (${p.id})`);
    }
    if (p.requiresPrescription && !p.isGeneric) {
      assert.equal(p.stripe, 'vermelha', `prescription non-generic must be vermelha (${p.id})`);
    }
    if (p.stripe === 'generico') {
      assert.equal(p.isGeneric, true, `stripe generico must be isGeneric (${p.id})`);
    }
    
    assert.ok(typeof p.isGeneric === 'boolean', `isGeneric must be boolean (${p.id})`);
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
