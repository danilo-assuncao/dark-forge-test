'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../compare.js');

function fakeStorage() {
  const d = {};
  return {
    d,
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = String(v); },
    removeItem: (k) => { delete d[k]; },
  };
}

const A = { id: 'a', modality: 'venda', price: 100000000, areaM2: 100 };
const B = { id: 'b', modality: 'venda', price: 60000000, areaM2: 80 };
const R = { id: 'r', modality: 'aluguel', price: 300000, areaM2: 50 };
const R2 = { id: 'r2', modality: 'aluguel', price: 200000, areaM2: 50 };

test('pricePerM2 rounds and guards bad input', () => {
  assert.equal(C.pricePerM2(A), 1000000);
  assert.equal(C.pricePerM2({ price: 100, areaM2: 3 }), 33);
  assert.equal(C.pricePerM2({ price: 100, areaM2: 0 }), null);
  assert.equal(C.pricePerM2(null), null);
});

test('compareListings highlights lowest price per m2 within a modality', () => {
  const rows = C.compareListings([A, B, R]);
  assert.equal(rows.find((r) => r.id === 'b').bestValue, true);
  assert.equal(rows.find((r) => r.id === 'a').bestValue, false);
  assert.equal(rows.find((r) => r.id === 'r').bestValue, false); // alone in modality
  const rent = C.compareListings([R, R2]);
  assert.deepEqual(rent.map((r) => r.bestValue), [false, true]);
});

test('compareListings caps at 3 and flags ties', () => {
  const rows = C.compareListings([A, B, { ...B, id: 'b2' }, R2]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((r) => r.bestValue), [false, true, true]);
  assert.deepEqual(C.compareListings(null), []);
});

test('favorites toggle and persist in storage', () => {
  const st = fakeStorage();
  const s = C.createStore(st);
  assert.equal(s.toggleFavorite('a'), true);
  assert.equal(s.isFavorite('a'), true);
  assert.deepEqual(C.createStore(st).getFavorites(), ['a']);
  assert.equal(s.toggleFavorite('a'), false);
  assert.deepEqual(s.getFavorites(), []);
  assert.equal(s.toggleFavorite(''), false);
});

test('compare selection is limited to 3 and deduplicated', () => {
  const s = C.createStore(fakeStorage());
  assert.ok(s.addToCompare('a') && s.addToCompare('b') && s.addToCompare('r'));
  assert.equal(s.addToCompare('a'), true);
  assert.equal(s.addToCompare('r2'), false);
  assert.deepEqual(s.getCompareIds(), ['a', 'b', 'r']);
  s.removeFromCompare('a');
  assert.equal(s.addToCompare('r2'), true);
  s.clearCompare();
  assert.deepEqual(s.getCompareIds(), []);
});

test('store.compare resolves ids and skips unknown listings', () => {
  const s = C.createStore(fakeStorage());
  ['a', 'ghost', 'b'].forEach((id) => s.addToCompare(id));
  const rows = s.compare([A, B, R]);
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b']);
  assert.equal(rows[1].bestValue, true);
});

test('corrupt storage falls back to empty state', () => {
  const st = fakeStorage();
  st.d[C.FAVORITES_KEY] = '{not json';
  st.d[C.COMPARE_KEY] = '[1,"a","a",""]';
  const s = C.createStore(st);
  assert.deepEqual(s.getFavorites(), []);
  assert.deepEqual(s.getCompareIds(), ['a']);
});

test('storage that throws falls back to memory with accurate results', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const s = C.createStore(bad);
  assert.equal(s.toggleFavorite('a'), true);
  assert.deepEqual(s.getFavorites(), ['a']);
  assert.equal(s.toggleFavorite('a'), false);
  assert.deepEqual(s.getFavorites(), []);
  assert.equal(s.addToCompare('a'), true);
  assert.equal(s.addToCompare('b'), true);
  assert.deepEqual(s.getCompareIds(), ['a', 'b']);
  s.removeFromCompare('a');
  assert.deepEqual(s.compare([A, B]).map((r) => r.id), ['b']);
  s.clearCompare();
  assert.deepEqual(s.getCompareIds(), []);
});

