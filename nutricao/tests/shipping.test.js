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
