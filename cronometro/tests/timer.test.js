'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { LapTimer } = require('../timer');

test('empty timer reports zeros and null best', () => {
  assert.deepEqual(new LapTimer().stats(), { count: 0, totalMs: 0, bestMs: null });
});

test('single lap', () => {
  const t = new LapTimer();
  assert.equal(t.recordLap(120), 120);
  assert.deepEqual(t.stats(), { count: 1, totalMs: 120, bestMs: 120 });
});

test('multiple laps: sum and minimum from the middle', () => {
  const t = new LapTimer();
  [300, 100, 200].forEach((ms) => t.recordLap(ms));
  assert.deepEqual(t.stats(), { count: 3, totalMs: 600, bestMs: 100 });
});

test('accepts fractional ms', () => {
  const t = new LapTimer();
  t.recordLap(0.5);
  assert.equal(t.stats().bestMs, 0.5);
});

test('rejects invalid durations', () => {
  const t = new LapTimer();
  for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => t.recordLap(bad), RangeError);
  }
  for (const bad of ['100', null, undefined, {}]) {
    assert.throws(() => t.recordLap(bad), TypeError);
  }
});

test('invalid call leaves state unchanged', () => {
  const t = new LapTimer();
  t.recordLap(50);
  assert.throws(() => t.recordLap(-5), RangeError);
  assert.throws(() => t.recordLap('100'), TypeError);
  assert.deepEqual(t.stats(), { count: 1, totalMs: 50, bestMs: 50 });
});

test('reset clears laps and timer is reusable', () => {
  const t = new LapTimer();
  t.recordLap(10);
  t.reset();
  assert.deepEqual(t.stats(), { count: 0, totalMs: 0, bestMs: null });
  t.recordLap(7);
  assert.deepEqual(t.stats(), { count: 1, totalMs: 7, bestMs: 7 });
});

test('instances do not share state', () => {
  const a = new LapTimer();
  const b = new LapTimer();
  a.recordLap(10);
  assert.equal(b.stats().count, 0);
});

test('mutating stats() result does not affect later calls', () => {
  const t = new LapTimer();
  t.recordLap(10);
  const s = t.stats();
  s.count = 99;
  s.totalMs = 99;
  assert.deepEqual(t.stats(), { count: 1, totalMs: 10, bestMs: 10 });
});
