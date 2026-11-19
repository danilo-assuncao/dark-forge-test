/* Cart state tests: cart.js runs in a vm context with a fake localStorage. */
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const productsJs = fs.readFileSync(path.join(ROOT, 'products.js'), 'utf8');
const cartJs = fs.readFileSync(path.join(ROOT, 'cart.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

function fakeStorage(initial) {
  const data = Object.assign({}, initial);
  return {
    data,
    getItem(k) { return k in data ? data[k] : null; },
    setItem(k, v) { data[k] = String(v); },
  };
}

function load(storage, win) {
  const ctx = { window: win || { localStorage: storage } };
  vm.createContext(ctx);
  vm.runInContext(productsJs, ctx);
  vm.runInContext(cartJs, ctx);
  return ctx.window.DanCart;
}

test('add merges quantities per product and size, and counts items', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.count(), 0);
  assert.ok(cart.add('file-parmegiana', 1, 'Individual'));
  assert.ok(cart.add('file-parmegiana', 2, 'Individual'));
  assert.ok(cart.add('file-parmegiana', 1, 'Duplo'));
  assert.ok(cart.add('frango-grelhado', 1, 'Familia'));
  assert.equal(cart.count(), 5);
  assert.equal(cart.lines().length, 3);
  assert.deepEqual(Array.from(cart.lines().map(function (l) { return l.size; })), ['Individual', 'Duplo', 'Familia']);
});

test('unknown products, sizes and invalid quantities are rejected', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.add('nope', 1, 'Individual'), false);
  assert.equal(cart.add('file-parmegiana', 1), false, 'size is required');
  assert.equal(cart.add('file-parmegiana', 1, 'XXL'), false);
  assert.equal(cart.add('file-parmegiana', 0, 'Individual'), false);
  assert.equal(cart.add('file-parmegiana', -3, 'Individual'), false);
  assert.equal(cart.add('file-parmegiana', NaN, 'Individual'), false);
  assert.equal(cart.count(), 0);
  assert.equal(cart.add('cap', 1, 'Tamanho \u00fanico'), false, 'removed product');
  assert.equal(cart.add('file-parmegiana', 1, 'Tamanho \u00fanico'), false, 'one-size sentinel is not a size');
  assert.equal(cart.count(), 0);
  assert.ok(cart.add('frango-grelhado', 1, 'Familia'));
});

test('total is computed in cents from quantities', function () {
  const cart = load(fakeStorage());
  cart.add('frango-grelhado', 2, 'Individual'); // 3290 * 2
  cart.add('file-parmegiana', 1, 'Individual'); // 3990
  assert.equal(cart.totalCents(), 3290 * 2 + 3990);
  cart.setQty('frango-grelhado', 'Individual', 1);
  assert.equal(cart.totalCents(), 3290 + 3990);
});

test('setQty changes, removes below 1 and caps at the maximum', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 1, 'Individual');
  cart.setQty('file-parmegiana', 'Individual', 5);
  assert.equal(cart.count(), 5);
  cart.setQty('file-parmegiana', 'Individual', 1000);
  assert.equal(cart.count(), cart.MAX_QTY);
  cart.setQty('file-parmegiana', 'Individual', 0);
  assert.equal(cart.count(), 0);
  assert.equal(cart.setQty('file-parmegiana', 'Individual', 2), false);
});

test('remove deletes one size line and clear empties the cart', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 1, 'Individual');
  cart.add('file-parmegiana', 1, 'Duplo');
  cart.add('frango-grelhado', 1, 'Individual');
  assert.ok(cart.remove('file-parmegiana', 'Individual'));
  assert.equal(cart.remove('file-parmegiana', 'Individual'), false);
  assert.equal(cart.lines().length, 2);
  cart.clear();
  assert.equal(cart.count(), 0);
});

test('the cart persists across reloads via storage', function () {
  const storage = fakeStorage();
  const first = load(storage);
  first.add('file-parmegiana', 3, 'Individual');
  first.add('frango-grelhado', 1, 'Duplo');
  const second = load(storage);
  assert.equal(second.count(), 4);
  assert.equal(second.totalCents(), 3990 * 3 + 3290);
  second.remove('file-parmegiana', 'Individual');
  assert.equal(load(storage).count(), 1);
});

