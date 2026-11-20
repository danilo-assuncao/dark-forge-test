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
