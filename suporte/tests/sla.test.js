'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { responseDeadlineHours } = require('../sla.js');

test('returns the response deadline in hours for each supported priority', () => {
  assert.equal(responseDeadlineHours('critical'), 1);
  assert.equal(responseDeadlineHours('high'), 4);
  assert.equal(responseDeadlineHours('normal'), 24);
});

test('rejects unsupported strings without normalizing them', () => {
  for (const priority of ['', 'low', 'Critical', 'HIGH', ' normal ', 'toString', '__proto__']) {
    assert.throws(() => responseDeadlineHours(priority), RangeError);
  }
});

test('rejects missing and non-string priorities with RangeError', () => {
  assert.throws(() => responseDeadlineHours(), RangeError);
  for (const priority of [undefined, null, 1, NaN, true, {}, ['critical'], new String('high'), Symbol('normal')]) {
    assert.throws(() => responseDeadlineHours(priority), RangeError);
  }
});
