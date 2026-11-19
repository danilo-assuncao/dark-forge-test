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
  assert.equal(r.sacSavings, r.price.total - r.sac.total);
  assert.equal(r.sac.interest, r.sac.total - r.financed);
});

test('recommended income covers the first installment at 30% commitment', () => {
  const r = M.simulate({ price: 60000000, down: 12000000, annualRate: 10.5, months: 360 });
  [r.sac, r.price].forEach((s) => {
    assert.ok(s.recommendedIncome * M.INCOME_COMMITMENT >= s.first);
    assert.ok((s.recommendedIncome - 1) * M.INCOME_COMMITMENT < s.first);
  });
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
