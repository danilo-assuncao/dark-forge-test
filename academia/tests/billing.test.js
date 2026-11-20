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
  assert.equal(b.generateProtocol(() => 0.5), 'FIT-5000');
  assert.equal(b.generateProtocol(() => 0.0001), 'FIT-0001');
  assert.equal(b.generateProtocol(() => 0.0002), 'FIT-0002');
  assert.ok(b.isValidProtocol(b.generateProtocol()));
});

test('out-of-contract rng and non-finite numbers throw', () => {
  [1, -0.5, NaN, Infinity, 2].forEach((v) =>
    assert.throws(() => b.generateProtocol(() => v), RangeError));
  [NaN, Infinity, -1, null, undefined].forEach((v) =>
    assert.throws(() => b.formatProtocol(v), RangeError));
});

test('protocol validation', () => {
  assert.equal(b.normalizeProtocol(' fit-0042 '), 'FIT-0042');
  assert.equal(b.normalizeProtocol('FIT-0001'), 'FIT-0001');
  assert.equal(b.normalizeProtocol('FIT-9999'), 'FIT-9999');
  assert.equal(b.normalizeProtocol('FIT-0000'), null);
  assert.equal(b.normalizeProtocol(42), null);
  assert.equal(b.normalizeProtocol({}), null);
  assert.equal(b.normalizeProtocol('FIT- 0042'), null);
  ['FIT-0000', 'FIT-123', 'FIT-12345', 'FIT0042', 'ABC-0042', '', null, undefined].forEach((v) =>
    assert.equal(b.isValidProtocol(v), false));
});

test('black_vip anual with literal expected values', () => {
  const s = b.simulate('Black Vip', ' ANUAL ');
  assert.equal(s.plan, 'black_vip');
  assert.equal(s.cycle, 'anual');
  assert.equal(s.listCents, 239880);
  assert.equal(s.cycleDiscountCents, 47976);
  assert.equal(s.couponDiscountCents, 0);
  assert.equal(s.totalCents, 191904);
  assert.equal(s.netMonthlyCents, 15992);
  assert.equal(s.savingsCents, 47976);
  const c = b.simulate('black-vip', 'anual', 'DANFIT10');
  assert.equal(c.couponDiscountCents, 19190);
  assert.equal(c.totalCents, 172714);
  assert.equal(c.netMonthlyCents, 14393);
  assert.equal(c.savingsCents, 67166);
});

test('netMonthly with coupon and annualSavings literals', () => {
  assert.equal(b.netMonthly('start', 'anual', 'DANFIT10'), 6473);
  assert.equal(b.netMonthly('start', 'mensal', 'DANFIT10'), 8990);
  const a = b.annualSavings('plus');
  assert.equal(a.savingsCents, 31176);
  assert.equal(a.monthlySavingsCents, 2598);
  const bad = b.annualSavings('plus', 'BAD');
  assert.equal(bad.couponCode, null);
  assert.equal(bad.savingsCents, 31176);
});

test('browser context: exports window.DanFitBilling and uses window.DanFitPlans', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const load = (file, ctx) => vm.runInNewContext(fs.readFileSync(require.resolve(file), 'utf8'), ctx);
  const ctx = { window: {} };
  load('../plans.js', ctx);
  load('../billing.js', ctx);
  assert.equal(ctx.window.DanFitBilling.simulate('start', 'mensal').totalCents, 8990);
});

test('browser context without plans.js throws a clear error from simulate', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(require.resolve('../billing.js'), 'utf8'), ctx);
  assert.throws(() => ctx.window.DanFitBilling.simulate('start', 'mensal'),
    /billing\.js requires plans\.js to be loaded first/);
});

test('generateProtocol falls back to Math.random for a non-function rng', () => {
  const original = Math.random;
  Math.random = () => 0.5;
  try {
    assert.equal(b.generateProtocol(), 'FIT-5000');
    assert.equal(b.generateProtocol(null), 'FIT-5000');
    assert.equal(b.generateProtocol(42), 'FIT-5000');
  } finally {
    Math.random = original;
  }
});
