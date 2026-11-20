'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../mortgage.js');

const BASE = { price: 50000000, down: 10000000, annualRate: 0, months: 100 };

test('financed amount is price minus down payment', () => {
  assert.equal(M.financedAmount(50000000, 10000000), 40000000);
  assert.equal(M.simulate(BASE).financed, 40000000);
  assert.throws(() => M.financedAmount(100, 200), RangeError);
  assert.throws(() => M.financedAmount(NaN, 0), RangeError);
  assert.throws(() => M.financedAmount(100, -1), RangeError);
});

test('zero rate: SAC and Price are equal and cost nothing extra', () => {
  const r = M.simulate(BASE);
  assert.equal(r.sac.first, 400000);
  assert.equal(r.sac.last, 400000);
  assert.equal(r.price.first, 400000);
  assert.equal(r.sac.total, 40000000);
  assert.equal(r.price.interest, 0);
});

test('SAC decreases while Price stays fixed', () => {
  const rows = M.schedule('sac', 20000000, 12, 120);
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i].installment <= rows[i - 1].installment + 1);
  const p = M.schedule('price', 20000000, 12, 120);
  p.slice(0, -1).forEach((x) => assert.ok(Math.abs(x.installment - p[0].installment) <= 1));
});

test('both systems amortize to zero and sum principal to financed', () => {
  ['sac', 'price'].forEach((s) => {
    const rows = M.schedule(s, 33333333, 9.5, 360);
    assert.equal(rows.length, 360);
    assert.equal(rows[359].balance, 0);
    assert.equal(rows.reduce((a, r) => a + r.amortization, 0), 33333333);
  });
});

test('Price installment matches the annuity formula', () => {
  const rate = M.monthlyRate(12);
  const expected = 10000000 * rate / (1 - Math.pow(1 + rate, -60));
  assert.ok(Math.abs(M.simulate({ price: 10000000, down: 0, annualRate: 12, months: 60 }).price.first - expected) <= 1);
});

test('SAC costs less in total, starts higher and ends lower than Price', () => {
  const r = M.simulate({ price: 60000000, down: 12000000, annualRate: 10.5, months: 360 });
  assert.ok(r.sac.first > r.price.first);
  assert.ok(r.sac.last < r.price.last);
  assert.ok(r.sac.total < r.price.total);
  assert.ok(r.sacSavings > 0);
  const rows = M.schedule('sac', r.financed, 10.5, 360);
  assert.equal(r.sac.total, rows.reduce((a, x) => a + x.installment, 0));
  assert.equal(r.sac.interest, rows.reduce((a, x) => a + x.interest, 0));
});

test('recommended income covers the first installment at 30% commitment', () => {
  const r = M.simulate({ price: 60000000, down: 12000000, annualRate: 10.5, months: 360 });
  [r.sac, r.price].forEach((s) => {
    assert.ok(s.recommendedIncome * 30 >= s.first * 100);
    assert.ok((s.recommendedIncome - 1) * 30 < s.first * 100);
  });
  assert.equal(M.simulate({ price: 3000, down: 0, annualRate: 0, months: 10 }).sac.recommendedIncome, 1000);
  assert.ok(r.sac.recommendedIncome > r.price.recommendedIncome);
});

test('fully paid in cash yields zero installments', () => {
  const r = M.simulate({ price: 100000, down: 100000, annualRate: 10, months: 12 });
  assert.equal(r.financed, 0);
  assert.equal(r.sac.total, 0);
  assert.equal(r.price.first, 0);
});

test('rejects invalid inputs', () => {
  assert.throws(() => M.schedule('sac', 100, 10, 0), RangeError);
  assert.throws(() => M.schedule('sac', 100, 10, 1.5), RangeError);
  assert.throws(() => M.schedule('sac', 100, -1, 12), RangeError);
  assert.throws(() => M.schedule('foo', 100, 10, 12), RangeError);
  assert.throws(() => M.simulate({ price: 100, down: 0, annualRate: Infinity, months: 12 }), RangeError);
});

test('golden values: R$200k at 12% a.a. over 120 months', () => {
  assert.ok(Math.abs(M.monthlyRate(12) - 0.009488793) < 1e-9);
  const r = M.simulate({ price: 20000000, down: 0, annualRate: 12, months: 120 });
  // SAC first = 200000/120 + 200000 * i; last = 200000/120 * (1 + i)
  assert.ok(Math.abs(r.sac.first - 356443) <= 1);
  assert.ok(Math.abs(r.sac.last - 168248) <= 1);
  assert.ok(Math.abs(r.price.first - 279894) <= 1);
  assert.equal(r.price.last, 279975); // pinned: last row absorbs rounding residue (+81 cents)
});

