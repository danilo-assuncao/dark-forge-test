'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { simulateFixedIncome } = require('../simulator.js');

const base = { initialBrl: 1000, monthlyBrl: 0, annualRatePct: 12 };

test('LCI is tax free', () => {
  const r = simulateFixedIncome({ ...base, months: 12, product: 'LCI' });
  assert.equal(r.totalInvestedBrl, 1000);
  assert.equal(r.grossBrl, 1120);
  assert.equal(r.taxBrl, 0);
  assert.equal(r.netBrl, 1120);
});

test('CDB applies regressive IR brackets with independent expected values', () => {
  const cases = [
    [6, { grossBrl: 1058.3, taxBrl: 13.12, netBrl: 1045.18 }],
    [7, { grossBrl: 1068.34, taxBrl: 13.67, netBrl: 1054.67 }],
    [13, { grossBrl: 1130.63, taxBrl: 22.86, netBrl: 1107.77 }],
    [24, { grossBrl: 1254.4, taxBrl: 44.52, netBrl: 1209.88 }],
    [25, { grossBrl: 1266.3, taxBrl: 39.95, netBrl: 1226.35 }],
  ];
  for (const [months, expected] of cases) {
    const r = simulateFixedIncome({ ...base, months, product: 'CDB' });
    assert.deepEqual(r, { totalInvestedBrl: 1000, ...expected }, `months=${months}`);
  }
});

test('reported figures reconcile exactly in integer cents', () => {
  const sets = [
    { initialBrl: 1234.56, monthlyBrl: 77.77, annualRatePct: 13.37 },
    { initialBrl: 1e12, monthlyBrl: 0, annualRatePct: 5.55 },
    { initialBrl: 0.03, monthlyBrl: 0.07, annualRatePct: 999.99 },
  ];
  for (const params of sets) {
    for (let months = 1; months <= 36; months += 1) {
      for (const product of ['CDB', 'LCI']) {
        let r;
        try {
          r = simulateFixedIncome({ ...params, months, product });
        } catch (e) {
          assert.ok(e instanceof RangeError);
          continue;
        }
        const cents = (v) => Math.round(v * 100);
        assert.equal(cents(r.netBrl), cents(r.grossBrl) - cents(r.taxBrl));
      }
    }
  }
});

test('CDB 12 months at 12% a year', () => {
  const r = simulateFixedIncome({ ...base, months: 12, product: 'CDB' });
  assert.deepEqual(r, { totalInvestedBrl: 1000, grossBrl: 1120, taxBrl: 24, netBrl: 1096 });
});

test('includes monthly deposits in total invested', () => {
  const r = simulateFixedIncome({ initialBrl: 0, monthlyBrl: 100, months: 12, annualRatePct: 0, product: 'CDB' });
  assert.deepEqual(r, { totalInvestedBrl: 1200, grossBrl: 1200, taxBrl: 0, netBrl: 1200 });
});

test('uses the geometric monthly equivalent rate', () => {
  const r = simulateFixedIncome({ initialBrl: 100, monthlyBrl: 0, months: 1, annualRatePct: 10, product: 'LCI' });
  assert.equal(r.grossBrl, 100.80);
});

test('rejects invalid input', () => {
  const ok = { ...base, months: 12, product: 'CDB' };
  assert.throws(() => simulateFixedIncome({ ...ok, product: 'LCA' }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, months: 0 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, months: 1.5 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, initialBrl: -1 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, annualRatePct: NaN }), TypeError);
  assert.throws(() => simulateFixedIncome({ ...ok, monthlyBrl: '1' }), TypeError);
});

test('monthly deposits earn interest from the following month', () => {
  const r = simulateFixedIncome({ initialBrl: 0, monthlyBrl: 100, months: 2, annualRatePct: 12.6825, product: 'LCI' });
  assert.deepEqual(r, { totalInvestedBrl: 200, grossBrl: 201, taxBrl: 0, netBrl: 201 });
});

test('CDB taxes gross minus total invested with initial and monthly deposits', () => {
  const r = simulateFixedIncome({ initialBrl: 1000, monthlyBrl: 100, months: 12, annualRatePct: 12, product: 'CDB' });
  assert.deepEqual(r, { totalInvestedBrl: 2200, grossBrl: 2384.65, taxBrl: 36.93, netBrl: 2347.72 });
});

