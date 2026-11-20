'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const eventsJs = fs.readFileSync(path.join(ROOT, 'events.js'), 'utf8');

function load() {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(eventsJs, ctx);
  return ctx.window.DanEvents;
}

test('returns all events', function () {
  const api = load();
  const all = api.all();
  assert.ok(all.length > 0);
  assert.equal(all[0].id, 'rock-festival');
});

test('finds event by id', function () {
  const api = load();
  const event = api.find('rock-festival');
  assert.ok(event);
  assert.equal(event.name, 'Rock in Dan');
  assert.ok(event.sectors.length > 0);
});

test('returns null for unknown event', function () {
  const api = load();
  assert.equal(api.find('unknown'), null);
});
