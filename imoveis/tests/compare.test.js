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

test('storage that throws does not crash', () => {
  const bad = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); } };
  const s = C.createStore(bad);
  assert.doesNotThrow(() => s.toggleFavorite('a'));
  assert.deepEqual(s.getCompareIds(), []);
});
