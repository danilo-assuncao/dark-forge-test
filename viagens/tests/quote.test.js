'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const q = require('../quote.js');
const dest = require('../destinations.js');
const app = require('../app.js');

const price = (id, dur) => dest.getDestination(id).priceCents[dur];

function memStorage(init) {
  const m = Object.assign({}, init);
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m };
}

// Fake DOM whose addEventListener records handlers so tests can fire them.
function node(tag) {
  return {
    tag, children: [], _text: '', className: '', attrs: {}, listeners: {}, value: '', checked: false,
    get textContent() { return this._text; },
    set textContent(v) { this._text = v; if (v === '') this.children = []; },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    fire(t) { (this.listeners[t] || []).forEach((f) => f()); }
  };
}
function withDom(fn) {
  global.document = { createElement: node, createTextNode: (t) => ({ tag: '#text', children: [], _text: t }) };
  try { return fn(); } finally { delete global.document; }
}
const texts = (n, out = []) => { if (n._text) out.push(n._text); n.children.forEach((c) => texts(c, out)); return out; };
const find = (n, pred, out = []) => { if (pred(n)) out.push(n); n.children.forEach((c) => find(c, pred, out)); return out; };
const button = (root, label) => find(root, (n) => n.tag === 'button' && n._text === label)[0];

test('addItem sanitizes, dedupes and clamps travelers', () => {
  let s = q.emptyState();
  s = q.addItem(s, { id: 'gramado', duration: 7, travelers: 2, insurance: true });
  s = q.addItem(s, { id: 'gramado', duration: 7, travelers: 99, insurance: false });
  s = q.addItem(s, { id: 'nope', duration: 7, travelers: 1 });
  s = q.addItem(s, { id: 'lisboa', duration: 3, travelers: 1 });
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].travelers, q.MAX_TRAVELERS);
  assert.equal(s.items[0].insurance, false);
});

test('clampTravelers handles boundary and garbage inputs', () => {
  const cases = [[0, 1], [-5, 1], [NaN, 1], ['abc', 1], ['', 1], [undefined, 1], ['2.7', 2], [2.9, 2],
    [1, 1], [q.MAX_TRAVELERS, q.MAX_TRAVELERS], [q.MAX_TRAVELERS + 1, q.MAX_TRAVELERS], [Infinity, 1]];
  cases.forEach(([input, expected]) => assert.equal(q.clampTravelers(input), expected, String(input)));
  let s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 });
  s = q.updateItem(s, 'gramado', 3, { travelers: 500 });
  assert.equal(s.items[0].travelers, q.MAX_TRAVELERS);
  s = q.updateItem(s, 'gramado', 3, { travelers: 0 });
  assert.equal(s.items[0].travelers, 1);
});

test('compute totals with insurance per passenger and DANTRIP10', () => {
  let s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 2, insurance: true });
  s = q.addItem(s, { id: 'lisboa', duration: 7, travelers: 1, insurance: false });
  const expectedSubtotal = 2 * price('gramado', 3) + 2 * 8900 + price('lisboa', 7);
  let r = q.compute(s);
  assert.equal(r.lines[0].insuranceCents, 17800);
  assert.equal(r.subtotalCents, expectedSubtotal);
  assert.equal(r.discountCents, 0);
  s = q.setCoupon(s, ' dantrip10 ');
  assert.equal(s.coupon, 'DANTRIP10');
  r = q.compute(s);
  // literal for the current catalog: 2*179000 + 2*8900 + 599000 = 974800 -> 10% = 97480
  assert.equal(r.subtotalCents, 974800);
  assert.equal(r.discountCents, 97480);
  assert.equal(r.totalCents, 877320);
  assert.equal(q.setCoupon(s, 'OUTRO').coupon, '');
});

test('compute on empty state is all zeros and discount rounds half-cents', () => {
  assert.deepEqual(q.compute(q.emptyState()), { lines: [], subtotalCents: 0, discountCents: 0, totalCents: 0 });
  // subtotal ending in 5 cents -> 10% has a .5 fraction; Math.round rounds up.
  const r = q.compute({ items: [], coupon: 'DANTRIP10' });
  assert.equal(r.discountCents, 0);
  const fake = { items: [{ id: 'gramado', duration: 3, travelers: 1, insurance: false }], coupon: 'DANTRIP10' };
  const orig = dest.getDestination('gramado').priceCents[3];
  dest.getDestination('gramado').priceCents[3] = 10005;
  try {
    const c = q.compute(fake);
    assert.equal(c.discountCents, 1001); // 1000.5 -> 1001
    assert.equal(c.totalCents, 10005 - 1001);
  } finally { dest.getDestination('gramado').priceCents[3] = orig; }
});

test('applyCoupon: invalid code keeps the applied coupon, empty clears, valid applies', () => {
  let s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 });
  let r = q.applyCoupon(s, 'dantrip10');
  assert.equal(r.error, false);
  assert.equal(r.state.coupon, 'DANTRIP10');
  s = r.state;
  r = q.applyCoupon(s, 'DANTRIP1');
  assert.equal(r.error, true);
  assert.equal(r.state.coupon, 'DANTRIP10');
  r = q.applyCoupon(s, '   ');
  assert.equal(r.error, false);
  assert.equal(r.state.coupon, '');
  assert.equal(q.applyCoupon(q.emptyState(), 'xx').error, true);
});

