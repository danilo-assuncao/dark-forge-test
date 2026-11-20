'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const b = require('../booking.js');
const q = require('../quote.js');
const dest = require('../destinations.js');
const app = require('../app.js');

function node(tag) {
  return {
    tag, children: [], _text: '', className: '', attrs: {}, listeners: {}, value: '', checked: false, hidden: false,
    get textContent() { return this._text; },
    set textContent(v) { this._text = v; if (v === '') this.children = []; },
    appendChild(c) { this.children.push(c); return c; },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); },
    fire(t) { (this.listeners[t] || []).forEach((f) => f({ preventDefault() {} })); }
  };
}
function withDom(fn) {
  global.document = { createElement: node, createTextNode: (t) => ({ tag: '#text', children: [], _text: t }) };
  try { return fn(); } finally { delete global.document; }
}
function walk(n, out = []) { out.push(n); (n.children || []).forEach((c) => walk(c, out)); return out; }
const byClass = (root, cls) => walk(root).filter((n) => n.className && n.className.split(' ').includes(cls));

const good = [{ name: 'Maria Silva', document: '123.456.789-09' }, { name: 'Joao Souza', document: 'AB123456' }];
const state2 = () => q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 2, insurance: true });

test('seasonMonths handles ranges, wraparound and multiple ranges', () => {
  assert.deepEqual(b.seasonMonths('Junho a Agosto'), [5, 6, 7]);
  assert.deepEqual(b.seasonMonths('Setembro a Fevereiro'), [8, 9, 10, 11, 0, 1]);
  const s = b.seasonMonths('Junho a Setembro (neve) ou Dezembro a Marco');
  assert.ok(s.includes(5) && s.includes(8) && s.includes(11) && s.includes(2) && !s.includes(9));
  assert.deepEqual(b.seasonMonths('sem datas'), []);
});

test('seasonHighlights returns in-season destinations, cheapest first, limited', () => {
  const july = b.seasonHighlights(6);
  assert.ok(july.length > 0 && july.length <= 3);
  july.forEach((d) => assert.ok(b.seasonMonths(d.climate.season).includes(6)));
  const prices = july.map((d) => Math.min(...d.durations.map((n) => d.priceCents[n])));
  assert.deepEqual(prices, prices.slice().sort((x, y) => x - y));
  assert.equal(b.seasonHighlights(6, 1).length, 1);
  assert.equal(dest.DESTINATIONS.length > 0, true);
});

test('validateTraveler checks name and document', () => {
  assert.equal(b.validateTraveler(good[0]).valid, true);
  assert.equal(b.validateTraveler(good[0]).traveler.document, '12345678909');
  assert.equal(b.validateTraveler(good[1]).valid, true);
  assert.ok(b.validateTraveler({ name: 'Maria', document: '12345678909' }).errors.name);
  assert.ok(b.validateTraveler({ name: 'M1 S2', document: '12345678909' }).errors.name);
  assert.ok(b.validateTraveler({ name: 'Maria Silva', document: '123' }).errors.document);
  assert.ok(b.validateTraveler({}).errors.name);
  assert.ok(b.validateTraveler(null).errors.document);
});

test('validateBooking requires one passenger per traveler, unique docs and a boarding', () => {
  const s = state2();
  assert.equal(b.requiredTravelers(s), 2);
  assert.equal(b.validateBooking(s, { travelers: good, boarding: 'gru' }).valid, true);
  assert.ok(b.validateBooking(q.emptyState(), { travelers: good, boarding: 'gru' }).formError);
  assert.ok(b.validateBooking(s, { travelers: [good[0]], boarding: 'gru' }).formError);
  assert.ok(b.validateBooking(s, { boarding: 'gru' }).formError);
  const noBoard = b.validateBooking(s, { travelers: good, boarding: 'xx' });
  assert.equal(noBoard.valid, false);
  assert.ok(noBoard.boardingError);
  const dup = b.validateBooking(s, { travelers: [good[0], good[0]], boarding: 'gru' });
  assert.equal(dup.valid, false);
  assert.equal(dup.errors[0].document, undefined);
  assert.ok(dup.errors[1].document);
  const bad = b.validateBooking(s, { travelers: [good[0], { name: 'x', document: '1' }], boarding: 'gru' });
  assert.ok(bad.errors[1].name && bad.errors[1].document);
});

