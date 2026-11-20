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

const CAT = require('../catalog.js');
const CODE = /^CERT-[A-Z0-9]{4}$/;

test('every catalog course issues a valid certificate that survives reload', () => {
  const s = mem();
  const codes = new Set();
  CAT.CURSOS.forEach((c) => {
    let r;
    for (let i = 1; i <= c.modules; i++) r = P.markWatched(c.id, i, s);
    assert.match(r.certificate.code, CODE);
    codes.add(r.certificate.code);
  });
  assert.equal(codes.size, CAT.CURSOS.length);
  CAT.CURSOS.forEach((c) => {
    assert.match(P.getCertificate(c.id, s).code, CODE);
  });
});

test('issuedAt is ISO and unchanged on re-mark', () => {
  const s = mem();
  P.markWatched('sql-fundamentos', 1, s);
  const r = P.markWatched('sql-fundamentos', 2, s);
  assert.equal(new Date(r.certificate.issuedAt).toISOString(), r.certificate.issuedAt);
  assert.equal(P.markWatched('sql-fundamentos', 2, s).certificate.issuedAt, r.certificate.issuedAt);
});

test('out-of-order marks are returned sorted', () => {
  const s = mem();
  P.markWatched('algoritmos-101', 3, s);
  P.markWatched('algoritmos-101', 1, s);
  assert.deepEqual(P.getWatched('algoritmos-101', s), [1, 3]);
});

test('stale lessons beyond total are ignored and do not block completion', () => {
  const s = mem();
  s.setItem('dan-academy-progress', JSON.stringify({ courses: { 'sql-fundamentos': [1, 99] } }));
  assert.deepEqual(P.getWatched('sql-fundamentos', s), [1]);
  assert.match(P.markWatched('sql-fundamentos', 2, s).certificate.code, CODE);
});

test('non-object roots fall back to empty state', () => {
  [null, [], 'x', 5].forEach((root) => {
    const s = mem();
    s.setItem('dan-academy-progress', JSON.stringify(root));
    assert.equal(P.getPercent('sql-fundamentos', s), 0);
  });
});

test('stored certificate: kept when complete, ignored when course incomplete', () => {
  const s = mem();
  s.setItem('dan-academy-progress', JSON.stringify({
    courses: { 'sql-fundamentos': [1, 2], 'ux-research': [1] },
    certificates: {
      'sql-fundamentos': { code: 'CERT-AAAA', issuedAt: '2026-01-01T00:00:00.000Z' },
      'ux-research': { code: 'CERT-BBBB', issuedAt: null }
    }
  }));
  assert.equal(P.getCertificate('sql-fundamentos', s).code, 'CERT-AAAA');
  assert.equal(P.getCertificate('ux-research', s), null);
});

test('rejections use clear messages, do not mutate storage, cover NaN/Infinity/-1', () => {
  const s = mem();
  [NaN, Infinity, -1, 0, 3].forEach((l) => {
    assert.throws(() => P.markWatched('sql-fundamentos', l, s), /Invalid lesson/);
  });
  assert.throws(() => P.markWatched('nope', 1, s), /Unknown course/);
  assert.deepEqual(s._d, {});
});

test('default storage fallback works and reset clears it', () => {
  P.markWatched('ux-research', 2);
  assert.equal(P.getPercent('ux-research'), 25);
  P.reset();
  assert.equal(P.getPercent('ux-research'), 0);
});

test('code generator retries on collision and throws when exhausted', () => {
  const state = { courses: {}, certificates: {} };
  const first = P._generateCode('a', state);
  state.certificates.a = { code: first };
  const second = P._generateCode('a', state);
  assert.notEqual(second, first);
  assert.match(second, CODE);
  const constant = () => 12345;
  state.certificates.b = { code: P._generateCode('b', { certificates: {} }, constant) };
  assert.throws(() => P._generateCode('b', state, constant, 5), /unique certificate code/);
});
