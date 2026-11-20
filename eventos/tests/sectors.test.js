'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

function load() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(read('events.js'), ctx);
  vm.runInContext(read('app.js'), ctx);
  const api = ctx.window.DanSectors;
  const plain = (v) => JSON.parse(JSON.stringify(v));
  const wrapped = {};
  Object.keys(api).forEach((k) => {
    wrapped[k] = typeof api[k] === 'function' ? (...a) => plain(api[k](...a)) : api[k];
  });
  return wrapped;
}

test('index.html loads app.js and stays light-only', function () {
  const html = read('index.html');
  assert.match(html, /<script src="app\.js" defer><\/script>/);
  assert.doesNotMatch(read('styles.css') + read('app.js') + html, /prefers-color-scheme|data-theme/);
});

test('parseHash / buildHash round-trip', function () {
  const api = load();
  assert.deepEqual(api.parseHash('').name, 'list');
  assert.deepEqual(api.parseHash('#/').params, {});
  const r = api.parseHash('#/evento/rock-festival?setor=vip&lote=lote-2');
  assert.equal(r.name, 'event');
  assert.equal(r.id, 'rock-festival');
  assert.equal(r.params.setor, 'vip');
  assert.equal(api.buildHash(r), '#/evento/rock-festival?setor=vip&lote=lote-2');
  assert.equal(api.parseHash('#/?q=pop%20star&city=S%C3%A3o+Paulo').params.city, 'São Paulo');
  assert.equal(api.parseHash('#/evento/%E0%A4%A').id, '');
});

test('filters by search, category and city', function () {
  const api = load();
  const all = api.catalog();
  assert.equal(api.filterEvents(all, {}).length, all.length);
  assert.deepEqual(api.filterEvents(all, { category: 'Show' }).map((e) => e.id), ['show-pop']);
  assert.deepEqual(api.filterEvents(all, { city: 'Rio de Janeiro' }).map((e) => e.id), ['teatro-comedia']);
  assert.deepEqual(api.filterEvents(all, { q: 'COMEDIA' }).map((e) => e.id), ['teatro-comedia']);
  assert.deepEqual(api.filterEvents(all, { q: 'rock', city: 'Rio de Janeiro' }), []);
});

test('events expose Pista/VIP/Camarote sectors with lots and availability', function () {
  const api = load();
  const rock = api.catalog().find((e) => e.id === 'rock-festival');
  assert.deepEqual(rock.sectors.map((s) => s.id).sort(), ['camarote', 'pista', 'vip']);
  const pista = rock.sectors.find((s) => s.id === 'pista');
  assert.equal(pista.lots.length, 3);
  assert.equal(pista.lots[2].status, 'soldout');
  assert.equal(pista.lots[0].status, 'available');
  api.catalog().forEach((e) => e.sectors.forEach((s) => {
    assert.ok(s.lots.length > 0, `${e.id}/${s.id} has lots`);
    s.lots.forEach((l) => assert.ok(l.remaining >= 0 && l.remaining <= l.total));
  }));
});

test('lotStatus and formatPrice', function () {
  const api = load();
  assert.equal(api.lotStatus(0, 100), 'soldout');
  assert.equal(api.lotStatus(5, 100), 'last');
  assert.equal(api.lotStatus(50, 100), 'available');
  assert.equal(api.formatPrice(1234500), 'R$ 12.345,00');
});
