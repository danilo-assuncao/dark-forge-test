'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Progress = require('../progress.js');

const KEY = 'dan-academy-progress';

// Instala um localStorage falso e restaura o estado original (inclusive ausência).
function withStorage(fn, initial) {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const store = Object.assign({}, initial);
  const fake = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  Object.defineProperty(globalThis, 'localStorage', { value: fake, configurable: true, writable: true });
  try {
    Progress._clear();
    Object.assign(store, initial);
    return fn(store, fake);
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete globalThis.localStorage;
    Progress._setRandom(null);
  }
}

test('markAulaAssistida and getAulasAssistidas', () => withStorage(() => {
  assert.deepEqual(Progress.getAulasAssistidas('curso-1'), []);
  Progress.markAulaAssistida('curso-1', 'aula-1');
  assert.deepEqual(Progress.getAulasAssistidas('curso-1'), ['aula-1']);
  Progress.markAulaAssistida('curso-1', 'aula-1');
  assert.deepEqual(Progress.getAulasAssistidas('curso-1'), ['aula-1']);
  Progress.markAulaAssistida('curso-1', 'aula-2');
  assert.deepEqual(Progress.getAulasAssistidas('curso-1'), ['aula-1', 'aula-2']);
  assert.deepEqual(Progress.getAulasAssistidas('curso-2'), []);
}));

test('ids are normalized to strings (1 and "1" are the same lesson)', () => withStorage(() => {
  Progress.markAulaAssistida('c', 1);
  Progress.markAulaAssistida('c', '1');
  assert.deepEqual(Progress.getAulasAssistidas('c'), ['1']);
  assert.equal(Progress.markAulaAssistida('c', null), false);
}));

test('gerarCertificado returns null if < 100%', () => withStorage(() => {
  Progress.markAulaAssistida('c1', 'a1');
  assert.equal(Progress.gerarCertificado('c1', 2), null);
  assert.equal(Progress.getCertificado('c1'), null);
}));

test('gerarCertificado generates CERT-XXXX once at 100%', () => withStorage(() => {
  Progress._setRandom(() => 0);
  Progress.markAulaAssistida('c2', 'a1');
  Progress.markAulaAssistida('c2', 'a2');
  const cert = Progress.gerarCertificado('c2', 2);
  assert.equal(cert, 'CERT-AAAA');
  assert.equal(Progress.getCertificado('c2'), cert);
  Progress._setRandom(() => 1);
  assert.equal(Progress.gerarCertificado('c2', 2), 'CERT-AAAA');
}));

test('default generator yields well-formed codes', () => withStorage(() => {
  Progress.markAulaAssistida('c', 'a');
  assert.match(Progress.gerarCertificado('c', 1), /^CERT-[A-Z0-9]{4}$/);
}));

test('gerarCertificado boundaries and negatives', () => withStorage(() => {
  assert.equal(Progress.gerarCertificado('unknown', 2), null);
  assert.equal(Progress.getCertificado('unknown'), null);
  Progress.markAulaAssistida('e', 'a1');
  assert.equal(Progress.gerarCertificado('e', 0), null);
  assert.equal(Progress.gerarCertificado('e', -1), null);
  assert.equal(Progress.gerarCertificado('e'), null);
  assert.equal(Progress.gerarCertificado('e', 'x'), null);
  ['a1', 'a2', 'a3'].forEach((a) => Progress.markAulaAssistida('over', a));
  assert.match(Progress.gerarCertificado('over', 2), /^CERT-/);
}));

test('certificates are per-course', () => withStorage(() => {
  let n = 0;
  Progress._setRandom(() => n++ % 36);
  Progress.markAulaAssistida('x', 'a');
  Progress.markAulaAssistida('y', 'a');
  const cx = Progress.gerarCertificado('x', 1);
  const cy = Progress.gerarCertificado('y', 1);
  assert.notEqual(cx, cy);
  assert.equal(Progress.getCertificado('x'), cx);
  assert.equal(Progress.getCertificado('y'), cy);
}));

test('completion requires every valid lesson id, not just a count', () => withStorage(() => {
  Progress.markAulaAssistida('c', 'old');
  Progress.markAulaAssistida('c', 'a1');
  assert.equal(Progress.gerarCertificado('c', ['a1', 'a2']), null);
  Progress.markAulaAssistida('c', 'a2');
  assert.match(Progress.gerarCertificado('c', ['a1', 'a2']), /^CERT-/);
  Progress.markAulaAssistida('d', 'a1');
  assert.equal(Progress.gerarCertificado('d', []), null);
}));

