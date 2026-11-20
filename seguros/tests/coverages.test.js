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
  c.listCoverages().forEach((x) => {
    assert.ok(Object.isFrozen(x));
    assert.ok(Object.isFrozen(x.excludes));
    assert.throws(() => x.excludes.push('x'), TypeError);
  });
});

test('sums selected coverages', () => {
  assert.equal(c.calculateCoveragesTotal([]), 0);
  assert.equal(c.calculateCoveragesTotal(), 0);
  assert.equal(c.calculateCoveragesTotal(['assistencia-ilimitada', 'vidros-completo']), 45000);
  assert.equal(c.calculateCoveragesTotal(['carro-reserva-15d', 'rcf-danos-terceiros']), 72000);
  assert.equal(c.calculateCoveragesTotal([' Carro-Reserva-7D ']), 19000);
});

test('rejects 7d and 15d rental car together, in any order', () => {
  const re = { name: 'RangeError', message: /mutually exclusive/ };
  assert.throws(() => c.calculateCoveragesTotal(['carro-reserva-7d', 'carro-reserva-15d']), re);
  assert.throws(() => c.calculateCoveragesTotal(['carro-reserva-15d', 'vidros-completo', 'carro-reserva-7d']), re);
});

test('rejects unknown, duplicate and non-array input with specific causes', () => {
  assert.throws(() => c.calculateCoveragesTotal(['nope']), { name: 'RangeError', message: /unknown coverage/ });
  assert.throws(() => c.calculateCoveragesTotal(['vidros-completo', 'vidros-completo']), { name: 'RangeError', message: /duplicate coverage/ });
  assert.throws(() => c.calculateCoveragesTotal('vidros-completo'), TypeError);
});

test('rejects duplicates that only differ after normalization', () => {
  assert.throws(() => c.calculateCoveragesTotal(['vidros-completo', ' VIDROS-COMPLETO ']), { name: 'RangeError', message: /duplicate coverage/ });
});

test('treats non-string elements as unknown coverages', () => {
  [null, undefined, 123].forEach((v) => {
    assert.throws(() => c.calculateCoveragesTotal([v]), { name: 'RangeError', message: /unknown coverage/ });
  });
});

test('null input totals zero and a full valid combination sums correctly', () => {
  assert.equal(c.calculateCoveragesTotal(null), 0);
  assert.equal(
    c.calculateCoveragesTotal(['carro-reserva-7d', 'assistencia-ilimitada', 'vidros-completo', 'rcf-danos-terceiros']),
    19000 + 24000 + 21000 + 38000
  );
});

test('getCoverageById normalizes ids and returns null when unknown', () => {
  const entry = c.getCoverageById('vidros-completo');
  assert.equal(entry.priceCents, 21000);
  assert.equal(c.getCoverageById('  VIDROS-COMPLETO '), entry);
  assert.equal(c.getCoverageById('nope'), null);
  assert.equal(c.getCoverageById(null), null);
  assert.equal(c.getCoverageById(undefined), null);
  assert.ok(Object.isFrozen(entry));
});
