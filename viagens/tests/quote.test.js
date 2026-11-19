'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const q = require('../quote.js');
const dest = require('../destinations.js');
const app = require('../app.js');

function memStorage(init) {
  const m = Object.assign({}, init);
  return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, m };
}

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

test('compute totals with insurance per passenger and DANTRIP10', () => {
  let s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 2, insurance: true });
  s = q.addItem(s, { id: 'lisboa', duration: 7, travelers: 1, insurance: false });
  let r = q.compute(s);
  assert.equal(r.lines[0].insuranceCents, 2 * q.INSURANCE_CENTS);
  assert.equal(r.subtotalCents, 2 * 179000 + 2 * q.INSURANCE_CENTS + 599000);
  assert.equal(r.discountCents, 0);
  s = q.setCoupon(s, ' dantrip10 ');
  assert.equal(s.coupon, 'DANTRIP10');
  r = q.compute(s);
  assert.equal(r.discountCents, Math.round(r.subtotalCents * 0.1));
  assert.equal(r.totalCents, r.subtotalCents - r.discountCents);
  assert.equal(q.setCoupon(s, 'OUTRO').coupon, '');
});

test('save/load round-trips under dan-viagens-quote and survives bad data', () => {
  const st = memStorage();
  let s = q.setCoupon(q.addItem(q.emptyState(), { id: 'gramado', duration: 12, travelers: 3, insurance: true }), 'DANTRIP10');
  assert.ok(q.save(s, st));
  assert.ok('dan-viagens-quote' in st.m);
  assert.deepEqual(q.load(st), s);
  assert.deepEqual(q.load(memStorage({ 'dan-viagens-quote': '{bad' })), q.emptyState());
  assert.deepEqual(q.load(memStorage({ 'dan-viagens-quote': '{"items":[{"id":"x"}],"coupon":"zzz"}' })), q.emptyState());
});

test('updateItem and removeItem', () => {
  let s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 });
  s = q.updateItem(s, 'gramado', 3, { travelers: 4, insurance: true });
  assert.equal(s.items[0].travelers, 4);
  assert.equal(s.items[0].insurance, true);
  assert.equal(q.removeItem(s, 'gramado', 3).items.length, 0);
});

test('renderQuote shows empty state and totals', () => {
  const node = (tag) => ({ tag, children: [], _text: '', className: '', attrs: {},
    get textContent() { return this._text; }, set textContent(v) { this._text = v; if (v === '') this.children = []; },
    appendChild(c) { this.children.push(c); return c; }, setAttribute() {}, addEventListener() {} });
  global.document = { createElement: node, createTextNode: (t) => ({ tag: '#text', children: [], _text: t }) };
  const texts = (n, out = []) => { if (n._text) out.push(n._text); n.children.forEach((c) => texts(c, out)); return out; };
  const box = node('section');
  app.renderQuote(box, q.emptyState(), {});
  assert.ok(texts(box).includes('Sua cotacao esta vazia.'));
  const s = q.setCoupon(q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 }), 'DANTRIP10');
  app.renderQuote(box, s, { onUpdate() {}, onRemove() {}, onCoupon() {} });
  assert.ok(texts(box).includes('Total: ' + dest.formatBRL(179000 - 17900)));
  delete global.document;
});
