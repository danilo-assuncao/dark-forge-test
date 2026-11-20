'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const eventsJs = fs.readFileSync(path.join(ROOT, 'events.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function load() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(eventsJs, ctx);
  return ctx.window.DanEvents;
}

test('returns all events and ensures immutability', function () {
  const api = load();
  const all = api.all();
  assert.ok(all.length > 0);
  
  // Immutability test
  all[0].sectors[0].priceCents = 999999;
  all.pop();
  
  const allAgain = api.all();
  assert.ok(allAgain.length > all.length);
  assert.notEqual(allAgain[0].sectors[0].priceCents, 999999);
});

test('finds event by id', function () {
  const api = load();
  const all = api.all();
  all.forEach(function (e) {
    const event = api.find(e.id);
    assert.ok(event);
    assert.equal(event.id, e.id);
    
    // Immutability test on find
    event.name = 'Hacked';
    const again = api.find(e.id);
    assert.notEqual(again.name, 'Hacked');
  });
});

test('finds returns null for unknown and boundary inputs', function () {
  const api = load();
  assert.equal(api.find('unknown'), null);
  assert.equal(api.find('ROCK-FESTIVAL'), null);
  assert.equal(api.find(''), null);
  assert.equal(api.find(null), null);
  assert.equal(api.find(undefined), null);
});

test('catalog data contract', function () {
  const api = load();
  const all = api.all();
  const ids = new Set();
  
  all.forEach(function (e) {
    assert.ok(!ids.has(e.id), `duplicate event id: ${e.id}`);
    ids.add(e.id);
    
    assert.equal(typeof e.id, 'string');
    assert.ok(e.id.length > 0);
    assert.equal(typeof e.name, 'string');
    assert.ok(e.name.length > 0);
    assert.equal(typeof e.type, 'string');
    assert.ok(e.type.length > 0);
    assert.equal(typeof e.description, 'string');
    assert.ok(e.description.length > 0);
    
    assert.ok(Array.isArray(e.sectors));
    assert.ok(e.sectors.length > 0);
    
    const sectorIds = new Set();
    e.sectors.forEach(function (s) {
      assert.ok(!sectorIds.has(s.id), `duplicate sector id ${s.id} in event ${e.id}`);
      sectorIds.add(s.id);
      
      assert.equal(typeof s.id, 'string');
      assert.ok(s.id.length > 0);
      assert.equal(typeof s.name, 'string');
      assert.ok(s.name.length > 0);
      assert.ok(Number.isInteger(s.priceCents));
      assert.ok(s.priceCents > 0);
    });
  });
});

test('index.html wires up the script and mount point', function () {
  assert.match(html, /<script src="events\.js" defer><\/script>/);
  assert.match(html, /<main class="app" id="app"><\/main>/);
});

