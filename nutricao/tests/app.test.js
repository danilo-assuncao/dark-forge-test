'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const app = require('../app.js');
const cartLib = require('../cart.js');
const catalog = require('../products.js');

const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('styles.css is light only with no dark mode', () => {
  const css = read('styles.css');
  assert.match(css, /color-scheme:\s*only light/);
  assert.doesNotMatch(css, /prefers-color-scheme\s*:\s*dark/);
});

test('index.html loads all modules before app.js', () => {
  const html = read('index.html');
  const order = ['products.js', 'calculator.js', 'cart.js', 'shipping.js', 'app.js'].map((s) => html.indexOf('src="' + s + '"'));
  assert.ok(order.every((i) => i >= 0));
  assert.deepEqual(order, order.slice().sort((a, b) => a - b));
  assert.match(html, /styles\.css/);
});

test('formatBRL formats cents and escapes html', () => {
  assert.equal(app.formatBRL(8990), 'R$ 89,90');
  assert.equal(app.formatBRL(123456789), 'R$ 1.234.567,89');
  assert.equal(app.formatBRL(5), 'R$ 0,05');
  assert.equal(app.esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('filterProducts combines goal, category, presentation and query', () => {
  assert.equal(app.filterProducts().length, catalog.products.length);
  const g = app.filterProducts({ goal: 'Emagrecimento' });
  assert.ok(g.length && g.every((p) => p.goals.includes('Emagrecimento')));
  const c = app.filterProducts({ category: 'Proteinas', presentation: '900g' });
  assert.deepEqual(c.map((p) => p.id), ['whey-concentrado', 'whey-isolado']);
  assert.deepEqual(app.filterProducts({ query: ' ISOLADO ' }).map((p) => p.id), ['whey-isolado']);
  assert.deepEqual(app.filterProducts({ goal: 'Saude', category: 'Planos Alimentares' }).map((p) => p.id), ['plano-saude']);
  assert.equal(app.filterProducts({ query: 'zzz' }).length, 0);
});

test('runCalculator returns results with suggestions or a clear error', () => {
  const ok = app.runCalculator({ weightKg: '80', heightCm: '180', age: '30', sex: 'M', activity: 'moderado', goal: 'Hipertrofia' });
  assert.equal(ok.ok, true);
  assert.equal(ok.result.bmi, 24.7);
  assert.ok(ok.result.suggestions.length > 0);
  const comma = app.runCalculator({ weightKg: '80,5', heightCm: '180', age: '30', sex: 'F', goal: 'Saude' });
  assert.equal(comma.ok, true);
  for (const bad of [{}, { weightKg: '', heightCm: '180', age: '30', sex: 'M', goal: 'Saude' },
    { weightKg: '80', heightCm: '180', age: '10', sex: 'M', goal: 'Saude' },
    { weightKg: '80', heightCm: '180', age: '30', sex: 'M', goal: 'Nope' }]) {
    const r = app.runCalculator(bad);
    assert.equal(r.ok, false);
    assert.ok(r.error);
  }
});

test('quick add from calculator suggestions lands in the cart', () => {
  const store = new Map();
  const cart = cartLib.create({
    storage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) },
    catalog
  });
  const r = app.runCalculator({ weightKg: '70', heightCm: '175', age: '28', sex: 'M', activity: 'leve', goal: 'Emagrecimento' });
  const p = r.result.suggestions[0];
  assert.equal(cart.add(p.id, app.defaultPresentation(p), 1), true);
  assert.equal(cart.totals().count, 1);
});

test('checkoutSummary adds shipping by CEP and rejects bad input', () => {
  const totals = { totalCents: 10000 };
  const s = app.checkoutSummary(totals, { cep: '01001-000', method: 'standard', teleconsult: true });
  assert.equal(s.ok, true);
  assert.equal(s.shippingCents, 1490);
  assert.equal(s.totalCents, 11490);
  assert.equal(s.teleconsult, true);
  assert.equal(app.checkoutSummary({ totalCents: 30000 }, { cep: '01001000' }).totalCents, 30000);
  assert.equal(app.checkoutSummary(totals, { cep: '123' }).error, 'invalid-cep');
  assert.equal(app.checkoutSummary(totals, { cep: '70000-000', method: 'express' }).error, 'express-unavailable');
  assert.ok(app.ERRORS['express-unavailable']);
});
