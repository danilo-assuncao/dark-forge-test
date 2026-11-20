'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const c = require('../coverages.js');

test('lists the five coverages with annual prices in cents', () => {
  const prices = Object.fromEntries(c.listCoverages().map((x) => [x.id, x.priceCents]));
  assert.deepEqual(prices, {
    'assistencia-ilimitada': 24000,
    'carro-reserva-7d': 19000,
    'carro-reserva-15d': 34000,
    'vidros-completo': 21000,
    'rcf-danos-terceiros': 38000
  });
});

test('listCoverages returns a copy and frozen entries', () => {
  const list = c.listCoverages();
  list.pop();
  assert.equal(c.listCoverages().length, 5);
  assert.ok(Object.isFrozen(c.listCoverages()[0]));
});

test('sums selected coverages', () => {
  assert.equal(c.calculateCoveragesTotal([]), 0);
  assert.equal(c.calculateCoveragesTotal(), 0);
  assert.equal(c.calculateCoveragesTotal(['assistencia-ilimitada', 'vidros-completo']), 45000);
  assert.equal(c.calculateCoveragesTotal(['carro-reserva-15d', 'rcf-danos-terceiros']), 72000);
  assert.equal(c.calculateCoveragesTotal([' Carro-Reserva-7D ']), 19000);
});

test('rejects 7d and 15d rental car together, in any order', () => {
  assert.throws(() => c.calculateCoveragesTotal(['carro-reserva-7d', 'carro-reserva-15d']), RangeError);
  assert.throws(() => c.calculateCoveragesTotal(['carro-reserva-15d', 'vidros-completo', 'carro-reserva-7d']), RangeError);
});

test('rejects unknown, duplicate and non-array input', () => {
  assert.throws(() => c.calculateCoveragesTotal(['nope']), RangeError);
  assert.throws(() => c.calculateCoveragesTotal(['vidros-completo', 'vidros-completo']), RangeError);
  assert.throws(() => c.calculateCoveragesTotal('vidros-completo'), TypeError);
});