test('coupon is dropped when the bag becomes empty or is loaded without items', () => {
  let s = q.setCoupon(q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 }), 'DANTRIP10');
  s = q.removeItem(s, 'gramado', 3);
  assert.equal(s.coupon, '');
  assert.equal(q.sanitize({ items: [], coupon: 'DANTRIP10' }).coupon, '');
});

test('save/load round-trips under dan-viagens-quote and survives bad data', () => {
  const st = memStorage();
  const s = q.setCoupon(q.addItem(q.emptyState(), { id: 'gramado', duration: 12, travelers: 3, insurance: true }), 'DANTRIP10');
  assert.ok(q.save(s, st));
  assert.ok('dan-viagens-quote' in st.m);
  assert.deepEqual(q.load(st), s);
  assert.deepEqual(q.load(memStorage({ 'dan-viagens-quote': '{bad' })), q.emptyState());
  assert.deepEqual(q.load(memStorage({ 'dan-viagens-quote': '{"items":[{"id":"x"}],"coupon":"zzz"}' })), q.emptyState());
});

test('save/load failure branches: no storage, throwing setItem/getItem', () => {
  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.equal(q.save(q.emptyState(), throwing), false);
  assert.deepEqual(q.load(throwing), q.emptyState());
  // no explicit storage and no window.localStorage in Node
  assert.equal(q.save(q.emptyState()), false);
  assert.deepEqual(q.load(), q.emptyState());
});

test('sanitize tolerates malformed payloads and duplicate stored items', () => {
  [null, undefined, 'x', 42, { items: 'x' }, { items: [null, 5, 'a'] }].forEach((raw) =>
    assert.deepEqual(q.sanitize(raw), q.emptyState()));
  const dup = q.sanitize({ items: [
    { id: 'gramado', duration: 3, travelers: 2 }, { id: 'gramado', duration: 3, travelers: 5 },
    { id: 'gramado', duration: 99, travelers: 1 }] });
  assert.equal(dup.items.length, 1);
  assert.equal(dup.items[0].travelers, 2);
});

test('updateItem and removeItem', () => {
  let s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 });
  s = q.updateItem(s, 'gramado', 3, { travelers: 4, insurance: true });
  assert.equal(s.items[0].travelers, 4);
  assert.equal(s.items[0].insurance, true);
  assert.deepEqual(q.updateItem(s, 'lisboa', 7, { travelers: 3 }), s);
  assert.deepEqual(q.removeItem(s, 'lisboa', 7), s);
  assert.equal(q.removeItem(s, 'gramado', 3).items.length, 0);
});

test('renderQuote shows empty state and totals', () => withDom(() => {
  const box = node('section');
  app.renderQuote(box, q.emptyState(), {});
  assert.ok(texts(box).includes('Sua cotacao esta vazia.'));
  const s = q.setCoupon(q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 }), 'DANTRIP10');
  app.renderQuote(box, s, { onUpdate() {}, onRemove() {}, onCoupon() {} });
  assert.ok(texts(box).includes('Total: ' + dest.formatBRL(179000 - 17900)));
  assert.ok(texts(box).some((t) => t.indexOf('Cupom DANTRIP10 aplicado') === 0));
}));

test('renderQuote wires line handlers and coupon button', () => withDom(() => {
  const calls = [];
  const h = {
    onUpdate: (...a) => calls.push(['update', ...a]),
    onRemove: (...a) => calls.push(['remove', ...a]),
    onCoupon: (...a) => calls.push(['coupon', ...a])
  };
  const s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 });
  const box = node('section');
  app.renderQuote(box, s, h);
  const inputs = find(box, (n) => n.tag === 'input');
  const num = inputs.find((i) => i.type === 'number');
  const cb = inputs.find((i) => i.type === 'checkbox');
  const coupon = inputs.find((i) => i.id === 'quote-coupon');
  num.value = '3'; num.fire('change');
  cb.checked = true; cb.fire('change');
  button(box, 'Remover').fire('click');
  coupon.value = 'dantrip10'; button(box, 'Aplicar cupom').fire('click');
  assert.deepEqual(calls, [
    ['update', 'gramado', 3, { travelers: '3' }],
    ['update', 'gramado', 3, { insurance: true }],
    ['remove', 'gramado', 3],
    ['coupon', 'dantrip10']
  ]);
}));

test('renderQuote shows the coupon error only when asked and keeps it in state-driven render', () => withDom(() => {
  const s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 });
  const box = node('section');
  app.renderQuote(box, s, {});
  assert.ok(!texts(box).includes('Cupom invalido.'));
  app.renderQuote(box, s, {}, { couponError: true });
  assert.ok(texts(box).includes('Cupom invalido.'));
}));

test('renderDetail add form passes the chosen values to onAddQuote', () => withDom(() => {
  const box = node('div');
  const added = [];
  app.renderDetail(box, { id: 'gramado', duration: 7, onAddQuote: (item) => added.push(item) });
  const inputs = find(box, (n) => n.tag === 'input');
  inputs.find((i) => i.id === 'quote-travelers').value = '3';
  inputs.find((i) => i.id === 'quote-insurance').checked = true;
  button(box, 'Adicionar a cotacao').fire('click');
  assert.deepEqual(added, [{ id: 'gramado', duration: 7, travelers: '3', insurance: true }]);
  const plain = node('div');
  app.renderDetail(plain, { id: 'gramado', duration: 7 });
  assert.equal(button(plain, 'Adicionar a cotacao'), undefined);
}));