test('generateCode yields TRIP-XXXX and tolerates bad rng', () => {
  for (let i = 0; i < 50; i++) assert.ok(b.isValidCode(b.generateCode()));
  assert.equal(b.generateCode(() => 0), 'TRIP-AAAA');
  assert.ok(b.isValidCode(b.generateCode(() => 5)));
  assert.ok(b.isValidCode(b.generateCode(() => NaN)));
  assert.equal(b.isValidCode('TRIP-abcd'), false);
  assert.equal(b.isValidCode('TRIP-ABC'), false);
});

test('issueVoucher builds the voucher from the quote without mutating it', () => {
  const s = q.setCoupon(state2(), 'DANTRIP10');
  const before = JSON.stringify(s);
  const r = b.issueVoucher(s, { travelers: good, boarding: 'cgh' }, { rng: () => 0, now: new Date('2026-01-02T03:04:05Z') });
  assert.equal(JSON.stringify(s), before);
  const v = r.voucher;
  assert.equal(v.code, 'TRIP-AAAA');
  assert.equal(v.issuedAt, '2026-01-02T03:04:05.000Z');
  assert.match(v.boarding, /Congonhas/);
  assert.equal(v.travelers.length, 2);
  const c = q.compute(s);
  assert.equal(v.totalCents, c.totalCents);
  assert.equal(v.discountCents, c.discountCents);
  assert.equal(v.lines[0].name, 'Gramado, RS');
  assert.ok(b.issueVoucher(s, { travelers: [], boarding: 'cgh' }).error);
});

test('renderHighlights lists season cards linking to details', () => withDom(() => {
  const box = node('section');
  app.renderHighlights(box, 6);
  assert.ok(walk(box).some((n) => n._text === 'Destaques da temporada'));
  const links = walk(box).filter((n) => n.tag === 'a');
  assert.ok(links.length >= 1);
  assert.match(links[0].href, /^#\/destino\//);
  const empty = node('section');
  app.renderHighlights(empty, -1);
  assert.equal(empty.children.length, 0);
}));

test('renderCheckout builds one fieldset per traveler and shows errors on invalid submit', () => withDom(() => {
  const box = node('section');
  let received;
  app.renderCheckout(box, state2(), { onIssue: (f) => { received = f; return b.issueVoucher(state2(), f); } });
  assert.equal(box.hidden, false);
  assert.equal(byClass(box, 'traveler').length, 2);
  const form = walk(box).find((n) => n.tag === 'form');
  form.fire('submit');
  assert.equal(received.travelers.length, 2);
  const errs = byClass(box, 'field-error').map((n) => n._text).filter(Boolean);
  assert.ok(errs.length >= 5); // 2x name, 2x document, boarding
  const hidden = node('section');
  app.renderCheckout(hidden, q.emptyState(), { onIssue() {} });
  assert.equal(hidden.hidden, true);
}));

test('renderCheckout submits entered values and renderVoucher shows the code', () => withDom(() => {
  const box = node('section');
  const s = state2();
  let res;
  app.renderCheckout(box, s, { onIssue: (f) => { res = b.issueVoucher(s, f, { rng: () => 0 }); return res; } });
  const inputs = walk(box).filter((n) => n.tag === 'input');
  inputs[0].value = good[0].name; inputs[1].value = good[0].document;
  inputs[2].value = good[1].name; inputs[3].value = good[1].document;
  walk(box).find((n) => n.tag === 'select').value = 'gig';
  walk(box).find((n) => n.tag === 'form').fire('submit');
  assert.ok(res.voucher);
  const out = node('section');
  app.renderVoucher(out, res.voucher);
  assert.equal(out.hidden, false);
  assert.equal(byClass(out, 'voucher-code')[0]._text, 'TRIP-AAAA');
  assert.ok(walk(out).some((n) => /Galeao/.test(n._text)));
}));

test('renderQuote adds the checkout button only when a handler exists', () => withDom(() => {
  const s = state2();
  const without = node('section');
  app.renderQuote(without, s, { onUpdate() {}, onRemove() {}, onCoupon() {} });
  assert.equal(byClass(without, 'checkout-start').length, 0);
  let clicked = 0;
  const withH = node('section');
  app.renderQuote(withH, s, { onUpdate() {}, onRemove() {}, onCoupon() {}, onCheckout: () => clicked++ });
  byClass(withH, 'checkout-start')[0].fire('click');
  assert.equal(clicked, 1);
}));