test('corrupt or stale stored data is ignored safely', function () {
  assert.equal(load(fakeStorage({ 'dan-cart': '{not json' })).count(), 0);
  assert.equal(load(fakeStorage({ 'dan-cart': '{"a":1}' })).count(), 0);
  const stored = JSON.stringify([
    { id: 'ghost', size: 'Individual', qty: 2 }, { id: 'file-parmegiana', size: 'Individual', qty: 'x' }, null,
    { id: 'file-parmegiana', qty: 4 }, { id: 'file-parmegiana', size: 'XXL', qty: 4 },
    { id: 'file-parmegiana', size: 'Individual', qty: 2 }, { id: 'file-parmegiana', size: 'Individual', qty: 5 },
  ]);
  const cart = load(fakeStorage({ 'dan-cart': stored }));
  assert.equal(cart.count(), 2);
});

test('works without storage and listeners fire on change', function () {
  const cart = load(null);
  let calls = 0;
  cart.onChange(function () { calls++; });
  cart.add('file-parmegiana', 1, 'Individual');
  cart.setQty('file-parmegiana', 'Individual', 2);
  cart.remove('file-parmegiana', 'Individual');
  assert.equal(calls, 3);
});

test('index.html has a header cart link with a counter and loads cart.js before script.js', function () {
  assert.match(html, /href="#\/cart"[^>]*>Orçamento \(<span id="cart-count">0<\/span>\)/);
  assert.ok(html.indexOf('cart.js') > html.indexOf('products.js'));
  assert.ok(html.indexOf('cart.js') < html.indexOf('script.js'));
});

test('add caps merged quantity at the maximum and reports no change when capped', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 98, 'Individual');
  assert.ok(cart.add('file-parmegiana', 5, 'Individual'));
  assert.equal(cart.count(), 99);
  assert.equal(cart.add('file-parmegiana', 1, 'Individual'), false);
  assert.ok(cart.add('file-parmegiana', 1, 'Familia'), 'another size is a separate line');
});

test('fractional quantities are floored and stored quantities are capped on load', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 1.5, 'Individual');
  assert.equal(cart.count(), 1);
  const big = load(fakeStorage({ 'dan-cart': JSON.stringify([{ id: 'file-parmegiana', size: 'Individual', qty: 500 }]) }));
  assert.equal(big.count(), 99);
});

test('storage failures keep the cart working in memory', function () {
  const throwing = {
    getItem() { throw new Error('blocked'); },
    setItem() { throw new Error('quota'); },
  };
  const cart = load(throwing);
  assert.ok(cart.add('file-parmegiana', 2, 'Individual'));
  assert.equal(cart.count(), 2);
  const win = {};
  Object.defineProperty(win, 'localStorage', { get() { throw new Error('denied'); } });
  const cart2 = load(null, win);
  assert.ok(cart2.add('file-parmegiana', 1, 'Individual'));
  assert.equal(cart2.count(), 1);
});

test('reload re-reads storage and notifies listeners', function () {
  const storage = fakeStorage();
  const cart = load(storage);
  let calls = 0;
  cart.onChange(function () { calls++; });
  storage.setItem('dan-cart', JSON.stringify([{ id: 'frango-grelhado', size: 'Individual', qty: 2 }]));
  cart.reload();
  assert.equal(calls, 1);
  assert.equal(cart.count(), 2);
});

test('coupons: percent discount, case-insensitive codes, invalid codes and removal', function () {
  const cart = load(fakeStorage());
  cart.add('frango-grelhado', 1, 'Individual'); // 3290
  assert.deepEqual(JSON.parse(JSON.stringify(cart.applyCoupon('nope'))), { ok: false, message: 'This coupon is not valid.' });
  assert.equal(cart.applyCoupon('  ').ok, false);
  assert.equal(cart.coupon(), null);
  assert.equal(cart.applyCoupon(' dan10 ').ok, true);
  assert.equal(cart.coupon().code, 'DAN10');
  assert.equal(cart.subtotalCents(), 3290);
  assert.equal(cart.discountCents(), 329);
  assert.equal(cart.totalCents(), 2961);
  assert.ok(cart.removeCoupon());
  assert.equal(cart.removeCoupon(), false);
  assert.equal(cart.totalCents(), 3290);
});

