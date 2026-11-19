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
  assert.equal(p.getPlan('__proto__'), null);
  assert.equal(p.getPlan('constructor'), null);
  assert.equal(p.getCycle('__proto__'), null);
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
  assert.equal(a.perMonthCents, 14393); // 172714 / 12 = 14392.83
});

test('DANFIT10 is rejected on Mensal and for unknown codes', () => {
  const m = p.price('start', 'mensal', 'DANFIT10');
  assert.equal(m.totalCents, 8990);
  assert.equal(m.couponDiscountCents, 0);
  assert.equal(m.couponError, 'cycle_not_eligible');
  assert.equal(m.couponCode, null);
  const u = p.price('start', 'anual', 'OUTRO');
  assert.equal(u.couponError, 'unknown');
  assert.equal(u.couponCode, null);
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

test('table of all 9 plan/cycle combinations (no coupon / DANFIT10)', () => {
  // [plan, cycle, total, perMonth, totalWithCoupon, couponDiscount, perMonthWithCoupon]
  const rows = [
    ['start', 'mensal', 8990, 8990, 8990, 0, 8990],
    ['start', 'semestral', 48546, 8091, 43691, 4855, 7282],
    ['start', 'anual', 86304, 7192, 77674, 8630, 6473],
    ['plus', 'mensal', 12990, 12990, 12990, 0, 12990],
    ['plus', 'semestral', 70146, 11691, 63131, 7015, 10522],
    ['plus', 'anual', 124704, 10392, 112234, 12470, 9353],
    ['black_vip', 'mensal', 19990, 19990, 19990, 0, 19990],
    ['black_vip', 'semestral', 107946, 17991, 97151, 10795, 16192],
    ['black_vip', 'anual', 191904, 15992, 172714, 19190, 14393]
  ];
  rows.forEach(([plan, cycle, total, per, cTotal, cDisc, cPer]) => {
    const a = p.price(plan, cycle);
    assert.equal(a.totalCents, total, plan + '/' + cycle);
    assert.equal(a.perMonthCents, per, plan + '/' + cycle);
    const b = p.price(plan, cycle, 'DANFIT10');
    assert.equal(b.totalCents, cTotal, plan + '/' + cycle);
    assert.equal(b.couponDiscountCents, cDisc, plan + '/' + cycle);
    assert.equal(b.perMonthCents, cPer, plan + '/' + cycle);
  });
});

test('cycle discount percentages are fixed', () => {
  assert.deepEqual(p.listCycles().map((c) => c.discountPct), [0, 10, 20]);
  assert.equal(p.COUPON.discountPct, 10);
  assert.deepEqual(p.COUPON.validCycles, ['semestral', 'anual']);
});

test('percentOf rounds half up on exact .5 boundaries', () => {
  assert.equal(p.percentOf(5, 10), 1); // 0.5 -> 1
  assert.equal(p.percentOf(15, 10), 2); // 1.5 -> 2
  assert.equal(p.percentOf(25, 10), 3); // 2.5 -> 3 (half-even would give 2)
  assert.equal(p.percentOf(14, 10), 1); // 1.4 -> 1
  assert.equal(p.percentOf(16, 10), 2); // 1.6 -> 2
  assert.equal(p.percentOf(0, 10), 0);
});

test('discounts never exceed the amount they apply to', () => {
  p.listPlans().forEach((pl) => p.listCycles().forEach((c) => {
    const r = p.price(pl.id, c.id, 'DANFIT10');
    assert.ok(r.cycleDiscountCents >= 0 && r.couponDiscountCents >= 0);
    assert.equal(r.subtotalCents, r.listCents - r.cycleDiscountCents);
    assert.equal(r.totalCents, r.subtotalCents - r.couponDiscountCents);
    assert.ok(r.couponDiscountCents <= r.subtotalCents);
    assert.ok(r.totalCents > 0);
  }));
});

test('validateCoupon covers every reason and check ordering', () => {
  assert.equal(p.validateCoupon('DANFIT10', 'mensal').reason, 'cycle_not_eligible');
  assert.equal(p.validateCoupon('FOO', 'anual').reason, 'unknown');
  assert.equal(p.validateCoupon('FOO', 'bogus').reason, 'unknown'); // code checked before cycle
  [null, undefined, '   '].forEach((v) => assert.equal(p.validateCoupon(v, 'anual').reason, 'empty'));
  assert.equal(p.validateCoupon('danfit10', 'semestral').valid, true);
  assert.equal(p.validateCoupon('DANFIT10', 'Mensal').valid, false);
});

test('blank or missing coupon is not an error in price', () => {
  assert.equal(p.price('start', 'anual', '   ').couponError, null);
  assert.equal(p.price('start', 'anual', null).couponError, null);
  assert.equal(p.price('start', 'anual').couponError, null);
  assert.equal(p.price('start', 'anual', '   ').totalCents, 86304);
});

test('nested benefits are frozen and a single coupon is applied once', () => {
  assert.ok(Object.isFrozen(p.PLANS.start.benefits));
  assert.ok(Object.isFrozen(p.COUPON.validCycles));
  assert.equal(p.price('plus', 'anual', 'DANFIT10 DANFIT10').couponError, 'unknown');
});

test('exposes window.DanFitPlans in a browser-like context', () => {
  const vm = require('node:vm');
  const fs = require('node:fs');
  const src = fs.readFileSync(require.resolve('../plans.js'), 'utf8');
  // Unmodified source; the context has `window` but no `module`/`require`.
  const ctx = { window: {} };
  vm.runInNewContext(src, ctx);
  assert.equal(typeof ctx.module, 'undefined');
  assert.equal(typeof ctx.window.DanFitPlans.price, 'function');
  assert.equal(ctx.window.DanFitPlans.price('start', 'mensal').totalCents, 8990);
});

test('non-string coupons are stringified and rejected; bad plan wins over coupon', () => {
  [10, 0, {}].forEach((v) => assert.equal(p.price('start', 'anual', v).couponError, 'unknown'));
  assert.equal(p.price('start', 'anual', 10).couponCode, null);
  assert.throws(() => p.price('gold', 'anual', 'DANFIT10'), RangeError);
});
