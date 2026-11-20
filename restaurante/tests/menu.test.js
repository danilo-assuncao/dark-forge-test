'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MENU, CATEGORIES, DIETARY_TAGS, ALLERGENS, filterMenu, getDishById } = require('../menu.js');

test('menu has at least 8 items covering all four categories', () => {
  assert.ok(MENU.length >= 8);
  assert.deepEqual([...CATEGORIES], ['entradas', 'principais', 'sobremesas', 'bebidas']);
  for (const c of CATEGORIES) assert.ok(MENU.some((d) => d.category === c), c);
});

test('every dish has the full contract with valid values and unique ids', () => {
  const ids = new Set();
  for (const d of MENU) {
    assert.equal(typeof d.id, 'string');
    assert.equal(typeof d.name, 'string');
    assert.ok(CATEGORIES.includes(d.category));
    assert.ok(Number.isFinite(d.priceBrl) && d.priceBrl > 0);
    assert.ok(Number.isInteger(d.prepMinutes) && d.prepMinutes > 0);
    assert.ok(d.dietaryTags.every((t) => DIETARY_TAGS.includes(t)));
    assert.ok(d.allergens.every((a) => ALLERGENS.includes(a)));
    assert.ok(!ids.has(d.id));
    ids.add(d.id);
  }
});

test('dietary tags are consistent with allergens', () => {
  for (const d of MENU) {
    if (d.dietaryTags.includes('sem-gluten')) assert.ok(!d.allergens.includes('gluten'), d.id);
    if (d.dietaryTags.includes('vegano')) {
      assert.ok(d.dietaryTags.includes('vegetariano'), d.id);
      assert.ok(!d.allergens.includes('lactose') && !d.allergens.includes('frutos-do-mar'), d.id);
    }
    if (d.dietaryTags.includes('vegetariano')) assert.ok(!d.allergens.includes('frutos-do-mar'), d.id);
  }
});

test('filterMenu with no arguments returns the whole menu', () => {
  assert.equal(filterMenu().length, MENU.length);
  assert.equal(filterMenu({}).length, MENU.length);
});

test('filterMenu filters by category', () => {
  const r = filterMenu({ category: 'bebidas' });
  assert.ok(r.length > 0);
  assert.ok(r.every((d) => d.category === 'bebidas'));
});

test('filterMenu filters by required dietary tag', () => {
  const r = filterMenu({ requiredTag: 'vegano' });
  assert.ok(r.length > 0);
  assert.ok(r.every((d) => d.dietaryTags.includes('vegano')));
});

test('filterMenu excludes allergens (any match removes the dish)', () => {
  const r = filterMenu({ excludeAllergens: ['lactose', 'gluten'] });
  assert.ok(r.length > 0);
  assert.ok(r.every((d) => !d.allergens.includes('lactose') && !d.allergens.includes('gluten')));
});

test('filterMenu combines all criteria', () => {
  const r = filterMenu({ category: 'sobremesas', requiredTag: 'vegetariano', excludeAllergens: ['lactose'] });
  assert.deepEqual(r.map((d) => d.id), ['sob-sorbet-manga']);
});

test('filterMenu can return an empty list', () => {
  assert.deepEqual(filterMenu({ category: 'bebidas', requiredTag: 'vegano', excludeAllergens: ['lactose'] }).length, 1);
  assert.deepEqual(filterMenu({ category: 'entradas', requiredTag: 'sem-gluten', excludeAllergens: ['castanhas'] }), []);
});

test('filterMenu rejects unknown inputs', () => {
  assert.throws(() => filterMenu({ category: 'lanches' }), RangeError);
  assert.throws(() => filterMenu({ requiredTag: 'keto' }), RangeError);
  assert.throws(() => filterMenu({ excludeAllergens: ['soja'] }), RangeError);
  assert.throws(() => filterMenu({ excludeAllergens: 'lactose' }), TypeError);
});

test('filterMenu returns copies that cannot corrupt the menu', () => {
  const [first] = filterMenu();
  first.allergens.push('lactose');
  first.name = 'x';
  assert.deepEqual(getDishById(first.id).allergens, MENU[0].allergens);
  assert.notEqual(getDishById(first.id).name, 'x');
});

test('getDishById finds dishes and returns null otherwise', () => {
  assert.equal(getDishById('pri-moqueca-camarao').name, 'Moqueca de camarão');
  assert.equal(getDishById('nope'), null);
  assert.equal(getDishById(undefined), null);
});