test('fixed coupon needs its minimum subtotal and stops applying when the cart shrinks', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 6, 'Individual'); // 23940
  const refused = cart.applyCoupon('DAN50');
  assert.equal(refused.ok, false);
  assert.match(refused.message, /R\$ 250,00/);
  cart.add('frango-grelhado', 1, 'Individual'); // 23940 + 3290 = 27230
  assert.ok(cart.applyCoupon('DAN50').ok);
  assert.equal(cart.discountCents(), 5000);
  assert.equal(cart.totalCents(), 27230 - 5000);
  cart.remove('frango-grelhado', 'Individual'); // 23940 < minimum
  assert.equal(cart.discountCents(), 0);
  assert.equal(cart.totalCents(), 23940);
});

test('the coupon persists with the cart, is dropped when invalid and cleared with the cart', function () {
  const storage = fakeStorage();
  const first = load(storage);
  first.add('frango-grelhado', 1, 'Individual');
  first.applyCoupon('DAN10');
  assert.equal(load(storage).coupon().code, 'DAN10');
  assert.equal(load(fakeStorage({ 'dan-coupon': 'HACK', 'dan-cart': storage.data['dan-cart'] })).coupon(), null);
  first.clear();
  assert.equal(first.coupon(), null);
  assert.equal(load(storage).coupon(), null);
  assert.equal(load(storage).discountCents(), 0);
});

test('a coupon on an empty cart is stored but discounts nothing', function () {
  const cart = load(fakeStorage());
  assert.ok(cart.applyCoupon('DAN10').ok);
  assert.equal(cart.discountCents(), 0);
  assert.equal(cart.totalCents(), 0);
});

test('a fixed coupon reactivates when the subtotal returns to its minimum', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 6, 'Individual'); // 23940
  cart.add('pudim-leite', 1, 'Individual'); // 25430
  cart.applyCoupon('DAN50');
  cart.remove('pudim-leite', 'Individual'); // 23940 < 25000
  assert.equal(cart.discountCents(), 0);
  assert.equal(cart.coupon().code, 'DAN50');
  cart.add('pudim-leite', 1, 'Individual');
  assert.equal(cart.discountCents(), 5000);
});

test('same service in different portes yields distinct lines and the same porte increments', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 1, 'Individual');
  cart.add('file-parmegiana', 1, 'Duplo');
  cart.add('file-parmegiana', 1, 'Individual');
  const lines = cart.lines();
  assert.equal(lines.length, 2);
  assert.equal(lines[0].qty, 2);
  assert.equal(lines[1].qty, 1);
});

test('food and thermal packaging split sums to the subtotal and persists across reloads', function () {
  const storage = fakeStorage();
  const cart = load(storage);
  cart.add('file-parmegiana', 2, 'Individual'); // packaging 300 each
  cart.add('pudim-leite', 1, 'Familia'); // packaging 700
  assert.equal(cart.packagingCents(), 300 * 2 + 700);
  assert.equal(cart.foodCents(), (3990 - 300) * 2 + (1490 - 700));
  assert.equal(cart.foodCents() + cart.packagingCents(), cart.subtotalCents());
  const lineSum = cart.lines().reduce(function (n, l) { return n + l.foodCents + l.packagingCents; }, 0);
  assert.equal(lineSum, cart.subtotalCents());
  assert.equal(cart.laborCents(), cart.foodCents(), 'legacy alias');
  assert.equal(cart.partsCents(), cart.packagingCents(), 'legacy alias');
  assert.equal(JSON.parse(storage.data['dan-cart']).length, 2);
  assert.equal(load(storage).packagingCents(), cart.packagingCents());
});

