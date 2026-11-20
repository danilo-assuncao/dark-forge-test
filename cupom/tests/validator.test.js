'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCoupon, normalizeCouponCode } = require('../validator.js');

test('normalizes coupon codes by trimming and uppercasing strings', () => {
  assert.equal(normalizeCouponCode(' \tSaVe10\n '), 'SAVE10');
  assert.equal(normalizeCouponCode('SAVE10'), 'SAVE10');
  assert.equal(normalizeCouponCode(' save 10 '), 'SAVE 10');
  assert.equal(normalizeCouponCode(''), '');
  assert.equal(normalizeCouponCode(' \t\n '), '');
});

test('normalization rejects non-string codes without coercion', () => {
  for (const raw of [undefined, null, 10, true, {}, []]) {
    assert.throws(() => normalizeCouponCode(raw), TypeError);
  }
});

test('normalization preserves Unicode case mapping and internal whitespace', () => {
  assert.equal(normalizeCouponCode(' promoção '), 'PROMOÇÃO');
  assert.equal(normalizeCouponCode(' ß '), 'SS');
  assert.equal(normalizeCouponCode(' ı '), 'I');
  assert.equal(normalizeCouponCode(' save  \t10\nnow '), 'SAVE  \t10\nNOW');
});

const coupon = { code: 'SAVE10', minOrderBrl: 100, percentOff: 10, maxUses: 3, usedCount: 0 };

test('callers normalize code comparisons separately without validation changing the code', () => {
  const input = Object.freeze({ ...coupon, code: ' \tSaVe10\n ' });
  const before = { ...input };
  assert.equal(validateCoupon(input, 100), true);
  assert.equal(normalizeCouponCode(input.code), normalizeCouponCode(coupon.code));
  assert.deepEqual(input, before);
});

test('checks orders above, at, and below the minimum', () => {
  assert.equal(validateCoupon(coupon, 150), true);
  assert.equal(validateCoupon(coupon, 100), true);
  assert.equal(validateCoupon(coupon, 99.99), false);
  assert.equal(validateCoupon({ ...coupon, minOrderBrl: 0 }, 0), true);
});

test('accepts inclusive percentage endpoints and fractional percentages', () => {
  for (const percentOff of [1, 90, 12.5]) {
    assert.equal(validateCoupon({ ...coupon, percentOff }, 100), true);
  }
});

test('rejects exhausted coupons, including zero allowed uses', () => {
  for (const [maxUses, usedCount] of [[3, 3], [3, 4], [0, 0]]) {
    assert.equal(validateCoupon({ ...coupon, maxUses, usedCount }, 100), false);
  }
});

test('accepts unused coupons, one remaining use, and safe integer boundaries', () => {
  for (const [maxUses, usedCount] of [[3, 0], [3, 2], [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1]]) {
    assert.equal(validateCoupon({ ...coupon, maxUses, usedCount }, 100), true);
  }
});

test('rejects malformed coupon objects', () => {
  for (const bad of [null, undefined, [], 'SAVE10', 1, true, () => {}]) {
    assert.throws(() => validateCoupon(bad, 100), TypeError);
  }
});

test('requires a nonblank string code', () => {
  for (const code of [undefined, null, 10, true, {}, []]) {
    assert.throws(() => validateCoupon({ ...coupon, code }, 100), TypeError);
  }
  for (const code of ['', ' ', '\t\n']) {
    assert.throws(() => validateCoupon({ ...coupon, code }, 100), RangeError);
  }
  assert.equal(validateCoupon({ ...coupon, code: ' SAVE10 ' }, 100), true);
});

for (const field of ['minOrderBrl', 'percentOff', 'maxUses', 'usedCount', 'orderTotalBrl']) {
  test(`${field} requires a finite number without coercion`, () => {
    for (const bad of [undefined, null, '10', true, false, NaN, Infinity, -Infinity, {}, []]) {
      const input = field === 'orderTotalBrl' ? coupon : { ...coupon, [field]: bad };
      const total = field === 'orderTotalBrl' ? bad : 100;
      assert.throws(() => validateCoupon(input, total), { name: 'TypeError', message: new RegExp(field) });
    }
  });
}

test('requires every coupon field and the order total', () => {
  for (const field of Object.keys(coupon)) {
    const input = { ...coupon };
    delete input[field];
    assert.throws(() => validateCoupon(input, 100), TypeError);
  }
  assert.throws(() => validateCoupon(coupon), TypeError);
});

test('rejects negative amounts and out-of-range percentages', () => {
  assert.throws(() => validateCoupon({ ...coupon, minOrderBrl: -1 }, 100), RangeError);
  assert.throws(() => validateCoupon(coupon, -1), RangeError);
  for (const percentOff of [-1, 0, 0.99, 90.01, 100]) {
    assert.throws(() => validateCoupon({ ...coupon, percentOff }, 100), RangeError);
  }
});

test('requires nonnegative safe integer usage counts', () => {
  for (const field of ['maxUses', 'usedCount']) {
    for (const bad of [-1, 0.5, Number.MAX_SAFE_INTEGER + 1]) {
      assert.throws(() => validateCoupon({ ...coupon, [field]: bad }, 100), {
        name: 'RangeError', message: new RegExp(field)
      });
    }
  }
});

test('validates malformed fields even when redemption is ineligible', () => {
  assert.throws(() => validateCoupon({ ...coupon, percentOff: 91 }, 0), RangeError);
  assert.throws(() => validateCoupon({ ...coupon, usedCount: '3' }, 0), TypeError);
  assert.throws(() => validateCoupon({ ...coupon, maxUses: 0 }, NaN), TypeError);
});

test('does not mutate frozen coupons or consume a use', () => {
  const input = Object.freeze({ ...coupon, usedCount: 2 });
  const before = { ...input };
  assert.equal(validateCoupon(input, 100), true);
  assert.equal(validateCoupon(input, 100), true);
  assert.deepEqual(input, before);
});
