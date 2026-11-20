'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatTrackingCode } = require('../tracker.js');

test('pads positive sequences to four digits', () => {
  for (const [seq, expected] of [[1, 'LOG-0001'], [12, 'LOG-0012'], [123, 'LOG-0123']]) {
    assert.equal(formatTrackingCode(seq), expected);
  }
});

test('preserves sequences with four or more digits', () => {
  assert.equal(formatTrackingCode(1000), 'LOG-1000');
  assert.equal(formatTrackingCode(9999), 'LOG-9999');
  assert.equal(formatTrackingCode(10000), 'LOG-10000');
  assert.equal(formatTrackingCode(Number.MAX_SAFE_INTEGER), 'LOG-9007199254740991');
});

test('rejects zero, negative, fractional, and non-finite numbers with RangeError', () => {
  for (const seq of [0, -0, -1, 1.5, NaN, Infinity, -Infinity]) {
    assert.throws(() => formatTrackingCode(seq), {
      name: 'RangeError', message: 'sequence must be a positive integer',
    });
  }
});

test('rejects unsafe integers including values that stringify in exponent notation', () => {
  for (const seq of [Number.MAX_SAFE_INTEGER + 1, 2 ** 60, 1e21]) {
    assert.throws(() => formatTrackingCode(seq), {
      name: 'RangeError', message: 'sequence must be a positive integer',
    });
  }
});

test('rejects missing and non-number sequences without coercion', () => {
  for (const seq of [undefined, null, '1', '', true, false, {}, [], [1], new Number(5), 1n, Symbol('seq')]) {
    assert.throws(() => formatTrackingCode(seq), {
      name: 'RangeError', message: 'sequence must be a positive integer',
    });
  }
  assert.throws(() => formatTrackingCode(), {
    name: 'RangeError', message: 'sequence must be a positive integer',
  });
});
