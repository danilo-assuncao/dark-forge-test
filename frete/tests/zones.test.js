'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveZoneRate } = require('../zones.js');

for (const [from, to, zone, baseBrl] of [
  [1, 19, 'SP', 15.0],
  [20, 28, 'RJ', 20.0],
  [29, 99, 'BR', 30.0]
]) {
  test(`resolves every prefix from ${from} to ${to} to ${zone}`, () => {
    for (let value = from; value <= to; value++) {
      const prefix = String(value).padStart(2, '0');
      assert.deepEqual(resolveZoneRate(prefix), { zone, baseBrl }, prefix);
    }
  });
}

test('rejects non-string inputs with TypeError without coercing them', () => {
  for (const input of [undefined, null, 1, 20, NaN, Infinity, true, false,
    1n, Symbol('01'), [], ['01'], {}, new String('01'), () => '01']) {
    assert.throws(() => resolveZoneRate(input), TypeError);
  }
});

test('rejects zero and malformed strings with RangeError', () => {
  for (const input of ['00', '', '0', '1', '100', '001', '-1', '+1', '1.0',
    'ab', '1a', ' 01', '01 ', '0 1', '01\n', '01\r', '01\r\n', '\t01',
    '０１', '٠١']) {
    assert.throws(() => resolveZoneRate(input), RangeError, JSON.stringify(input));
  }
});