test('notes are optional, trimmed, capped, merged per line and persisted', function () {
  const storage = fakeStorage();
  const cart = load(storage);
  cart.add('file-parmegiana', 1, 'Individual');
  assert.equal(cart.lines()[0].note, '');
  cart.add('file-parmegiana', 1, 'Individual', '  sem   cebola ');
  assert.equal(cart.lines()[0].note, 'sem cebola');
  cart.add('file-parmegiana', 1, 'Individual'); // keeps the note
  assert.equal(cart.lines()[0].note, 'sem cebola');
  assert.equal(cart.lines()[0].qty, 3);
  cart.add('file-parmegiana', 1, 'Duplo', 'ao ponto');
  assert.equal(cart.lines().length, 2, 'note does not split lines');
  assert.equal(load(storage).lines()[1].note, 'ao ponto');
  assert.ok(cart.setNote('file-parmegiana', 'Duplo', 'x'.repeat(500)));
  assert.equal(cart.lines()[1].note.length, 140);
  assert.equal(load(storage).lines()[1].note, 'x'.repeat(140), 'setNote persists');
  assert.ok(cart.setNote('file-parmegiana', 'Duplo', ''));
  assert.equal(cart.lines()[1].note, '');
  assert.equal(load(storage).lines()[1].note, '', 'clearing persists');
  assert.equal(cart.setNote('file-parmegiana', 'Familia', 'a'), false);
  assert.equal(cart.setNote('ghost', 'Duplo', 'a'), false);
});

test('DAN10 and DAN50 discounts apply to the quote and invalid coupons are reported', function () {
  const cart = load(fakeStorage());
  cart.add('feijoada-completa', 6, 'Familia'); // 27540
  assert.ok(cart.applyCoupon('DAN10').ok);
  assert.equal(cart.discountCents(), 2754);
  assert.ok(cart.applyCoupon('dan50').ok);
  assert.equal(cart.discountCents(), 5000);
  assert.equal(cart.totalCents(), 22540);
  assert.equal(cart.applyCoupon('DAN99').ok, false);
  assert.equal(cart.coupon().code, 'DAN50', 'invalid code keeps the applied coupon');
});

test('food + packaging equals the unit price for every dish and portion', function () {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(productsJs, ctx);
  const products = vm.runInContext('window.DanProducts.all()', ctx);
  products.forEach(function (p) {
    p.sizes.forEach(function (size) {
      const cart = load(fakeStorage());
      cart.add(p.id, 1, size);
      assert.ok(cart.packagingCents() <= p.priceCents, p.id + size);
      assert.ok(cart.foodCents() >= 0, p.id + size);
      assert.equal(cart.foodCents() + cart.packagingCents(), p.priceCents, p.id + size);
    });
  });
});

test('food and packaging are zero on an empty cart and ignore coupon discounts', function () {
  const cart = load(fakeStorage());
  assert.equal(cart.foodCents(), 0);
  assert.equal(cart.packagingCents(), 0);
  cart.add('frango-grelhado', 1, 'Individual');
  cart.applyCoupon('DAN10');
  assert.ok(cart.discountCents() > 0);
  assert.equal(cart.packagingCents() + cart.foodCents(), cart.subtotalCents());
  assert.notEqual(cart.packagingCents() + cart.foodCents(), cart.totalCents());
});

test('notes loaded from storage are sanitised (missing, non-string, padded and over-long)', function () {
  const padded = '  ' + 'a  b '.repeat(100) + '  ';
  const stored = JSON.stringify([
    { id: 'file-parmegiana', size: 'Individual', qty: 1 },
    { id: 'file-parmegiana', size: 'Duplo', qty: 1, note: 123 },
    { id: 'file-parmegiana', size: 'Familia', qty: 1, note: padded },
  ]);
  const lines = load(fakeStorage({ 'dan-cart': stored })).lines();
  assert.equal(lines[0].note, '');
  assert.equal(lines[1].note, '');
  assert.equal(lines[2].note, ('a b '.repeat(35)).trim());
  assert.equal(lines[2].note.length, 139, 'no trailing space left after the cap');
});

