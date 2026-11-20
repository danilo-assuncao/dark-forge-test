'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  MOVIES, SESSIONS, BASE_TICKET_PRICES, listMovies, getSessionById, getBaseTicketPrice,
} = require('../movies.js');

test('catalog has 4+ movies with distinct genres and all required ratings', () => {
  assert.ok(MOVIES.length >= 4);
  assert.ok(new Set(MOVIES.map((m) => m.genre)).size >= 4);
  for (const m of MOVIES) assert.ok(m.genre !== '' && m.genre === m.genre.toLowerCase());
  const ratings = MOVIES.map((m) => m.rating);
  for (const r of ['L', '12', '14', '16']) assert.ok(ratings.includes(r));
});

test('sessions reference existing movies and valid room types', () => {
  const ids = new Set(MOVIES.map((m) => m.id));
  for (const s of SESSIONS) {
    assert.ok(ids.has(s.movieId));
    assert.ok(Object.keys(BASE_TICKET_PRICES).includes(s.roomType));
    assert.equal(typeof getBaseTicketPrice(s.roomType), 'number');
    assert.match(s.time, /^([01]\d|2[0-3]):[0-5]\d$/);
  }
  assert.equal(new Set(SESSIONS.map((s) => s.id)).size, SESSIONS.length);
});

test('catalog is deeply immutable', () => {
  assert.ok(Object.isFrozen(MOVIES) && Object.isFrozen(SESSIONS) && Object.isFrozen(BASE_TICKET_PRICES));
  assert.ok(MOVIES.every(Object.isFrozen) && SESSIONS.every(Object.isFrozen));
  assert.throws(() => MOVIES.push({}), TypeError);
  assert.throws(() => { MOVIES[0].title = 'x'; }, TypeError);
  assert.throws(() => { SESSIONS[0].time = '00:00'; }, TypeError);
  assert.throws(() => { BASE_TICKET_PRICES['2D'] = 1; }, TypeError);
});

test('listMovies returns all movies without filters', () => {
  assert.equal(listMovies().length, MOVIES.length);
  assert.equal(listMovies({}).length, MOVIES.length);
});

test('listMovies filters by genre (case-insensitive) and maxRating', () => {
  assert.deepEqual(listMovies({ genre: 'TERROR' }).map((m) => m.rating), ['16']);
  assert.deepEqual(listMovies({ maxRating: 'L' }).map((m) => m.rating), ['L']);
  assert.deepEqual(listMovies({ maxRating: '14' }).map((m) => m.rating), ['L', '12', '14']);
  assert.equal(listMovies({ maxRating: '16' }).length, MOVIES.length);
  assert.deepEqual(listMovies({ maxRating: '12' }).map((m) => m.rating), ['L', '12']);
  assert.equal(listMovies({ genre: '  terror ' }).length, 1);
  assert.deepEqual(listMovies({ genre: 'terror', maxRating: '16' }).map((m) => m.id), ['mov-sombras-na-estrada']);
  assert.equal(listMovies({ genre: 'ANIMAÇÃO' }).length, 1);
  assert.equal(listMovies({ genre: 'Ficção Científica' }).length, 1);
  assert.equal(listMovies({ genre: undefined, maxRating: undefined }).length, MOVIES.length);
  assert.notEqual(listMovies(), MOVIES);
  assert.notEqual(listMovies({ maxRating: '16' }), MOVIES);
  assert.deepEqual(listMovies({ genre: 'terror', maxRating: '12' }), []);
  assert.deepEqual(listMovies({ genre: 'inexistente' }), []);
});

test('listMovies validates inputs', () => {
  assert.throws(() => listMovies({ genre: 5 }), TypeError);
  assert.throws(() => listMovies({ genre: '  ' }), TypeError);
  assert.throws(() => listMovies({ maxRating: 12 }), TypeError);
  assert.throws(() => listMovies({ maxRating: '18' }), RangeError);
  assert.throws(() => listMovies(null), TypeError);
  assert.throws(() => listMovies([]), TypeError);
  assert.throws(() => listMovies({ genre: null }), TypeError);
  assert.throws(() => listMovies({ maxRating: null }), TypeError);
  assert.throws(() => listMovies({ maxRating: 'l' }), RangeError);
  assert.throws(() => listMovies('terror'), TypeError);
});

test('getSessionById finds sessions and returns null for unknown ids', () => {
  assert.deepEqual(getSessionById('ses-001'), SESSIONS[0]);
  assert.equal(getSessionById('nope'), null);
  assert.throws(() => getSessionById(1), TypeError);
  assert.throws(() => getSessionById(undefined), TypeError);
  assert.throws(() => getSessionById(' '), RangeError);
  assert.throws(() => getSessionById(''), RangeError);
  assert.equal(getSessionById(' ses-001'), null);
});

test('getBaseTicketPrice returns room prices and validates input', () => {
  assert.equal(getBaseTicketPrice('2D'), 36);
  assert.equal(getBaseTicketPrice('VIP'), 64);
  assert.equal(getBaseTicketPrice('IMAX'), 52);
  assert.throws(() => getBaseTicketPrice(2), TypeError);
  assert.throws(() => getBaseTicketPrice(), TypeError);
  assert.throws(() => getBaseTicketPrice('3D'), RangeError);
  assert.throws(() => getBaseTicketPrice(''), RangeError);
  assert.throws(() => getBaseTicketPrice('toString'), RangeError);
  assert.throws(() => getBaseTicketPrice('constructor'), RangeError);
  assert.throws(() => getBaseTicketPrice('__proto__'), RangeError);
  assert.throws(() => getBaseTicketPrice('hasOwnProperty'), RangeError);
});
