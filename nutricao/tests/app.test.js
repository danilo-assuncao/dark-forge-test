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
  assert.match(html, /id="app"/);
  assert.match(html, /id="cart-count"/);
  for (const r of ['home', 'catalogo', 'calculadora', 'checkout']) {
    assert.ok(html.includes('data-route="' + r + '"'), r);
  }
});

test('formatBRL formats cents and escapes html', () => {
  assert.equal(app.formatBRL(8990), 'R$ 89,90');
  assert.equal(app.formatBRL(123456789), 'R$ 1.234.567,89');
  assert.equal(app.formatBRL(5), 'R$ 0,05');
  assert.equal(app.esc('<a href="x">&\'</a>'), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;');
});

test('filterProducts combines goal, category, presentation and query', () => {
  const ids = (l) => l.map((p) => p.id);
  const expected = (pred) => ids(catalog.products.filter(pred));
  assert.equal(app.filterProducts().length, catalog.products.length);
  assert.deepEqual(ids(app.filterProducts({ goal: 'Emagrecimento' })), expected((p) => p.goals.includes('Emagrecimento')));
  assert.deepEqual(ids(app.filterProducts({ category: 'Proteinas', presentation: '900g' })),
    expected((p) => p.category === 'Proteinas' && p.presentations.includes('900g')));
  const target = catalog.products[1];
  assert.deepEqual(ids(app.filterProducts({ query: ' ' + target.name.toUpperCase() + ' ' })), [target.id]);
  assert.deepEqual(ids(app.filterProducts({ goal: 'Saude', category: 'Planos Alimentares' })),
    expected((p) => p.goals.includes('Saude') && p.category === 'Planos Alimentares'));
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

test('parseHash handles routes, encoded values and malformed input', () => {
  assert.deepEqual(app.parseHash(''), { path: '/', params: {} });
  assert.deepEqual(app.parseHash('#/catalogo'), { path: '/catalogo', params: {} });
  assert.deepEqual(app.parseHash('#/catalogo?goal=' + encodeURIComponent('Sa\u00fade')), { path: '/catalogo', params: { goal: 'Sa\u00fade' } });
  assert.deepEqual(app.parseHash('#/catalogo?goal=%E0%A4%A&x').params, { goal: '%E0%A4%A', x: '' });
  assert.deepEqual(app.parseHash('#/catalogo?%E0=1&=2&a=1&a=2').params, { '%E0': '1', a: '2' });
});

test('buildOrder resolves the slot the user saw and fails without touching bad input', () => {
  const totals = { totalCents: 10000 };
  const slots = [{ date: '2030-01-01', time: '09:00', nutritionist: 'A' }, { date: '2030-01-01', time: '10:30', nutritionist: 'B' }];
  const plain = app.buildOrder(totals, { cep: '01001000', method: 'standard' }, slots, 'NUTRI-0001');
  assert.equal(plain.ok, true);
  assert.equal(plain.slot, null);
  assert.equal(plain.totalCents, 11490);
  assert.equal(plain.protocol, 'NUTRI-0001');
  const tele = app.buildOrder(totals, { cep: '01001000', method: 'express', teleconsult: true, slot: '1' }, slots, 'NUTRI-0002');
  assert.deepEqual(tele.slot, slots[1]);
  assert.equal(tele.days, 2);
  assert.equal(tele.totalCents, 12990);
  assert.equal(app.buildOrder(totals, { cep: '', method: 'standard' }, slots, 'x').error, 'invalid-cep');
});

test('checkoutSummary covers errors, express and free shipping boundary', () => {
  const free = require('../shipping.js').freeStandardCents;
  assert.equal(app.checkoutSummary({ totalCents: 100 }, { cep: '01001000', method: 'bogus' }).error, 'invalid-method');
  assert.equal(app.checkoutSummary({ totalCents: 100 }, {}).error, 'invalid-cep');
  const ex = app.checkoutSummary({ totalCents: 100 }, { cep: '01001000', method: 'express' });
  assert.equal(ex.ok, true);
  assert.equal(ex.shipping.region, 'Sudeste');
  assert.equal(ex.shipping.days, 2);
  assert.equal(app.checkoutSummary({ totalCents: free - 1 }, { cep: '01001000' }).shippingCents, 1490);
  const atFree = app.checkoutSummary({ totalCents: free }, { cep: '01001000' });
  assert.equal(atFree.shippingCents, 0);
  assert.equal(atFree.totalCents, free);
  const shipping = require('../shipping.js');
  for (const [cep, m] of [['1', 'standard'], ['01001000', 'x'], ['70000000', 'express']]) {
    const code = shipping.quote(cep, m, 0).error;
    assert.ok(app.ERRORS[code] && app.ERRORS[code].length, code);
  }
});

test('formatBRL and runCalculator boundaries', () => {
  for (const [v, out] of [[-1250, '-R$ 12,50'], [NaN, 'R$ 0,00'], [undefined, 'R$ 0,00'], [null, 'R$ 0,00'],
    [100000, 'R$ 1.000,00'], [0, 'R$ 0,00'], [99.6, 'R$ 1,00']]) {
    assert.equal(app.formatBRL(v), out);
  }
  const base = { weightKg: '80', heightCm: '180', sex: 'M', goal: 'Saude' };
  assert.equal(app.runCalculator({ ...base, age: '17' }).ok, true);
  assert.match(app.runCalculator({ ...base, age: '14' }).error, /age must be/);
  assert.match(app.runCalculator({ ...base, age: '30', weightKg: '  ' }).error, /weightKg must be/);
  assert.match(app.runCalculator({ ...base, age: '30', weightKg: 'abc' }).error, /weightKg must be/);
  assert.match(app.runCalculator({ ...base, age: '30', heightCm: undefined }).error, /heightCm must be/);
  assert.match(app.runCalculator({ ...base, age: '30', goal: 'Nope' }).error, /unknown goal/);
});

test('fromPrice, defaultPresentation and the quick-add cart line', () => {
  for (const p of catalog.products) {
    assert.equal(app.fromPrice(p), Math.min(...p.presentations.map((k) => p.priceCents[k])));
    assert.equal(app.defaultPresentation(p), p.presentations[0]);
  }
  const store = new Map();
  const cart = cartLib.create({
    storage: { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, v) }, catalog
  });
  const p = app.runCalculator({ weightKg: '70', heightCm: '175', age: '28', sex: 'M', goal: 'Emagrecimento' }).result.suggestions[0];
  const pres = app.defaultPresentation(p);
  cart.add(p.id, pres, 1);
  assert.deepEqual(cart.totals().lines, [{ id: p.id, presentation: pres, qty: 1, lineCents: p.priceCents[pres] }]);
});
