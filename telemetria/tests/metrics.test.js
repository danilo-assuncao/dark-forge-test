'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createCounter } = require('../metrics.js');

test('starts at zero and increments by 1 by default', () => {
  const c = createCounter('hits');
  assert.equal(c.value(), 0);
  assert.equal(c.increment(), 1);
  assert.equal(c.value(), 1);
});

test('increments by a given amount, including zero', () => {
  const c = createCounter('bytes');
  c.increment(2.5);
  c.increment(0);
  assert.equal(c.value(), 2.5);
});

test('snapshot returns name and value, detached from the counter', () => {
  const c = createCounter('hits');
  c.increment(3);
  const snap = c.snapshot();
  assert.deepEqual(snap, { name: 'hits', value: 3 });
  c.increment();
  assert.equal(snap.value, 3);
});

test('rejects invalid increment amounts without changing state', () => {
  const c = createCounter('hits');
  for (const bad of [-1, NaN, Infinity, -Infinity, '1', null, {}]) {
    assert.throws(() => c.increment(bad), TypeError);
  }
  assert.equal(c.value(), 0);
});

test('rejects invalid counter names', () => {
  for (const bad of [undefined, '', '  ', 5, null]) {
    assert.throws(() => createCounter(bad), TypeError);
  }
});

test('counters are independent', () => {
  const a = createCounter('a');
  const b = createCounter('b');
  a.increment(5);
  assert.equal(b.value(), 0);
});

test('throws RangeError when the total would overflow, leaving state unchanged', () => {
  const c = createCounter('big');
  c.increment(Number.MAX_VALUE);
  assert.throws(() => c.increment(Number.MAX_VALUE), RangeError);
  assert.equal(c.value(), Number.MAX_VALUE);
  assert.deepEqual(c.snapshot(), { name: 'big', value: Number.MAX_VALUE });
});

test('snapshot keeps the name exactly as given, without trimming', () => {
  assert.equal(createCounter(' hits ').snapshot().name, ' hits ');
});

test('increment(undefined) falls back to the default of 1', () => {
  const c = createCounter('hits');
  assert.equal(c.increment(undefined), 1);
});