test('issued certificate stays visible if the course grows', () => withStorage(() => {
  Progress.markAulaAssistida('g', 'a1');
  const cert = Progress.gerarCertificado('g', 1);
  assert.equal(Progress.gerarCertificado('g', 5), cert);
  assert.equal(Progress.getCertificado('g'), cert);
}));

test('prototype-like course ids are safe', () => withStorage(() => {
  ['__proto__', 'constructor', 'toString', 'hasOwnProperty'].forEach((id) => {
    assert.deepEqual(Progress.getAulasAssistidas(id), []);
    assert.equal(Progress.getCertificado(id), null);
    assert.equal(Progress.gerarCertificado(id, 1), null);
    assert.equal(Progress.markAulaAssistida(id, 'a1'), true);
    assert.deepEqual(Progress.getAulasAssistidas(id), ['a1']);
  });
}));

test('localStorage persistence', () => withStorage((store) => {
  Progress.markAulaAssistida('c3', 'a1');
  assert.deepEqual(JSON.parse(store[KEY]).c3.assistidas, ['a1']);
  Progress.markAulaAssistida('c3', 'a2');
  Progress.gerarCertificado('c3', 2);
  const data = JSON.parse(store[KEY]);
  assert.deepEqual(data.c3.assistidas, ['a1', 'a2']);
  assert.match(data.c3.certificado, /^CERT-[A-Z0-9]{4}$/);
  assert.deepEqual(Progress.getAulasAssistidas('c3'), ['a1', 'a2']);
  Progress._clear();
  assert.equal(KEY in store, false);
}));

test('corrupted JSON in storage recovers', () => withStorage((store) => {
  assert.deepEqual(Progress.getAulasAssistidas('c'), []);
  assert.equal(Progress.validarCertificado('c', 'CERT-AAAA'), false);
  Progress.markAulaAssistida('c', 'a1');
  assert.deepEqual(JSON.parse(store[KEY]).c.assistidas, ['a1']);
}, { [KEY]: '{not json' }));

test('malformed stored shapes are normalized', () => {
  ['null', '5', '"str"', '[]', '{"c":null}', '{"c":{}}', '{"c":{"assistidas":"x"}}'].forEach((raw) => {
    withStorage(() => {
      assert.deepEqual(Progress.getAulasAssistidas('c'), []);
      assert.equal(Progress.getCertificado('c'), null);
      assert.equal(Progress.markAulaAssistida('c', 'a'), true);
      assert.deepEqual(Progress.getAulasAssistidas('c'), ['a']);
    }, { [KEY]: raw });
  });
  withStorage(() => {
    assert.equal(Progress.getCertificado('c'), null, 'invalid cert discarded');
    assert.deepEqual(Progress.getAulasAssistidas('c'), ['a']);
  }, { [KEY]: '{"c":{"assistidas":["a",1,"a"],"certificado":"<img onerror=x>"}}' });
});

test('throwing storage does not throw', () => {
  const desc = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); }, removeItem() { throw new Error('denied'); } }
  });
  try {
    Progress._clear();
    assert.doesNotThrow(() => Progress.markAulaAssistida('c', 'a'));
    assert.doesNotThrow(() => Progress.getAulasAssistidas('c'));
  } finally {
    if (desc) Object.defineProperty(globalThis, 'localStorage', desc);
    else delete globalThis.localStorage;
    Progress._clear();
  }
});

test('validarCertificado accepts only the issued code for the course', () => withStorage(() => {
  Progress._setRandom(() => 0);
  Progress.markAulaAssistida('v1', 'a1');
  Progress.markAulaAssistida('v2', 'a1');
  const code = Progress.gerarCertificado('v1', 1);
  assert.equal(code, 'CERT-AAAA');
  assert.equal(Progress.validarCertificado('v1', code), true);
  assert.equal(Progress.validarCertificado('v1', 'CERT-BBBB'), false);
  assert.equal(Progress.validarCertificado('v1', 'bad'), false);
  assert.equal(Progress.validarCertificado('other', code), false);
  assert.equal(Progress.validarCertificado('v2', 'CERT-AAAA'), false);
  [null, undefined, 1234, {}, 'cert-aaaa', ' CERT-AAAA', 'CERT-AAAA ', 'CERT-AAAAA', 'CERT-AAA'].forEach((v) => {
    assert.equal(Progress.validarCertificado('v1', v), false, String(v));
  });
}));
