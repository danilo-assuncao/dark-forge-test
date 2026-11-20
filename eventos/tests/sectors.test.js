'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');

function load() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  ['events.js', 'app.js'].forEach(function (f) {
    vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx);
  });
  return { events: ctx.window.DanEvents, app: ctx.window.DanApp };
}

test('filters by text, category and city (accent-insensitive)', function () {
  const { events, app } = load();
  const all = events.all();
  assert.equal(app.filterEvents(all, {}).length, all.length);
  assert.deepEqual(Array.from(app.filterEvents(all, { q: 'comedia' }).map(e => e.id)), ['teatro-comedia']);
  assert.deepEqual(Array.from(app.filterEvents(all, { category: 'show' }).map(e => e.id)), ['show-pop']);
  assert.deepEqual(Array.from(app.filterEvents(all, { city: 'Rio de Janeiro' }).map(e => e.id)), ['teatro-comedia']);
  assert.equal(app.filterEvents(all, { q: 'rock', city: 'Rio de Janeiro' }).length, 0);
  assert.deepEqual(Array.from(app.filterEvents(all, { city: 'sao paulo' }).map(e => e.id)), ['rock-festival', 'show-pop']);
});

test('parses and builds hashes', function () {
  const { app } = load();
  assert.equal(app.parseHash('').route, 'home');
  assert.equal(app.parseHash('#/?q=rock%20in&cat=Show').params.q, 'rock in');
  const ev = app.parseHash('#/evento/show-pop/pista');
  assert.deepEqual([ev.route, ev.id, ev.sectorId], ['event', 'show-pop', 'pista']);
  assert.equal(app.parseHash('#/evento/show-pop').sectorId, null);
  assert.equal(app.parseHash('#/evento/%E0%A4%A').route, 'home');
  assert.equal(app.buildHomeHash({}), '#/');
  assert.equal(app.buildHomeHash({ q: 'a b', category: 'Show' }), '#/?q=a%20b&cat=Show');
});

test('lot availability per sector', function () {
  const { events, app } = load();
  const rock = events.find('rock-festival');
  const pista = rock.sectors.find(s => s.id === 'pista');
  const lots = app.getLots(rock, pista);
  assert.equal(lots.length, 3);
  assert.equal(lots[0].available, false);
  assert.equal(app.currentLot(rock, pista).id, 'lote-2');
  assert.equal(lots[1].priceCents, 18000);
  const camarote = rock.sectors.find(s => s.id === 'camarote');
  assert.equal(app.currentLot(rock, camarote), null);
});

test('index.html loads app.js after events.js', function () {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.ok(html.indexOf('events.js') < html.indexOf('app.js'));
});
