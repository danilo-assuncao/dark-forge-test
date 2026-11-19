'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const B = require('../books.js');

test('genres are the four required collections', () => {
  assert.deepEqual(B.GENRES.map((g) => g.name),
    ['Ficcao & Fantasia', 'Tecnologia & Ciencia', 'Negocios', 'Biografias']);
});

test('formats are Capa Comum, Capa Dura and E-book', () => {
  assert.deepEqual(B.FORMATS.map((f) => f.name), ['Capa Comum', 'Capa Dura', 'E-book']);
});

test('every genre has books and every book is well formed', () => {
  B.GENRES.forEach((g) => assert.ok(B.booksByGenre(g.id).length >= 3, g.id));
  const ids = new Set();
  B.BOOKS.forEach((b) => {
    assert.ok(!ids.has(b.id), 'duplicate ' + b.id);
    ids.add(b.id);
    assert.ok(B.GENRES.some((g) => g.id === b.genre), b.id);
    assert.ok(Number.isInteger(b.price) && b.price > 0, b.id);
    assert.ok(Number.isInteger(b.pages) && b.pages > 0, b.id);
    assert.ok(b.formats.length > 0 && b.formats.every((f) => B.findFormat(f)), b.id);
  });
});

test('booksByGenre filters and returns all without argument', () => {
  assert.equal(B.booksByGenre().length, B.BOOKS.length);
  assert.ok(B.booksByGenre('negocios').every((b) => b.genre === 'negocios'));
  assert.deepEqual(B.booksByGenre('nope'), []);
});

test('reading time is derived from pages', () => {
  assert.equal(B.readingMinutes(40), 60);
  assert.equal(B.readingMinutes(200), 300);
  assert.equal(B.readingMinutes(1), 2);
  assert.equal(B.readingMinutes(0), null);
  assert.equal(B.readingMinutes('x'), null);
  assert.equal(B.formatReadingTime(45), '45 min');
  assert.equal(B.formatReadingTime(300), '5 h');
  assert.equal(B.formatReadingTime(330), '5 h 30 min');
  assert.equal(B.formatReadingTime(0), '');
});

test('metaFor returns pages and reading time', () => {
  const m = B.metaFor('financas-sem-medo');
  assert.equal(m.pages, 192);
  assert.equal(m.readingMinutes, 288);
  assert.equal(m.readingTime, '4 h 48 min');
  assert.equal(B.metaFor('x'), null);
});

test('priceFor applies the format factor and rejects unavailable formats', () => {
  assert.equal(B.priceFor('lideranca-essencial', 'capa-comum'), 5490);
  assert.equal(B.priceFor('lideranca-essencial', 'capa-dura'), 8235);
  assert.equal(B.priceFor('lideranca-essencial', 'ebook'), 3294);
  assert.equal(B.priceFor('cosmos-em-perspectiva', 'ebook'), null);
  assert.equal(B.priceFor('x', 'ebook'), null);
  assert.equal(B.priceFor('lideranca-essencial', 'x'), null);
});

test('formatBRL formats cents', () => {
  assert.equal(B.formatBRL(5990), 'R$ 59,90');
  assert.equal(B.formatBRL(123456), 'R$ 1.234,56');
  assert.equal(B.formatBRL(0), 'R$ 0,00');
  assert.equal(B.formatBRL(5), 'R$ 0,05');
  assert.equal(B.formatBRL(99), 'R$ 0,99');
  assert.equal(B.formatBRL(100000), 'R$ 1.000,00');
  assert.equal(B.formatBRL(123456789), 'R$ 1.234.567,89');
});

test('formatBRL returns empty string for invalid input', () => {
  [null, undefined, NaN, Infinity, -1, '59,90'].forEach((v) => assert.equal(B.formatBRL(v), ''));
  assert.equal(B.formatBRL(B.priceFor('cosmos-em-perspectiva', 'ebook')), '');
});

test('priceFor yields integer cents for all format factors', () => {
  assert.equal(B.priceFor('cosmos-em-perspectiva', 'capa-dura'), 11235);
  assert.equal(B.priceFor('inteligencia-artificial-simples', 'ebook'), 3894);
  assert.equal(B.priceFor('financas-sem-medo', 'ebook'), 2754);
});

test('priceFor is a positive integer iff the format is listed', () => {
  B.BOOKS.forEach((b) => B.FORMATS.forEach((f) => {
    const p = B.priceFor(b.id, f.id);
    if (b.formats.includes(f.id)) assert.ok(Number.isInteger(p) && p > 0, b.id + '/' + f.id);
    else assert.equal(p, null, b.id + '/' + f.id);
  }));
});

test('readingMinutes and formatReadingTime validate input', () => {
  [-5, NaN, Infinity, undefined, null].forEach((v) => assert.equal(B.readingMinutes(v), null));
  assert.equal(B.readingMinutes(0.1), 1);
  assert.equal(B.readingMinutes(10.5), 16);
  [-1, NaN, '5', undefined].forEach((v) => assert.equal(B.formatReadingTime(v), ''));
});

test('findBook/findFormat return null on miss and booksByGenre returns a copy', () => {
  assert.equal(B.findBook('x'), null);
  assert.equal(B.findFormat('x'), null);
  assert.equal(B.findBook('vida-de-artista').id, 'vida-de-artista');
  assert.equal(B.findFormat('ebook').name, 'E-book');
  const all = B.booksByGenre();
  assert.notEqual(all, B.BOOKS);
  const n = B.BOOKS.length;
  all.pop();
  assert.equal(B.BOOKS.length, n);
});

test('exposes DanBooksCatalog as a browser global', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const vm = require('node:vm');
  const src = fs.readFileSync(path.join(__dirname, '..', 'books.js'), 'utf8');
  const win = {};
  vm.runInNewContext(src, { window: win });
  assert.ok(win.DanBooksCatalog);
  ['GENRES', 'FORMATS', 'BOOKS', 'findBook', 'findFormat', 'booksByGenre', 'readingMinutes',
    'formatReadingTime', 'priceFor', 'metaFor', 'formatBRL'].forEach((k) =>
    assert.ok(k in win.DanBooksCatalog, k));
});
