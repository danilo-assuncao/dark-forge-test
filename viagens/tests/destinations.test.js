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
  assert.match(html, /src="app\.js"/);
  for (const id of ['catalog', 'filter-search', 'filter-category', 'filter-duration']) {
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

test('formatBRL and durationLabel edge cases', () => {
  assert.equal(api.formatBRL(0), 'R$ 0,00');
  assert.equal(api.formatBRL(100), 'R$ 1,00');
  assert.equal(api.formatBRL(100000000), 'R$ 1.000.000,00');
  assert.equal(api.formatBRL(-250), '-R$ 2,50');
  assert.equal(api.formatBRL(1234.6), 'R$ 12,35');
  assert.equal(api.formatBRL(undefined), 'Sob consulta');
  assert.equal(api.formatBRL(NaN), 'Sob consulta');
  assert.equal(api.durationLabel(5), '5 dias');
});

test('filterDestinations and byCategory boundaries', () => {
  assert.equal(api.filterDestinations({ category: '', duration: '' }).length, api.DESTINATIONS.length);
  assert.deepEqual(api.filterDestinations({ category: 'Nope' }), []);
  assert.deepEqual(api.byCategory('Nope'), []);
  assert.equal(api.filterDestinations({ category: 'Internacional' }).length, api.byCategory('Internacional').length);
  const d3 = api.filterDestinations({ duration: 3 });
  assert.ok(d3.length > 0 && d3.every((d) => d.durations.includes(3)));
  assert.equal(d3.length, api.DESTINATIONS.filter((d) => d.durations.includes(3)).length);
});

test('filterDestinations searches accent-insensitively across name, climate and inclusions', () => {
  assert.deepEqual(api.filterDestinations({ query: 'GRAMADO' }).map((d) => d.id), ['gramado']);
  assert.ok(api.filterDestinations({ query: 'jangada' }).some((d) => d.id === 'porto-de-galinhas'));
  assert.deepEqual(api.filterDestinations({ query: 'zzz' }), []);
  assert.deepEqual(api.filterDestinations({ query: 'serra', category: 'Praias' }), []);
  assert.equal(api.normalize('  Amazônia  '), 'amazonia');
});
