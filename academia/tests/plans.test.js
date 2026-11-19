'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const p = require('../plans.js');

test('defines the three plans with benefits', () => {
  assert.deepEqual(p.listPlans().map((x) => x.name), ['Start', 'Plus', 'Black Vip']);
  p.listPlans().forEach((x) => {
    assert.ok(Number.isInteger(x.monthlyCents) && x.monthlyCents > 0);
    assert.ok(x.benefits.length >= 3);
  });
  const prices = p.listPlans().map((x) => x.monthlyCents);
  assert.deepEqual(prices, prices.slice().sort((a, b) => a - b));
});

test('defines the three cycles', () => {
  assert.deepEqual(p.listCycles().map((c) => [c.label, c.months]), [['Mensal', 1], ['Semestral', 6], ['Anual', 12]]);
});

test('looks up plans and cycles leniently', () => {
  assert.equal(p.getPlan('Black Vip').id, 'black_vip');
  assert.equal(p.getPlan('black-vip').id, 'black_vip');
  assert.equal(p.getPlan('toString'), null);
  assert.equal(p.getCycle(' ANUAL ').id, 'anual');
  assert.equal(p.getCycle('x'), null);
  assert.equal(p.getPlan(null), null);
});

test('prices cycles with discounts and no coupon', () => {
  const m = p.price('start', 'mensal');
  assert.equal(m.totalCents, 8990);
  assert.equal(m.cycleDiscountCents, 0);
  const s = p.price('start', 'semestral');
  assert.equal(s.listCents, 53940);
  assert.equal(s.cycleDiscountCents, 5394);
  assert.equal(s.totalCents, 48546);
  const a = p.price('plus', 'anual');
  assert.equal(a.listCents, 155880);
  assert.equal(a.totalCents, 124704);
  assert.equal(a.couponCode, null);
  assert.equal(a.couponError, null);
});

test('DANFIT10 takes 10% off semestral and anual (case/space insensitive)', () => {
  const s = p.price('plus', 'semestral', ' danfit10 ');
  assert.equal(s.subtotalCents, 70146);
  assert.equal(s.couponCode, 'DANFIT10');
  assert.equal(s.couponDiscountCents, 7015);
  assert.equal(s.totalCents, 63131);
  const a = p.price('black_vip', 'anual', 'DANFIT10');
  assert.equal(a.subtotalCents, 191904);
  assert.equal(a.couponDiscountCents, 19190);
  assert.equal(a.totalCents, 172714);
  assert.equal(a.perMonthCents, Math.round(172714 / 12));
});

test('DANFIT10 is rejected on Mensal and for unknown codes', () => {
  const m = p.price('start', 'mensal', 'DANFIT10');
  assert.equal(m.totalCents, 8990);
  assert.equal(m.couponDiscountCents, 0);
  assert.equal(m.couponError, 'cycle_not_eligible');
  assert.equal(p.price('start', 'anual', 'OUTRO').couponError, 'unknown');
  assert.equal(p.price('start', 'anual', '').couponError, null);
});

test('validateCoupon reasons', () => {
  assert.deepEqual(p.validateCoupon('DANFIT10', 'anual'), { valid: true });
  assert.equal(p.validateCoupon('', 'anual').reason, 'empty');
  assert.equal(p.validateCoupon('DANFIT10', 'foo').reason, 'invalid_cycle');
});

test('price throws on unknown plan or cycle', () => {
  assert.throws(() => p.price('gold', 'mensal'), RangeError);
  assert.throws(() => p.price('start', 'trimestral'), RangeError);
});

test('exported tables are frozen', () => {
  assert.throws(() => { 'use strict'; p.PLANS.start.monthlyCents = 1; }, TypeError);
  assert.throws(() => { 'use strict'; p.COUPON.discountPct = 90; }, TypeError);
});