test('rounding residue is spread and balance ends at zero', () => {
  ['sac', 'price'].forEach((s) => {
    const rows = M.schedule(s, 100, 0, 3);
    assert.equal(rows[2].balance, 0);
    assert.equal(rows.reduce((a, r) => a + r.installment, 0), 100);
    const one = M.schedule(s, 12345, 8, 1);
    assert.equal(one.length, 1);
    assert.equal(one[0].balance, 0);
    assert.equal(one[0].amortization, 12345);
  });
  const tiny = M.schedule('sac', 10, 0, 360);
  assert.ok(Math.max(...tiny.map((r) => r.amortization)) <= 1);
  assert.equal(tiny.reduce((a, r) => a + r.amortization, 0), 10);
  M.schedule('price', 10, 5, 360).forEach((r) => assert.ok(r.amortization >= 0));
});

test('rejects out-of-range and malformed inputs up front', () => {
  const ok = { price: 100, down: 0, annualRate: 10, months: 12 };
  assert.throws(() => M.simulate({ ...ok, down: 200 }), RangeError);
  assert.throws(() => M.simulate({ ...ok, months: 0 }), /months/);
  assert.throws(() => M.simulate({ ...ok, months: M.MAX_MONTHS + 1 }), /months/);
  assert.throws(() => M.simulate({ ...ok, months: 1e12 }), /months/);
  assert.throws(() => M.simulate({ ...ok, annualRate: undefined }), /annualRate/);
  assert.throws(() => M.simulate({ ...ok, annualRate: -1 }), /annualRate/);
  assert.throws(() => M.simulate({ ...ok, annualRate: 1e308 }), /annualRate/);
  assert.throws(() => M.schedule('sac', -1, 10, 12), RangeError);
  assert.throws(() => M.schedule('sac', NaN, 10, 12), RangeError);
  assert.doesNotThrow(() => M.simulate({ ...ok, months: M.MAX_MONTHS }));
});

test('loads in a browser-like context and sets window.ImoveisMortgage', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const win = {};
  vm.runInNewContext(fs.readFileSync(require.resolve('../mortgage.js'), 'utf8'), { window: win });
  assert.equal(typeof win.ImoveisMortgage.simulate, 'function');
});

test('Price last-row residue stays bounded at long terms', () => {
  const r = M.simulate({ price: 60000000, down: 12000000, annualRate: 10.5, months: 360 });
  // pinned: the rounded fixed installment's error compounds over the term,
  // so the final row absorbs it (-1095 cents here)
  assert.equal(r.price.first, 422164);
  assert.equal(r.price.last, 421069);
});

test('near-zero positive rates do not break the Price installment', () => {
  const rows = M.schedule('price', 1000000, 1e-13, 120);
  assert.equal(rows[119].balance, 0);
  rows.forEach((x) => assert.ok(Number.isFinite(x.installment)));
  assert.ok(Math.abs(rows[0].installment - 1000000 / 120) <= 2);
});

test('boundaries: MAX_ANNUAL_RATE, types, fractional cents, missing opts', () => {
  const ok = { price: 100000, down: 0, annualRate: 10, months: 12 };
  assert.doesNotThrow(() => M.simulate({ ...ok, annualRate: M.MAX_ANNUAL_RATE }));
  assert.throws(() => M.simulate({ ...ok, annualRate: M.MAX_ANNUAL_RATE + 0.01 }), /annualRate/);
  assert.throws(() => M.simulate({ ...ok, months: '12' }), /months/);
  assert.throws(() => M.simulate({ ...ok, annualRate: '10' }), /annualRate/);
  assert.throws(() => M.simulate({ ...ok, months: 12.5 }), /months/);
  assert.throws(() => M.simulate({ ...ok, price: -1 }), RangeError);
  assert.throws(() => M.simulate(), RangeError);
  assert.throws(() => M.simulate({}), RangeError);
  assert.throws(() => M.financedAmount(Infinity, 0), RangeError);
  assert.throws(() => M.schedule('price', -5, 10, 12), RangeError);
  assert.equal(M.financedAmount(100.4, 0.4), 100);
  assert.equal(M.financedAmount(100.6, 0.4), 101);
  assert.equal(M.schedule('sac', 100.4, 0, 1)[0].installment, 100);
});
