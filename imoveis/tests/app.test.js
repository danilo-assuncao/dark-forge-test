'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const A = require('../app.js');
const L = require('../listings.js');
const V = require('../visits.js');

test('buildFilters converts reais to cents and ignores blanks', () => {
  const f = A.buildFilters({ type: 'casa', maxPrice: '1500000', bedrooms: '', q: 'vila' });
  assert.equal(f.maxPrice, 150000000);
  assert.equal(f.minBedrooms, undefined);
  assert.equal(f.type, 'casa');
});

test('search by type and modality', () => {
  const r = A.search({ type: 'studio', modality: 'aluguel' });
  assert.ok(r.length > 0);
  assert.ok(r.every((l) => l.type === 'studio' && l.modality === 'aluguel'));
  assert.equal(A.search({}).length, L.LISTINGS.length);
});

test('simulateListing runs SAC and Price for sale listings', () => {
  const res = A.simulateListing(L.byId('apt-002'), { downPercent: '20', annualRate: '10.5', years: '30' });
  assert.equal(res.ok, true);
  assert.equal(res.result.months, 360);
  assert.equal(res.result.financed, 82000000 - 16400000);
  assert.ok(res.result.sac.first > res.result.sac.last);
  assert.ok(Math.abs(res.result.price.first - res.result.price.last) < 1000);
  assert.equal(A.simulationRows(res.result).length, 6);
});

test('simulateListing rejects rentals and invalid inputs without throwing', () => {
  assert.equal(A.simulateListing(L.byId('apt-003'), { downPercent: 20, annualRate: 10, years: 10 }).ok, false);
  const sale = L.byId('apt-001');
  for (const bad of [
    { downPercent: '', annualRate: 10, years: 10 },
    { downPercent: 120, annualRate: 10, years: 10 },
    { downPercent: 20, annualRate: -1, years: 10 },
    { downPercent: 20, annualRate: 10, years: 0 },
    { downPercent: 20, annualRate: 10, years: 51 },
    { downPercent: 20, annualRate: 10, years: 2.5 },
  ]) assert.equal(A.simulateListing(sale, bad).ok, false, JSON.stringify(bad));
});

test('simulateListing supports 100% down payment', () => {
  const res = A.simulateListing(L.byId('apt-001'), { downPercent: 100, annualRate: 10, years: 5 });
  assert.equal(res.ok, true);
  assert.equal(res.result.financed, 0);
});

test('comparisonRows flags best value within a modality', () => {
  const { rows, table } = A.comparisonRows([L.byId('apt-001'), L.byId('apt-002')]);
  assert.equal(rows.length, 2);
  const ppm = table.find((r) => r.label === 'Preço por m²');
  assert.equal(ppm.cells.filter((c) => c.best).length, 1);
  assert.equal(A.comparisonRows([]).table[0].cells.length, 0);
});

test('visitMessage reports protocol and first error', () => {
  const NOW = new Date(2026, 2, 2, 10, 0, 0);
  const s = V.createScheduler({ now: () => NOW });
  const contact = { name: 'Ana Souza', email: 'ana@example.com', phone: '(11) 98765-4321' };
  const ok = A.visitMessage(s.schedule({ listingId: 'apt-001', mode: 'presencial', date: '2026-03-03', shift: 'manha', contact }));
  assert.equal(ok.ok, true);
  assert.match(ok.text, /IMOB-0001/);
  const bad = A.visitMessage(s.schedule({ listingId: 'apt-001', mode: 'presencial', date: '2026-03-03', shift: 'manha', contact: { name: 'A' } }));
  assert.equal(bad.ok, false);
  assert.ok(bad.text.length > 0);
});

test('styles are light-only and the page loads every script and uses no innerHTML', () => {
  const dir = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
  assert.match(css, /color-scheme:\s*only light;/);
  assert.doesNotMatch(css, /prefers-color-scheme/);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  for (const s of ['listings', 'mortgage', 'compare', 'visits', 'proposal', 'app']) assert.ok(html.includes(`src="${s}.js"`), s);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, 'app.js'), 'utf8'), /innerHTML/);
});