test('CDB with zero yield has zero tax, and zero input is all zeros', () => {
  assert.deepEqual(
    simulateFixedIncome({ initialBrl: 1000, monthlyBrl: 0, months: 3, annualRatePct: 0, product: 'CDB' }),
    { totalInvestedBrl: 1000, grossBrl: 1000, taxBrl: 0, netBrl: 1000 },
  );
  assert.deepEqual(
    simulateFixedIncome({ initialBrl: 0, monthlyBrl: 0, months: 3, annualRatePct: 10, product: 'CDB' }),
    { totalInvestedBrl: 0, grossBrl: 0, taxBrl: 0, netBrl: 0 },
  );
});

test('rounds half cents up', () => {
  const r = simulateFixedIncome({ initialBrl: 0.005, monthlyBrl: 0, months: 1, annualRatePct: 0, product: 'LCI' });
  assert.equal(r.grossBrl, 0.01);
});

test('handles the largest allowed amount', () => {
  const r = simulateFixedIncome({ initialBrl: 1e12, monthlyBrl: 0, months: 1, annualRatePct: 0, product: 'CDB' });
  assert.deepEqual(r, { totalInvestedBrl: 1e12, grossBrl: 1e12, taxBrl: 0, netBrl: 1e12 });
});

test('rejects Infinity, missing args, negatives, NaN months and out-of-range bounds', () => {
  const ok = { ...base, months: 12, product: 'CDB' };
  assert.throws(() => simulateFixedIncome(), TypeError);
  assert.throws(() => simulateFixedIncome({}), TypeError);
  assert.throws(() => simulateFixedIncome({ ...ok, initialBrl: Infinity }), TypeError);
  assert.throws(() => simulateFixedIncome({ ...ok, monthlyBrl: -1 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, annualRatePct: -1 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, months: NaN }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, months: 1201 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, months: 1e15 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, initialBrl: 1e21 }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, annualRatePct: 1e6 }), RangeError);
  assert.doesNotThrow(() => simulateFixedIncome({ ...ok, months: 1200 }));
});

test('rejects results too large to represent in cents instead of returning NaN or 0', () => {
  for (const product of ['CDB', 'LCI']) {
    assert.throws(
      () => simulateFixedIncome({ initialBrl: 1e12, monthlyBrl: 0, months: 1200, annualRatePct: 1000, product }),
      RangeError,
    );
    assert.throws(
      () => simulateFixedIncome({ initialBrl: 1e12, monthlyBrl: 1e12, months: 1200, annualRatePct: 1000, product }),
      RangeError,
    );
  }
  assert.throws(
    () => simulateFixedIncome({ initialBrl: 1e12, monthlyBrl: 1e12, months: 1200, annualRatePct: 0, product: 'LCI' }),
    RangeError,
  );
});

test('inclusive input bounds are accepted and just-over values rejected', () => {
  const ok = { initialBrl: 1, monthlyBrl: 1, months: 1, annualRatePct: 10, product: 'CDB' };
  assert.doesNotThrow(() => simulateFixedIncome({ ...ok, annualRatePct: 1000 }));
  assert.throws(() => simulateFixedIncome({ ...ok, annualRatePct: 1000.01 }), RangeError);
  assert.doesNotThrow(() => simulateFixedIncome({ ...ok, monthlyBrl: 1e12 }));
  assert.throws(() => simulateFixedIncome({ ...ok, monthlyBrl: 1e12 + 1 }), RangeError);
  assert.doesNotThrow(() => simulateFixedIncome({ ...ok, initialBrl: 1e12 }));
  assert.throws(() => simulateFixedIncome({ ...ok, initialBrl: 1e12 + 1 }), RangeError);
  assert.doesNotThrow(() => simulateFixedIncome({ ...ok, months: 1 }));
});

test('rejects missing product and numeric-string months', () => {
  const ok = { ...base, months: 12, product: 'CDB' };
  assert.throws(() => simulateFixedIncome({ ...ok, product: undefined }), RangeError);
  assert.throws(() => simulateFixedIncome({ ...ok, months: '12' }), RangeError);
});
