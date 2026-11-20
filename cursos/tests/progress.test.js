'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Progress = require('../progress.js');

test('markAulaAssistida and getAulasAssistidas', () => {
  Progress._clear();
  assert.deepEqual(Progress.getAulasAssistidas('curso-1'), []);
  
  Progress.markAulaAssistida('curso-1', 'aula-1');
  assert.deepEqual(Progress.getAulasAssistidas('curso-1'), ['aula-1']);
  
  Progress.markAulaAssistida('curso-1', 'aula-1'); // test deduplication
  assert.deepEqual(Progress.getAulasAssistidas('curso-1'), ['aula-1']);
  
  Progress.markAulaAssistida('curso-1', 'aula-2');
  assert.deepEqual(Progress.getAulasAssistidas('curso-1'), ['aula-1', 'aula-2']);
  
  assert.deepEqual(Progress.getAulasAssistidas('curso-2'), []);
});

test('gerarCertificado returns null if < 100%', () => {
  Progress._clear();
  Progress.markAulaAssistida('c1', 'a1');
  assert.equal(Progress.gerarCertificado('c1', 2), null);
  assert.equal(Progress.getCertificado('c1'), null);
});

test('gerarCertificado generates CERT-XXXX at 100%', () => {
  Progress._clear();
  Progress.markAulaAssistida('c2', 'a1');
  Progress.markAulaAssistida('c2', 'a2');
  
  const cert = Progress.gerarCertificado('c2', 2);
  assert.match(cert, /^CERT-[A-Z0-9]{4}$/);
  
  assert.equal(Progress.getCertificado('c2'), cert);
  
  // Calling again returns the same certificate
  const certAgain = Progress.gerarCertificado('c2', 2);
  assert.equal(certAgain, cert);
});

test('gerarCertificado with 0 total classes returns null', () => {
  Progress._clear();
  Progress.markAulaAssistida('c-empty', 'a1');
  assert.equal(Progress.gerarCertificado('c-empty', 0), null);
});

test('localStorage persistence', () => {
  Progress._clear();
  
  const origLocal = global.localStorage;
  const store = {};
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = String(val); },
    removeItem: (key) => { delete store[key]; }
  };
  
  try {
    Progress.markAulaAssistida('c3', 'a1');
    assert.ok(store['dan-academy-progress'], 'Should persist to localStorage');
    const data = JSON.parse(store['dan-academy-progress']);
    assert.deepEqual(data['c3'].assistidas, ['a1']);
    
    Progress.markAulaAssistida('c3', 'a2');
    Progress.gerarCertificado('c3', 2);
    
    const dataUpdated = JSON.parse(store['dan-academy-progress']);
    assert.deepEqual(dataUpdated['c3'].assistidas, ['a1', 'a2']);
    assert.match(dataUpdated['c3'].certificado, /^CERT-[A-Z0-9]{4}$/);
  } finally {
    global.localStorage = origLocal;
  }
});
