'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const b = require('../billing.js');

test('mensal has no discount and no savings', () => {
  const s = b.simulate('start', 'mensal');
  assert.equal(s.netMonthlyCents, 8990);
  assert.equal(s.totalCents, 8990);
  assert.equal(s.savingsCents, 0);
});

test('semestral net monthly fee', () => {
  assert.equal(b.netMonthly('start', 'semestral'), 8091);
  assert.equal(b.simulate('start', 'semestral').savingsCents, 5394);
});

test('DANFIT10 stacks on semestral and anual only', () => {
  const s = b.simulate('start', 'semestral', ' danfit10 ');
  assert.equal(s.couponCode, 'DANFIT10');
  assert.equal(s.totalCents, 48546 - 4855);
  assert.equal(s.savingsCents, 53940 - s.totalCents);
  const m = b.simulate('start', 'mensal', 'DANFIT10');
  assert.equal(m.couponCode, null);
  assert.equal(m.couponError, 'cycle_not_eligible');
  assert.equal(m.totalCents, 8990);
  assert.equal(b.simulate('start', 'anual', 'NOPE').couponError, 'unknown');
});

test('annual savings accumulate over 12 months', () => {
  const a = b.annualSavings('plus');
  assert.equal(a.mensalTotalCents, 12990 * 12);
  assert.equal(a.anualTotalCents, 124704);
  assert.equal(a.savingsCents, 155880 - 124704);
  assert.equal(a.monthlySavingsCents, Math.round(a.savingsCents / 12));
  const c = b.annualSavings('plus', 'DANFIT10');
  assert.equal(c.couponCode, 'DANFIT10');
  assert.ok(c.savingsCents > a.savingsCents);
  assert.equal(c.savingsCents, 155880 - c.anualTotalCents);
});

test('unknown plan or cycle throws', () => {
  assert.throws(() => b.simulate('x', 'mensal'), RangeError);
  assert.throws(() => b.simulate('start', 'x'), RangeError);
  assert.throws(() => b.annualSavings('x'), RangeError);
});

test('protocol formatting and generation', () => {
  assert.equal(b.formatProtocol(7), 'FIT-0007');
  assert.equal(b.formatProtocol(9999), 'FIT-9999');
  assert.throws(() => b.formatProtocol(0), RangeError);
  assert.throws(() => b.formatProtocol(10000), RangeError);
  assert.throws(() => b.formatProtocol(1.5), RangeError);
  assert.throws(() => b.formatProtocol('12'), RangeError);
  assert.equal(b.generateProtocol(() => 0), 'FIT-0001');
  assert.equal(b.generateProtocol(() => 0.999999999), 'FIT-9999');
  for (let i = 0; i < 50; i++) assert.ok(b.isValidProtocol(b.generateProtocol()));
});

test('protocol validation', () => {
  assert.equal(b.normalizeProtocol(' fit-0042 '), 'FIT-0042');
  ['FIT-0000', 'FIT-123', 'FIT-12345', 'FIT0042', 'ABC-0042', '', null, undefined].forEach((v) =>
    assert.equal(b.isValidProtocol(v), false));
});
