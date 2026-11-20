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

test('every real destination season parses to at least one month', () => {
  dest.DESTINATIONS.forEach((d) => assert.ok(b.seasonMonths(d.climate.season).length > 0, d.id));
});

test('seasonHighlights is empty for a month nobody covers', () => {
  assert.deepEqual(b.seasonHighlights(12), []);
  assert.deepEqual(b.seasonHighlights(-1), []);
});

test('seasonHighlights returns in-season destinations, cheapest first, limited', () => {
  const july = b.seasonHighlights(6);
  assert.ok(july.length > 0 && july.length <= 3);
  july.forEach((d) => assert.ok(b.seasonMonths(d.climate.season).includes(6)));
  const prices = july.map((d) => Math.min(...d.durations.map((n) => d.priceCents[n])));
  assert.deepEqual(prices, prices.slice().sort((x, y) => x - y));
  assert.equal(b.seasonHighlights(6, 1).length, 1);
  assert.deepEqual(b.seasonHighlights(6, 0), []);
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

test('validateTraveler document boundaries', () => {
  const ok = (document) => b.validateTraveler({ name: 'Maria Silva', document }).valid;
  [['A1234', false], ['A12345', true], ['A12345678', true], ['A123456789', false],
    ['1234567890', false], ['123456789012', false], ['12345678909', true], ['ab123456', true],
    ['123.456.789-09', true], ['AB 123 456', true], ['AB*12345', false]]
    .forEach(([doc, expected]) => assert.equal(ok(doc), expected, doc));
  assert.equal(b.normalizeDocument('ab-123 456'), 'AB123456');
});

test('validateTraveler name boundaries', () => {
  const ok = (name) => b.validateTraveler({ name, document: '12345678909' });
  assert.equal(ok("Jos\u00e9 D'\u00c1vila-Neto").valid, true);
  assert.equal(ok('A Silva').valid, false);
  assert.equal(ok('  Maria   Silva  ').traveler.name, 'Maria Silva');
  assert.equal(ok('  Maria   Silva  ').valid, true);
});

test('requiredTravelers uses the largest party; duplicates are detected after normalizing', () => {
  let s = q.addItem(q.emptyState(), { id: 'gramado', duration: 3, travelers: 1 });
  s = q.addItem(s, { id: 'lisboa', duration: 7, travelers: 3 });
  assert.equal(b.requiredTravelers(s), 3);
  const s2 = state2();
  const dup = b.validateBooking(s2, { boarding: 'gru', travelers: [
    { name: 'Maria Silva', document: 'ab123456' }, { name: 'Joao Souza', document: 'AB-123456' }] });
  assert.equal(dup.valid, false);
  assert.equal(dup.errors[0].document, undefined);
  assert.ok(dup.errors[1].document);
  const dupCpf = b.validateBooking(s2, { boarding: 'gru', travelers: [
    { name: 'Maria Silva', document: '123.456.789-09' }, { name: 'Joao Souza', document: '12345678909' }] });
  assert.ok(dupCpf.errors[1].document);
  // First entry invalid: its document is not registered, so the second is not flagged as duplicate.
  const firstBad = b.validateBooking(s2, { boarding: 'gru', travelers: [
    { name: 'x', document: '12345678909' }, { name: 'Joao Souza', document: '12345678909' }] });
  assert.ok(firstBad.errors[0].name);
  assert.equal(firstBad.errors[1].document, undefined);
});

test('generateCode pins rng edges and alphabet', () => {
  assert.equal(b.generateCode(() => 0.9999), 'TRIP-9999');
  assert.equal(b.generateCode(() => 5), 'TRIP-AAAA');
  assert.equal(b.generateCode(() => -1), 'TRIP-AAAA');
  assert.equal(b.generateCode(() => NaN), 'TRIP-AAAA');
  for (let i = 0; i < 200; i++) assert.doesNotMatch(b.generateCode().slice(5), /[01OI]/);
});

test('renderVoucher shows travelers, lines, discount and total', () => withDom(() => {
  const withCoupon = b.issueVoucher(q.setCoupon(state2(), 'DANTRIP10'), { travelers: good, boarding: 'gru' }, { rng: () => 0 }).voucher;
  const out = node('section');
  app.renderVoucher(out, withCoupon);
  const texts = walk(out).map((n) => n._text);
  assert.ok(texts.includes('Maria Silva - doc. 12345678909'));
  assert.ok(texts.includes('Joao Souza - doc. AB123456'));
  assert.ok(texts.some((t) => /Gramado, RS - 3 dias \(com seguro\): /.test(t)));
  assert.ok(texts.some((t) => /^Desconto: -R\$/.test(t)));
  assert.ok(texts.includes('Total: ' + dest.formatBRL(withCoupon.totalCents)));
  const plain = b.issueVoucher(state2(), { travelers: good, boarding: 'gru' }).voucher;
  const out2 = node('section');
  app.renderVoucher(out2, plain);
  assert.ok(!walk(out2).some((n) => /^Desconto/.test(n._text)));
  assert.equal(byClass(out2, 'voucher-close').length, 0);
}));

test('renderCheckout puts errors on the right fields and clears them on a valid resubmit', () => withDom(() => {
  const box = node('section');
  const s = state2();
  app.renderCheckout(box, s, { onIssue: (f) => b.issueVoucher(s, f) });
  const form = walk(box).find((n) => n.tag === 'form');
  const inputs = walk(box).filter((n) => n.tag === 'input');
  const errs = byClass(box, 'field-error');
  inputs[0].value = 'Maria Silva'; inputs[1].value = '1'; inputs[2].value = 'x'; inputs[3].value = 'AB123456';
  form.fire('submit');
  assert.equal(errs[0]._text, '');
  assert.ok(errs[1]._text);
  assert.ok(errs[2]._text);
  assert.equal(errs[3]._text, '');
  assert.ok(errs[4]._text); // boarding
  inputs[1].value = '12345678909'; inputs[2].value = 'Joao Souza';
  walk(box).find((n) => n.tag === 'select').value = 'gru';
  form.fire('submit');
  errs.forEach((e) => assert.equal(e._text, ''));
}));

// init-level wiring with a fake page, stubbed storage, hash and clock.
function page(hash, month) {
  const ids = {};
  ['catalog', 'filters', 'filter-search', 'filter-category', 'filter-duration', 'quote', 'checkout', 'highlights']
    .forEach((id) => { ids[id] = node('div'); });
  global.document = { createElement: node, createTextNode: (t) => ({ tag: '#text', children: [], _text: t }),
    getElementById: (id) => ids[id] || null };
  const store = {};
  const storage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const ctx = { ids, store, hash };
  app.init({ storage, getHash: () => ctx.hash, now: () => new Date(2026, month, 15) });
  return ctx;
}

test('init: highlights only on the unfiltered list route, using the injected month', () => {
  try {
    const home = page('#/', 6);
    assert.equal(home.ids.highlights.hidden, false);
    assert.ok(walk(home.ids.highlights).some((n) => n._text === 'Destaques da temporada'));
    ['#/?q=gramado', '#/?cat=Praias', '#/?dur=7', '#/destino/gramado?dur=3'].forEach((h) => {
      const p = page(h, 6);
      assert.equal(p.ids.highlights.hidden, true, h);
      assert.equal(p.ids.highlights.children.length, 0, h);
    });
  } finally { delete global.document; }
});

test('init: checkout issues a voucher, empties and saves the quote, and keeps the voucher until dismissed', () => {
  try {
    const seed = { items: [{ id: 'gramado', duration: 3, travelers: 2, insurance: false }], coupon: '' };
    global.__seed = seed;
    const ids = {};
    ['catalog', 'filters', 'filter-search', 'filter-category', 'filter-duration', 'quote', 'checkout', 'highlights']
      .forEach((id) => { ids[id] = node('div'); });
    global.document = { createElement: node, createTextNode: (t) => ({ tag: '#text', children: [], _text: t }),
      getElementById: (id) => ids[id] };
    const store = { [q.STORAGE_KEY]: JSON.stringify(seed) };
    const storage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    let hash = '#/destino/gramado?dur=3';
    app.init({ storage, getHash: () => hash, now: () => new Date(2026, 6, 1) });
    assert.equal(ids.checkout.hidden, true);
    byClass(ids.quote, 'checkout-start')[0].fire('click');
    assert.equal(ids.checkout.hidden, false);
    const inputs = walk(ids.checkout).filter((n) => n.tag === 'input');
    inputs[0].value = good[0].name; inputs[1].value = good[0].document;
    inputs[2].value = good[1].name; inputs[3].value = good[1].document;
    walk(ids.checkout).find((n) => n.tag === 'select').value = 'gru';
    walk(ids.checkout).find((n) => n.tag === 'form').fire('submit');
    assert.equal(byClass(ids.checkout, 'checkout-form').length, 0);
    const code = byClass(ids.checkout, 'voucher-code')[0]._text;
    assert.ok(b.isValidCode(code));
    assert.deepEqual(JSON.parse(store[q.STORAGE_KEY]).items, []);
    assert.ok(walk(ids.quote).some((n) => n._text === 'Sua cotacao esta vazia.'));
    // A later quote change must not wipe the voucher.
    const add = walk(ids.catalog).find((n) => n.tag === 'button' && n._text === 'Adicionar a cotacao');
    add.fire('click');
    assert.equal(byClass(ids.checkout, 'voucher-code')[0]._text, code);
    // Explicit dismiss clears it.
    byClass(ids.checkout, 'voucher-close')[0].fire('click');
    assert.equal(ids.checkout.hidden, true);
  } finally { delete global.document; delete global.__seed; }
});

test('init: a quote change closes an open checkout form instead of silently resetting it', () => {
  try {
    const ids = {};
    ['catalog', 'filters', 'filter-search', 'filter-category', 'filter-duration', 'quote', 'checkout', 'highlights']
      .forEach((id) => { ids[id] = node('div'); });
    global.document = { createElement: node, createTextNode: (t) => ({ tag: '#text', children: [], _text: t }),
      getElementById: (id) => ids[id] };
    const store = { [q.STORAGE_KEY]: JSON.stringify({ items: [{ id: 'gramado', duration: 3, travelers: 2, insurance: false }], coupon: '' }) };
    const storage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
    app.init({ storage, getHash: () => '#/', now: () => new Date(2026, 6, 1) });
    byClass(ids.quote, 'checkout-start')[0].fire('click');
    assert.equal(ids.checkout.hidden, false);
    byClass(ids.quote, 'quote-line')[0] && walk(byClass(ids.quote, 'quote-line')[0]).find((n) => n.tag === 'button' && n._text === 'Remover').fire('click');
    assert.equal(ids.checkout.hidden, true);
    assert.equal(ids.checkout.children.length, 0);
  } finally { delete global.document; }
});
