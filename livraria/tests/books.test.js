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
});
