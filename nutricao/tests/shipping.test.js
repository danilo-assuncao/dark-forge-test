'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const s = require('../shipping.js');

test('normalizes CEP', () => {
  assert.equal(s.normalizeCep('01310-100'), '01310100');
  assert.equal(s.normalizeCep(' 01.310-100 '), '01310100');
  assert.equal(s.normalizeCep('123'), null);
  assert.equal(s.normalizeCep(null), null);
  assert.equal(s.formatCep('01310100'), '01310-100');
});

test('quotes standard vs express by range', () => {
  const std = s.quote('01310-100', 'standard', 0);
  assert.equal(std.priceCents, 1490);
  const exp = s.quote('01310-100', 'express', 0);
  assert.equal(exp.priceCents, 2990);
  assert.ok(exp.days < std.days);
  assert.equal(s.quote('80010-000', 'standard', 0).region, 'Sul');
  assert.equal(s.quote('40010-000', 'express', 0).priceCents, 4990);
});

test('express unavailable, invalid CEP and free standard shipping', () => {
  assert.equal(s.quote('70040-010', 'express', 0).error, 'express-unavailable');
  assert.equal(s.quote('abc', 'standard', 0).error, 'invalid-cep');
  assert.equal(s.quote('01310-100', 'standard', 30000).priceCents, 0);
  assert.equal(s.quote('01310-100', 'express', 30000).priceCents, 2990);
  assert.equal(s.quoteAll('70040-010', 0).length, 1);
  assert.equal(s.quoteAll('01310-100', 0).length, 2);
});

test('lists simulated teleconsult slots on weekdays', () => {
  const slots = s.teleconsultSlots(new Date(2026, 10, 19), 3);
  assert.equal(slots.length, 15);
  assert.equal(slots[0].date, '2026-11-20');
  assert.equal(slots[0].time, '09:00');
  assert.ok(slots[0].nutritionist);
  assert.ok(slots.every((x) => !['2026-11-21', '2026-11-22'].includes(x.date)));
  assert.equal(slots[5].date, '2026-11-23');
});

test('generates NUTRI-XXXX protocols', () => {
  assert.equal(s.generateProtocol(() => 0), 'NUTRI-0000');
  assert.equal(s.generateProtocol(() => 0.99999), 'NUTRI-9999');
  assert.equal(s.generateProtocol(() => 0.0042), 'NUTRI-0042');
  for (let i = 0; i < 50; i++) { assert.ok(s.isProtocol(s.generateProtocol())); }
  assert.equal(s.isProtocol('NUTRI-12'), false);
});

test('free-standard threshold boundary and subtotal coercion', () => {
  assert.equal(s.quote('01310-100', 'standard', 29899).priceCents, 1490);
  assert.equal(s.quote('01310-100', 'standard', 29900).priceCents, 0);
  assert.equal(s.quote('01310-100', 'standard').priceCents, 1490);
  assert.equal(s.quote('01310-100', 'standard', NaN).priceCents, 1490);
  assert.equal(s.quote('01310-100', 'standard', '29900').priceCents, 0);
});

test('rejects unknown shipping methods', () => {
  assert.equal(s.quote('01310-100', 'sedex', 0).error, 'invalid-method');
  assert.equal(s.quote('01310-100', 'Express', 0).error, 'invalid-method');
  assert.equal(s.quote('01310-100').method, 'standard');
});

test('region edge digits', () => {
  const regions = '0123456789'.split('').map((d) => s.quote(d + '0000-000', 'standard', 0).region);
  assert.deepEqual(regions, ['Sudeste', 'Sudeste', 'Sudeste', 'Sudeste', 'Nordeste', 'Nordeste',
    'Centro-Oeste/Norte', 'Centro-Oeste/Norte', 'Sul', 'Sul']);
});

test('teleconsult slots validate inputs and do not truncate', () => {
  const d = new Date(2026, 10, 19);
  assert.equal(s.teleconsultSlots(d, 60).length, 300);
  assert.equal(s.teleconsultSlots(d, 0).length, 0);
  assert.equal(s.teleconsultSlots(d, -3).length, 0);
  assert.equal(s.teleconsultSlots(d, NaN).length, 0);
  const bad = s.teleconsultSlots(new Date(NaN), 1);
  assert.equal(bad.length, 5);
  assert.ok(bad.every((x) => !x.date.includes('NaN')));
  assert.ok(s.teleconsultSlots('x', 1).every((x) => !x.date.includes('NaN')));
});

test('protocol stays well-formed for out-of-range rng', () => {
  for (const v of [NaN, -1, 1, 5, Infinity, -Infinity]) {
    assert.ok(s.isProtocol(s.generateProtocol(() => v)), String(v));
  }
  assert.equal(s.generateProtocol(() => NaN), 'NUTRI-0000');
  assert.equal(s.generateProtocol(() => 1), 'NUTRI-9999');
});
