'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { EXTRAS, DONENESS_OPTIONS, MAX_EXTRAS, customizeDish } = require('../customizer.js');

const ID = 'pri-risoto-cogumelos'; // R$ 58,00

test('exports extras prices and doneness options', () => {
  assert.deepEqual({ ...EXTRAS }, {
    'queijo-extra': 6, 'bacon-artesanal': 8, 'molho-trufado': 10, 'dobro-proteina': 18,
  });
  assert.deepEqual([...DONENESS_OPTIONS], ['mal-passado', 'ao-ponto', 'bem-passado']);
  assert.equal(MAX_EXTRAS, 3);
});

test('applies defaults', () => {
  const r = customizeDish({ dishId: ID });
  assert.equal(r.qty, 1);
  assert.equal(r.doneness, 'ao-ponto');
  assert.deepEqual(r.extras, []);
  assert.equal(r.notes, '');
  assert.equal(r.unitPriceBrl, 58);
  assert.equal(r.totalBrl, 58);
});

test('computes totals with extras and quantity', () => {
  const r = customizeDish({ dishId: ID, qty: 2, extras: ['queijo-extra', 'dobro-proteina', 'bacon-artesanal'], doneness: 'bem-passado' });
  assert.equal(r.unitPriceBrl, 90);
  assert.equal(r.totalBrl, 180);
  assert.equal(r.doneness, 'bem-passado');
});

test('avoids floating point drift', () => {
  const r = customizeDish({ dishId: 'ent-bruschetta', qty: 3, extras: ['molho-trufado'] });
  assert.equal(r.unitPriceBrl, 34.9);
  assert.equal(r.totalBrl, 104.7);
});

test('rejects unknown dish, doneness and extras', () => {
  assert.throws(() => customizeDish({ dishId: 'nope' }), RangeError);
  assert.throws(() => customizeDish(), RangeError);
  assert.throws(() => customizeDish({ dishId: ID, doneness: 'cru' }), RangeError);
  assert.throws(() => customizeDish({ dishId: ID, extras: ['ouro'] }), RangeError);
  assert.throws(() => customizeDish({ dishId: ID, extras: 'queijo-extra' }), TypeError);
});

test('limits extras to 3 per item', () => {
  const four = ['queijo-extra', 'bacon-artesanal', 'molho-trufado', 'dobro-proteina'];
  assert.throws(() => customizeDish({ dishId: ID, extras: four }), RangeError);
  assert.doesNotThrow(() => customizeDish({ dishId: ID, extras: four.slice(0, 3) }));
});

test('validates qty within 1..20', () => {
  for (const q of [0, 21, -1, 1.5, '2', NaN]) {
    assert.throws(() => customizeDish({ dishId: ID, qty: q }), RangeError, String(q));
  }
  assert.equal(customizeDish({ dishId: ID, qty: 20 }).qty, 20);
});

test('validates notes length <= 120', () => {
  assert.equal(customizeDish({ dishId: ID, notes: 'a'.repeat(120) }).notes.length, 120);
  assert.throws(() => customizeDish({ dishId: ID, notes: 'a'.repeat(121) }), RangeError);
  assert.throws(() => customizeDish({ dishId: ID, notes: 5 }), TypeError);
});

test('does not alias the input extras array', () => {
  const extras = ['queijo-extra'];
  const r = customizeDish({ dishId: ID, extras });
  extras.push('x');
  assert.deepEqual(r.extras, ['queijo-extra']);
});

test('rejects sparse holes and non-string extras', () => {
  // eslint-disable-next-line no-sparse-arrays
  assert.throws(() => customizeDish({ dishId: ID, extras: [,] }), RangeError);
  assert.throws(() => customizeDish({ dishId: ID, extras: [['queijo-extra']] }), RangeError);
  assert.throws(() => customizeDish({ dishId: ID, extras: [{ toString: () => 'queijo-extra' }] }), RangeError);
});

test('rejects duplicate extras', () => {
  assert.throws(() => customizeDish({ dishId: ID, extras: ['queijo-extra', 'queijo-extra'] }), RangeError);
});

test('accepts boundaries and prices exactly 3 extras', () => {
  assert.equal(customizeDish({ dishId: ID, qty: 1 }).qty, 1);
  const r = customizeDish({ dishId: ID, extras: ['queijo-extra', 'bacon-artesanal', 'molho-trufado'] });
  assert.equal(r.unitPriceBrl, 82);
});

test('rejects null inputs (null does not trigger defaults)', () => {
  assert.throws(() => customizeDish({ dishId: ID, qty: null }), RangeError);
  assert.throws(() => customizeDish({ dishId: ID, doneness: null }), RangeError);
  assert.throws(() => customizeDish({ dishId: ID, extras: null }), TypeError);
  assert.throws(() => customizeDish({ dishId: ID, notes: null }), TypeError);
});
