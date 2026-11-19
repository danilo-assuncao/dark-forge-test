'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../destinations.js');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('styles.css is light only with no dark mode', () => {
  const css = read('styles.css');
  assert.match(css, /color-scheme:\s*only light;/);
  assert.doesNotMatch(css, /prefers-color-scheme|data-theme/);
});

test('index.html wires styles, script and filter hooks', () => {
  const html = read('index.html');
  assert.match(html, /href="styles\.css"/);
  assert.match(html, /src="destinations\.js"/);
  for (const id of ['catalog', 'filter-category', 'filter-duration']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
});

test('categories and durations are the expected ones', () => {
  assert.deepEqual(api.CATEGORIES, ['Praias', 'Serra & Inverno', 'Internacional', 'Ecoturismo']);
  assert.deepEqual(api.DURATIONS, [3, 7, 12]);
});

test('every category has destinations and every duration is offered', () => {
  for (const c of api.CATEGORIES) { assert.ok(api.byCategory(c).length >= 2, c); }
  for (const d of api.DURATIONS) { assert.ok(api.filterDestinations({ duration: d }).length > 0, String(d)); }
});

test('destination records are well formed', () => {
  const ids = new Set();
  for (const d of api.DESTINATIONS) {
    assert.ok(!ids.has(d.id), 'duplicate ' + d.id);
    ids.add(d.id);
    assert.ok(api.CATEGORIES.includes(d.category), d.id);
    assert.ok(d.durations.length > 0);
    for (const n of d.durations) {
      assert.ok(api.DURATIONS.includes(n), d.id);
      assert.ok(Number.isInteger(d.priceCents[n]) && d.priceCents[n] > 0, d.id + ' price ' + n);
    }
    assert.deepEqual(Object.keys(d.priceCents).map(Number).sort((a, b) => a - b), d.durations.slice().sort((a, b) => a - b));
    assert.ok(d.climate.season && d.climate.summary && typeof d.climate.avgTempC === 'number', d.id);
    assert.ok(Array.isArray(d.includes) && d.includes.length > 0, d.id);
  }
});

test('filterDestinations combines category and duration', () => {
  assert.equal(api.filterDestinations().length, api.DESTINATIONS.length);
  const r = api.filterDestinations({ category: 'Praias', duration: '12' });
  assert.deepEqual(r.map((d) => d.id), ['jericoacoara']);
  assert.deepEqual(api.filterDestinations({ category: 'Ecoturismo', duration: 99 }), []);
});

test('getDestination, formatBRL and durationLabel', () => {
  assert.equal(api.getDestination('gramado').name, 'Gramado, RS');
  assert.equal(api.getDestination('nope'), null);
  assert.equal(api.formatBRL(189000), 'R$ 1.890,00');
  assert.equal(api.formatBRL(5), 'R$ 0,05');
  assert.equal(api.durationLabel(12), '12 dias');
});