test('setItem-only failure keeps state consistent', () => {
  const st = fakeStorage();
  st.setItem = () => { throw new Error('quota'); };
  const s = C.createStore(st);
  assert.equal(s.toggleFavorite('a'), true);
  assert.equal(s.isFavorite('a'), true);
});

test('pricePerM2 rejects invalid values', () => {
  [
    { price: 100, areaM2: -5 }, { price: 100, areaM2: NaN }, { price: 100, areaM2: Infinity },
    { price: 100, areaM2: '50' }, { price: 100 }, { areaM2: 50 }, { price: NaN, areaM2: 50 },
    { price: Infinity, areaM2: 50 }, { price: '100', areaM2: 50 }, undefined,
  ].forEach((l) => assert.equal(C.pricePerM2(l), null, JSON.stringify(l)));
});

test('compareListings ignores unusable rows, odd modalities and does not mutate', () => {
  const bad = { id: 'x', modality: 'venda', price: 1, areaM2: 0 };
  const rows = C.compareListings([A, bad, B]);
  const by = Object.fromEntries(rows.map((r) => [r.id, r]));
  assert.equal(by.x.bestValue, false);
  assert.equal(by.x.pricePerM2, null);
  assert.equal(by.b.bestValue, true);
  assert.equal(by.a.bestValue, false);
  assert.equal('bestValue' in A, false);
  const odd = C.compareListings([
    { id: 'c1', modality: 'constructor', price: 10, areaM2: 1 },
    { id: 'c2', modality: 'constructor', price: 20, areaM2: 1 },
    { id: 'n1', price: 10, areaM2: 1 },
    { id: 'n2', price: 20, areaM2: 1 },
  ]);
  assert.equal(odd.find((r) => r.id === 'c1').bestValue, true);
  assert.equal(odd.find((r) => r.id === 'c2').bestValue, false);
  assert.ok(odd.filter((r) => r.id[0] === 'n').every((r) => !r.bestValue));
  assert.deepEqual(C.compareListings(undefined), []);
  assert.deepEqual(C.compareListings('abc'), []);
});

test('listings beyond the cap never affect best value', () => {
  const cheap = { id: 'cheap', modality: 'venda', price: 1000, areaM2: 100 };
  const rows = C.compareListings([A, B, R, cheap]);
  assert.deepEqual(rows.map((r) => r.id), ['a', 'b', 'r']);
  assert.equal(rows.find((r) => r.id === 'b').bestValue, true);
});

test('ids like constructor/__proto__ are kept in storage', () => {
  const st = fakeStorage();
  st.d[C.FAVORITES_KEY] = JSON.stringify(['constructor', '__proto__', 'constructor']);
  assert.deepEqual(C.createStore(st).getFavorites(), ['constructor', '__proto__']);
});

test('stale compare ids are pruned and free their slot', () => {
  const st = fakeStorage();
  const s = C.createStore(st);
  ['a', 'g1', 'g2'].forEach((id) => s.addToCompare(id));
  assert.equal(s.addToCompare('b'), false);
  s.compare([A, B]);
  assert.deepEqual(s.getCompareIds(), ['a']);
  assert.equal(s.addToCompare('b'), true);
});

test('store API edge cases', () => {
  const s = C.createStore(fakeStorage());
  s.addToCompare('a');
  assert.equal(s.isInCompare('a'), true);
  assert.equal(s.isInCompare('z'), false);
  s.removeFromCompare('missing');
  assert.deepEqual(s.getCompareIds(), ['a']);
  [null, 123, ''].forEach((v) => assert.equal(s.addToCompare(v), false));
  const st = fakeStorage();
  st.d[C.COMPARE_KEY] = '{"a":1}';
  assert.deepEqual(C.createStore(st).getCompareIds(), []);
});

test('createStore() without storage works with the fallback', () => {
  const s = C.createStore();
  assert.equal(s.toggleFavorite('a'), true);
  assert.deepEqual(s.getFavorites(), ['a']);
});
