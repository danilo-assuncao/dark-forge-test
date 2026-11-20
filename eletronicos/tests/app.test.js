const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { CATALOG, filterCatalog, checkCompatibility, buildTotalCents, findPart, formatBRL } = require('../app');

const p = (id) => findPart(id);
const goodBuild = () => ({ cpu: p('cpu-r5-5600'), motherboard: p('mb-b550'), ram: p('ram-d4-16'), gpu: p('gpu-rtx4060'), psu: p('psu-500') });

test('filter by category', () => {
    const r = filterCatalog(CATALOG, { category: 'gpu' });
    assert.ok(r.length > 0 && r.every((x) => x.category === 'gpu'));
});

test('filter by query ignores case and accents', () => {
    const r = filterCatalog(CATALOG, { query: 'PLACA-MAE' });
    assert.ok(r.length >= 4 && r.every((x) => x.category === 'motherboard'));
});

test('filter by max price and combined criteria', () => {
    const r = filterCatalog(CATALOG, { category: 'cpu', maxPriceCents: 75000 });
    assert.deepStrictEqual(r.map((x) => x.id).sort(), ['cpu-i5-12400', 'cpu-r5-5600']);
    assert.strictEqual(filterCatalog(CATALOG, {}).length, CATALOG.length);
});

test('compatible build has no alerts', () => {
    assert.deepStrictEqual(checkCompatibility(goodBuild()).alerts, []);
});

test('socket mismatch raises error', () => {
    const b = { ...goodBuild(), cpu: p('cpu-i5-12400') };
    const { alerts } = checkCompatibility(b);
    assert.ok(alerts.some((a) => a.level === 'error' && /Soquete/.test(a.message)));
});

test('RAM type mismatch raises error', () => {
    const b = { ...goodBuild(), ram: p('ram-d5-16') };
    assert.ok(checkCompatibility(b).alerts.some((a) => /Memória incompatível/.test(a.message)));
});

test('insufficient PSU raises error', () => {
    const b = { ...goodBuild(), gpu: p('gpu-rtx4080') };
    const r = checkCompatibility(b);
    assert.ok(r.alerts.some((a) => /Fonte insuficiente/.test(a.message)));
    assert.ok(r.requiredWatts > 500);
});

test('incomplete build warns about missing parts', () => {
    const { alerts } = checkCompatibility({ cpu: p('cpu-r5-5600') });
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0].level, 'warning');
    assert.ok(alerts[0].message.includes('Placa-mãe'));
});

test('build total sums selected parts', () => {
    assert.strictEqual(buildTotalCents(goodBuild()), 69900 + 69900 + 22900 + 189900 + 29900);
    assert.strictEqual(buildTotalCents({}), 0);
});

test('catalog is well-formed with unique ids and integer prices', () => {
    assert.strictEqual(new Set(CATALOG.map((c) => c.id)).size, CATALOG.length);
    assert.ok(CATALOG.every((c) => Number.isInteger(c.priceCents) && c.priceCents > 0));
    assert.match(formatBRL(1000), /10,00/);
});

test('cart integration: PIX discount and coupon on a build', () => {
    const { Cart } = require('../cart');
    const cart = new Cart(null);
    const b = goodBuild();
    for (const k of Object.keys(b)) cart.addItem(b[k].id, b[k].name, b[k].priceCents, 1);
    cart.applyCoupon('dantech10');
    const t = cart.totals();
    assert.strictEqual(t.totalCents, t.subtotalCents - t.couponDiscountCents);
    assert.ok(t.pixTotalCents < t.totalCents);
});

test('site is light-only with no dark mode', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'styles.css'), 'utf8');
    assert.match(css, /color-scheme:\s*only light\s*;/);
    for (const f of ['styles.css', 'index.html', 'app.js']) {
        const s = fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
        assert.doesNotMatch(s, /prefers-color-scheme|data-theme|theme-toggle/);
    }
});

test('index.html wires app and cart scripts', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    assert.match(html, /src="cart\.js"/);
    assert.match(html, /src="app\.js"/);
});
