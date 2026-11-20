'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../progress.js');

function mem() {
  const d = {};
  return {
    getItem: (k) => (k in d ? d[k] : null),
    setItem: (k, v) => { d[k] = String(v); },
    removeItem: (k) => { delete d[k]; },
    _d: d
  };
}

test('storage key', () => {
  assert.equal(P.STORAGE_KEY, 'dan-academy-progress');
});

test('percent starts at 0 and grows per lesson', () => {
  const s = mem();
  assert.equal(P.getPercent('algoritmos-101', s), 0);
  assert.equal(P.markWatched('algoritmos-101', 1, s).percent, 25);
  assert.equal(P.markWatched('algoritmos-101', 2, s).percent, 50);
});

test('marking is idempotent and persisted', () => {
  const s = mem();
  P.markWatched('sql-fundamentos', 1, s);
  P.markWatched('sql-fundamentos', 1, s);
  assert.deepEqual(P.getWatched('sql-fundamentos', s), [1]);
  assert.deepEqual(JSON.parse(s._d['dan-academy-progress']).courses['sql-fundamentos'], [1]);
  assert.equal(P.getPercent('sql-fundamentos', s), 50);
});

test('certificate issued at 100% only, and is stable', () => {
  const s = mem();
  assert.equal(P.markWatched('sql-fundamentos', 1, s).certificate, null);
  const r = P.markWatched('sql-fundamentos', 2, s);
  assert.equal(r.percent, 100);
  assert.match(r.certificate.code, /^CERT-[A-Z0-9]{4}$/);
  assert.equal(P.markWatched('sql-fundamentos', 2, s).certificate.code, r.certificate.code);
  assert.equal(P.getCertificate('sql-fundamentos', s).code, r.certificate.code);
  assert.equal(P.getCertificate('ux-research', s), null);
});

test('certificate codes are unique across courses', () => {
  const s = mem();
  const codes = new Set();
  ['sql-fundamentos', 'descoberta-produto'].forEach((id) => {
    const n = id === 'sql-fundamentos' ? 2 : 3;
    let r;
    for (let i = 1; i <= n; i++) r = P.markWatched(id, i, s);
    codes.add(r.certificate.code);
  });
  assert.equal(codes.size, 2);
});

test('progress is per course', () => {
  const s = mem();
  P.markWatched('ux-research', 1, s);
  assert.equal(P.getPercent('ux-research', s), 25);
  assert.equal(P.getPercent('algoritmos-101', s), 0);
});

test('rejects unknown course and invalid lessons', () => {
  const s = mem();
  assert.throws(() => P.markWatched('nope', 1, s));
  assert.throws(() => P.markWatched('sql-fundamentos', 0, s));
  assert.throws(() => P.markWatched('sql-fundamentos', 3, s));
  assert.throws(() => P.markWatched('sql-fundamentos', 1.5, s));
  assert.throws(() => P.markWatched('sql-fundamentos', '1', s));
  assert.throws(() => P.getPercent('nope', s));
});

test('corrupted storage falls back to empty state', () => {
  const s = mem();
  s.setItem('dan-academy-progress', '{bad json');
  assert.equal(P.getPercent('sql-fundamentos', s), 0);
  s.setItem('dan-academy-progress', JSON.stringify({ courses: { 'sql-fundamentos': [1, 1, 'x', 99, -1] }, certificates: { 'sql-fundamentos': { code: 'bogus' } } }));
  assert.equal(P.getPercent('sql-fundamentos', s), 50);
  assert.equal(P.getCertificate('sql-fundamentos', s), null);
});

test('reset clears progress', () => {
  const s = mem();
  P.markWatched('ux-research', 1, s);
  P.reset(s);
  assert.equal(P.getPercent('ux-research', s), 0);
});
