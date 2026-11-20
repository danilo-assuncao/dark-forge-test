'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { formatAuditEntry } = require('../trail.js');

test('trims surrounding whitespace while preserving content and internal spaces', () => {
  assert.deepEqual(formatAuditEntry(' \tAna Silva\n', '\u00a0Update  record\r\n'), {
    actor: 'Ana Silva',
    action: 'Update  record'
  });
  assert.deepEqual(formatAuditEntry('Ana', 'Read'), { actor: 'Ana', action: 'Read' });
});

test('returns a frozen entry that cannot be changed or extended', () => {
  const entry = formatAuditEntry('Ana', 'Read');
  assert.equal(Object.isFrozen(entry), true);
  assert.throws(() => { entry.actor = 'Bob'; }, TypeError);
  assert.throws(() => { entry.action = 'Delete'; }, TypeError);
  assert.throws(() => { delete entry.actor; }, TypeError);
  assert.throws(() => { entry.extra = true; }, TypeError);
  assert.deepEqual(entry, { actor: 'Ana', action: 'Read' });
});

test('rejects empty, whitespace-only, missing, and non-string values for either field', () => {
  const invalidValues = [
    '', ' ', '\t\r\n', '\u00a0', undefined, null, 0, NaN, true,
    {}, [], ['Ana'], new String('Ana'), Symbol('Ana'), 1n, () => 'Ana'
  ];
  for (const value of invalidValues) {
    assert.throws(() => formatAuditEntry(value, 'Read'), TypeError);
    assert.throws(() => formatAuditEntry('Ana', value), TypeError);
  }
  assert.throws(() => formatAuditEntry(), TypeError);
  assert.throws(() => formatAuditEntry('Ana'), TypeError);
});
