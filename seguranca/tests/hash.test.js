'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sha256Hex } = require('../hash.js');

test('matches known SHA-256 vectors, including an empty string', () => {
  assert.equal(sha256Hex(''), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  assert.equal(sha256Hex('hello'), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});

test('encodes Unicode input as UTF-8', () => {
  assert.equal(sha256Hex('é'), '4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c');
});

test('preserves whitespace and returns independent lowercase hex digests', () => {
  const digest = sha256Hex(' abc ');
  assert.match(digest, /^[0-9a-f]{64}$/);
  assert.notEqual(digest, sha256Hex('abc'));
  assert.equal(sha256Hex(' abc '), digest);
});

test('rejects non-string inputs with TypeError', () => {
  for (const input of [undefined, null, 0, true, 1n, Symbol('abc'), {}, [], Buffer.from('abc'), new String('abc')]) {
    assert.throws(() => sha256Hex(input), TypeError);
  }
});