test('sanitising a note is idempotent and never splits an emoji', function () {
  const storage = fakeStorage();
  const cart = load(storage);
  cart.add('file-parmegiana', 1, 'Individual', 'a b '.repeat(100));
  const once = cart.lines()[0].note;
  assert.equal(load(storage).lines()[0].note, once, 'stable across reload');
  cart.setNote('file-parmegiana', 'Individual', 'x'.repeat(139) + '\u{1F336}\u{1F336}');
  const note = cart.lines()[0].note;
  assert.equal(Array.from(note).length, 140);
  assert.equal(Array.from(note)[139], '\u{1F336}');
  assert.equal(load(storage).lines()[0].note, note);
});

test('non-string notes are ignored by add() and setNote() and blank setNote clears', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 1, 'Individual', 123);
  assert.equal(cart.lines()[0].note, '');
  cart.add('file-parmegiana', 1, 'Individual', 'sem sal');
  cart.add('file-parmegiana', 1, 'Individual', 123);
  assert.equal(cart.lines()[0].note, 'sem sal', 'non-string keeps the existing note');
  assert.ok(cart.setNote('file-parmegiana', 'Individual', null));
  assert.equal(cart.lines()[0].note, '');
  cart.setNote('file-parmegiana', 'Individual', 'a');
  assert.ok(cart.setNote('file-parmegiana', 'Individual', '   '));
  assert.equal(cart.lines()[0].note, '');
  cart.setNote('file-parmegiana', 'Individual', 'b');
  cart.setNote('file-parmegiana', 'Individual', undefined);
  assert.equal(cart.lines()[0].note, '');
});

test('add() normalises and caps notes, keeps the old note for blank input and ignores notes at the qty cap', function () {
  const cart = load(fakeStorage());
  cart.add('file-parmegiana', 1, 'Individual', 'x'.repeat(500));
  assert.equal(cart.lines()[0].note.length, 140);
  cart.add('file-parmegiana', 1, 'Individual', 'y'.repeat(500));
  assert.equal(cart.lines()[0].note, 'y'.repeat(140), 'merge path caps too');
  cart.add('file-parmegiana', 1, 'Individual', '   ');
  assert.equal(cart.lines()[0].note, 'y'.repeat(140), 'blank note keeps the existing one');
  cart.setQty('file-parmegiana', 'Individual', cart.MAX_QTY);
  assert.equal(cart.add('file-parmegiana', 1, 'Individual', 'novo'), false);
  assert.equal(cart.lines()[0].note, 'y'.repeat(140), 'a capped add changes nothing, note included');
});

test('notes are kept as inert text (never interpreted as markup)', function () {
  const storage = fakeStorage();
  const cart = load(storage);
  const evil = '<img src=x onerror=alert(1)>';
  cart.add('file-parmegiana', 1, 'Individual', evil);
  assert.equal(cart.lines()[0].note, evil);
  assert.equal(load(storage).lines()[0].note, evil);
});

test('packaging is clamped to the price and unknown portions use the default', function () {
  const catalogue = {
    cheap: { id: 'cheap', priceCents: 150, sizes: ['Individual'] },
    odd: { id: 'odd', priceCents: 2000, sizes: ['Mini'] },
  };
  const ctx = { window: { localStorage: fakeStorage(), DanProducts: { find(id) { return catalogue[id] || null; } } } };
  vm.createContext(ctx);
  vm.runInContext(cartJs, ctx);
  const cart = ctx.window.DanCart;
  assert.ok(cart.add('cheap', 1, 'Individual'));
  assert.equal(cart.packagingCents(), 150);
  assert.equal(cart.foodCents(), 0);
  cart.clear();
  assert.ok(cart.add('odd', 1, 'Mini'));
  assert.equal(cart.packagingCents(), 300);
  assert.equal(cart.foodCents(), 1700);
});

test('packaging per portion is pinned to literal values', function () {
  const expected = { Individual: 300, Duplo: 450, Familia: 700 };
  Object.keys(expected).forEach(function (size) {
    const cart = load(fakeStorage());
    assert.ok(cart.add('file-parmegiana', 1, size));
    assert.equal(cart.packagingCents(), expected[size], size);
  });
});
