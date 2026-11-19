'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const C = require('../catalog.js');
const K = require('../cart.js');
const A = require('../app.js');

const ROOT = path.join(__dirname, '..');

function memStorage() {
  const data = new Map();
  return { getItem: (k) => (data.has(k) ? data.get(k) : null), setItem: (k, v) => { data.set(k, String(v)); }, data };
}

// 2030-01-07 is a Monday, 2030-01-12 a Saturday, 2030-01-13 a Sunday.
const valid = () => ({
  petName: ' Rex ', species: 'cao', size: 'medio', notes: 'Medo de secador', serviceId: 'banho-e-tosa',
  date: '2030-01-07', time: '09:00', mode: 'taxi', cep: '01310-100',
});

test('route #/agendar is parsed', () => {
  assert.deepEqual(A.parseHash('#/agendar'), { view: 'booking', service: null });
  assert.deepEqual(A.parseHash('#/agendar?service=banho-simples'), { view: 'booking', service: 'banho-simples' });
  assert.equal(A.parseHash('#/nope').view, 'notfound');
});

test('promo showcase references real items with discounted prices', () => {
  assert.ok(A.PROMOS.length >= 3);
  // Promos are only advertised for bookable services (discount applied in the booking flow).
  A.PROMOS.forEach((p) => assert.ok(A.findItem(p.itemId) && A.findItem(p.itemId).service, p.itemId));
  assert.equal(A.promoPrice(9000, 15), 7650);
  assert.equal(A.promoPrice(999, 15), 849); // 849.15 rounds down
  assert.equal(A.promoPrice(999, 10), 899); // 899.1
  assert.equal(A.promoPrice(1005, 50), 503); // 502.5 rounds up
  assert.equal(A.promoPrice(5000, 0), 5000);
  assert.equal(A.promoPrice(5000, 100), 0);
});

test('delivery quote by CEP is simulated per region and validated', () => {
  assert.deepEqual(A.deliveryQuote('01310-100', 'entrega'), { cep: '01310-100', zone: 'local', mode: 'entrega', fee: 800, days: 1 });
  assert.equal(A.deliveryQuote('01310100', 'taxi').fee, 1600);
  assert.equal(A.deliveryQuote('30000000', 'entrega').zone, 'regional');
  assert.equal(A.deliveryQuote('90000000', 'entrega').fee, 3500);
  assert.equal(A.deliveryQuote('90000000', 'loja').fee, 0);
  [['19999999', 'local', 800, 1], ['20000000', 'regional', 1800, 2], ['59999999', 'regional', 1800, 2], ['60000000', 'distante', 3500, 3],
   ['10000000', 'local', 800, 1], ['50000000', 'regional', 1800, 2]].forEach(([c, z, f, d]) => {
    const q = A.deliveryQuote(c, 'entrega');
    assert.deepEqual([q.zone, q.fee, q.days], [z, f, d], c);
  });
  assert.equal(A.deliveryQuote('01310100', 'foo').fee, 0); // unknown mode has no fee
  ['', '123', '1234567a', '00000000', null, '123456789'].forEach((c) => assert.equal(A.deliveryQuote(c, 'entrega'), null, String(c)));
});

test('availableSlots: closed Sunday, exact weekday/Saturday hours, invalid dates', () => {
  assert.deepEqual(A.availableSlots('2030-01-13'), []);
  assert.deepEqual(A.availableSlots('nope'), []);
  assert.deepEqual(A.availableSlots('2030-02-31'), []);
  // Weekday: last slot 16:00 (closes 17h); 13:00 is simulated as taken ((7+13)%5 === 0).
  assert.deepEqual(A.availableSlots('2030-01-07'), ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00']);
  // Saturday: last slot 11:00 (closes 12h).
  assert.deepEqual(A.availableSlots('2030-01-12'), ['09:00', '10:00', '11:00']);
});

test('booked slots are excluded and cannot be double-booked', () => {
  const st = memStorage();
  assert.equal(A.createBooking(valid(), st, () => 0.1).ok, true);
  assert.ok(!A.availableSlots('2030-01-07', A.loadBookings(st)).includes('09:00'));
  assert.ok(A.availableSlots('2030-01-08', A.loadBookings(st)).includes('09:00'));
  const again = A.createBooking(valid(), st, () => 0.2);
  assert.equal(again.ok, false);
  assert.ok(again.errors.time);
  assert.equal(A.loadBookings(st).length, 1);
});

test('protocol format PET-XXXX and uniqueness', () => {
  assert.equal(A.nextProtocol(() => 0.5), 'PET-5000');
  assert.equal(A.nextProtocol(() => 0), 'PET-0000');
  assert.equal(A.nextProtocol(() => 0.99999999), 'PET-9999');
  assert.match(A.nextProtocol(), /^PET-\d{4}$/);
  let n = 0;
  assert.equal(A.nextProtocol(() => (n++ < 1 ? 0.5 : 0.1), ['PET-5000']), 'PET-1000');
});

test('validateBooking reports every invalid field', () => {
  assert.deepEqual(A.validateBooking(valid()), {});
  // Dates before tomorrow (local) are rejected; "now" is injectable.
  const now = new Date(2030, 0, 6, 12).getTime();
  assert.equal(A.minBookingDate(now), '2030-01-07');
  assert.deepEqual(A.validateBooking(valid(), { now }), {});
  assert.ok(A.validateBooking({ ...valid(), date: '2030-01-05' }, { now }).date);
  assert.ok(A.validateBooking({ ...valid(), date: '2020-01-08' }).date);
  assert.ok(A.validateBooking({ ...valid(), date: '2030-01-07' }, { now: new Date(2030, 0, 7, 8).getTime() }).date);
  const errs = A.validateBooking({});
  ['petName', 'species', 'size', 'serviceId', 'date', 'mode'].forEach((k) => assert.ok(errs[k], k));
  assert.ok(A.validateBooking({ ...valid(), petName: '   ' }).petName);
  assert.ok(A.validateBooking({ ...valid(), species: 'peixe' }).species);
  assert.ok(A.validateBooking({ ...valid(), notes: 'x'.repeat(301) }).notes);
  assert.equal(A.validateBooking({ ...valid(), notes: 'x'.repeat(300) }).notes, undefined);
  assert.ok(A.validateBooking({ ...valid(), size: 'gigante' }).size);
  assert.ok(A.validateBooking({ ...valid(), serviceId: 'racao-caes-adultos' }).serviceId); // product, not a service
  assert.ok(A.validateBooking({ ...valid(), mode: 'foo' }).mode);
  assert.ok(A.validateBooking({ ...valid(), time: '13:00' }).time); // simulated taken slot on a weekday
  assert.ok(A.validateBooking({ ...valid(), cep: undefined }).cep);
  assert.ok(A.validateBooking({ ...valid(), serviceId: 'vermifugo' }).serviceId);
  assert.ok(A.validateBooking({ ...valid(), date: '2030-01-13' }).time);
  assert.ok(A.validateBooking({ ...valid(), time: '09:30' }).time);
  assert.ok(A.validateBooking({ ...valid(), cep: '12' }).cep);
  assert.deepEqual(A.validateBooking({ ...valid(), mode: 'loja', cep: '' }), {});
});

test('createBooking persists a PET-XXXX booking with price breakdown', () => {
  const st = memStorage();
  const r = A.createBooking(valid(), st, () => 0.1234);
  assert.equal(r.ok, true);
  assert.equal(r.booking.protocol, 'PET-1234');
  assert.equal(r.booking.pet.name, 'Rex');
  // Banho e Tosa Completa medio: C.priceFor = 9000 * 1.4 = 12600, 15% off -> 10710; taxi local = 1600.
  assert.equal(C.priceFor(A.findItem('banho-e-tosa'), 'medio'), 12600);
  assert.equal(r.booking.servicePrice, 10710);
  assert.equal(r.booking.deliveryFee, 1600);
  assert.equal(r.booking.total, 12310);
  assert.equal(JSON.parse(st.data.get(A.BOOKING_KEY)).length, 1);
  let calls = 0;
  const again = A.createBooking({ ...valid(), date: '2030-01-08' }, st, () => (calls++ ? 0.5 : 0.1234)); // first draw collides
  assert.equal(again.booking.protocol, 'PET-5000');
  const exhausted = A.createBooking({ ...valid(), date: '2030-01-09' }, st, () => 0.1234); // never reuses a protocol
  assert.equal(exhausted.ok, false);
  assert.ok(exhausted.errors.protocol);
  assert.equal(A.loadBookings(st).length, 2);
  assert.equal(A.nextProtocol(() => 0.1234, ['PET-1234']), null);
  assert.match(again.booking.protocol, /^PET-\d{4}$/);
  assert.equal(A.loadBookings(st).length, 2);
});

test('service not offered for the chosen size is rejected and nothing persisted', () => {
  const svc = C.ITEMS.find((i) => i.id === 'tosa-higienica');
  const saved = svc.sizes;
  svc.sizes = ['mini']; // simulate a service without Medio
  try {
    const st = memStorage();
    const input = { ...valid(), serviceId: 'tosa-higienica', size: 'medio' };
    assert.equal(A.validateBooking(input).size, 'Servico indisponivel para este porte.');
    assert.equal(A.createBooking(input, st).ok, false);
    assert.equal(st.data.size, 0);
  } finally { svc.sizes = saved; }
});

test('createBooking in store mode has no delivery fee; invalid input is rejected', () => {
  const r = A.createBooking({ ...valid(), mode: 'loja', serviceId: 'tosa-higienica', cep: '' }, memStorage());
  assert.equal(r.ok, true);
  assert.equal(r.booking.deliveryFee, 0);
  assert.equal(r.booking.cep, null);
  // Tosa Higienica medio, 5% promo: round(C.priceFor * 0.95).
  assert.equal(r.booking.servicePrice, A.promoPrice(C.priceFor(A.findItem('tosa-higienica'), 'medio'), 5));
  assert.equal(r.booking.total, 5320);
  const st = memStorage();
  const bad = A.createBooking({ ...valid(), petName: '' }, st);
  assert.equal(bad.ok, false);
  assert.equal(st.data.size, 0);
  assert.deepEqual(A.loadBookings({ getItem: () => '{oops' }), []);
  ['{"a":1}', 'null', '"x"'].forEach((v) => assert.deepEqual(A.loadBookings({ getItem: () => v }), [], v));
  // Tampered entries (null / non-objects / no protocol) are dropped instead of throwing.
  const dirty = memStorage();
  dirty.setItem(A.BOOKING_KEY, JSON.stringify([null, 3, {}, { protocol: 'PET-0001', date: '2030-01-08', time: '09:00' }]));
  assert.equal(A.loadBookings(dirty).length, 1);
  assert.equal(A.createBooking(valid(), dirty, () => 0.5).ok, true);
  // Storage failure (quota) or missing storage still returns the booking.
  const full = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  assert.equal(A.createBooking(valid(), full, () => 0.5).ok, true);
  assert.equal(A.createBooking(valid(), undefined, () => 0.5).ok, true);
  assert.equal(A.createBooking({ ...valid(), cep: undefined }, memStorage()).ok, false);
});

test('index.html has promo and booking containers', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /id="promos"/);
  assert.match(html, /id="booking-view"/);
});

// --- UI wiring (fake DOM) ---
function fakeNode(tag) {
  return {
    tagName: tag, className: '', textContent: '', children: [], attrs: {}, dataset: {}, listeners: {},
    type: '', href: '', value: '', hidden: false, disabled: false,
    focus() {}, get firstChild() { return this.children[0] || null; },
    appendChild(c) { this.children.push(c); return c; },
    removeChild(c) { this.children.splice(this.children.indexOf(c), 1); },
    setAttribute(k, v) { this.attrs[k] = v; },
    addEventListener(e, f) { this.listeners[e] = f; },
  };
}
const walk = (n, out = []) => { out.push(n); n.children.forEach((c) => walk(c, out)); return out; };
const texts = (n) => walk(n).map((x) => x.textContent).filter(Boolean);

function boot(storage) {
  const els = {};
  ['categories', 'search', 'catalog', 'empty', 'list-view', 'detail-view', 'booking-view', 'promos', 'sizes', 'cart']
    .forEach((id) => { els[id] = fakeNode(id); });
  const ls = {};
  const win = { DanPetsCatalog: C, DanPetsCart: K, localStorage: storage, location: { hash: '' }, addEventListener: (e, f) => { ls[e] = f; } };
  const document = { getElementById: (id) => els[id], querySelector: () => fakeNode('tbody'), createElement: fakeNode };
  const ctx = vm.createContext({ window: win, document });
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8'), ctx);
  return { els, go: (h) => { win.location.hash = h; ls.hashchange(); } };
}
const field = (root, key) => walk(root).find((n) => n.dataset && n.dataset.field === key);

test('UI: Home renders promo cards linking to the booking flow', () => {
  const { els } = boot(memStorage());
  const t = texts(els.promos);
  assert.ok(t.some((x) => /Promocoes/.test(x)));
  assert.equal(walk(els.promos).filter((n) => n.className === 'card promo').length, A.PROMOS.length);
  assert.ok(t.some((x) => /^15% OFF$/.test(x)));
  assert.ok(walk(els.promos).some((n) => /^#\/agendar\?service=banho-e-tosa$/.test(n.href)));
});

test('UI: booking route shows errors on empty submit, then a PET-XXXX protocol', () => {
  const st = memStorage();
  const { els, go } = boot(st);
  go('#/agendar?service=banho-simples');
  const v = els['booking-view'];
  assert.equal(v.hidden, false);
  assert.equal(els['list-view'].hidden, true);
  const form = walk(v).find((n) => n.tagName === 'form');
  form.listeners.submit({ preventDefault() {} });
  assert.ok(texts(v).some((x) => x === 'Informe o nome do pet.'));
  assert.ok(texts(v).some((x) => x === 'Escolha a data.'));
  assert.ok(texts(v).some((x) => /Revise os campos/.test(x)));
  // mode 'loja' hides the CEP field; taxi shows it.
  const cepWrap = walk(v).find((n) => n.tagName === 'label' && walk(n).includes(field(v, 'cep')));
  assert.equal(cepWrap.hidden, true);
  const modeSel = field(v, 'mode');
  modeSel.value = 'taxi';
  modeSel.listeners.change();
  assert.equal(cepWrap.hidden, false);
  // fill and submit
  const name = field(v, 'petName');
  name.value = 'Rex';
  name.listeners.input();
  const date = field(v, 'date');
  date.value = '2030-01-07';
  date.listeners.change();
  walk(v).find((n) => n.dataset && n.dataset.time === '09:00').listeners.click();
  const cep = field(v, 'cep');
  cep.value = '01310-100';
  cep.listeners.input();
  assert.ok(texts(v).some((x) => /Taxi-dog para 01310-100/.test(x)));
  form.listeners.submit({ preventDefault() {} });
  assert.ok(texts(v).some((x) => /^Protocolo: PET-\d{4}$/.test(x)));
  assert.equal(walk(v).find((n) => n.className === 'cta').disabled, true);
  assert.ok(!texts(v).some((x) => x === 'Informe o nome do pet.'));
  assert.equal(A.loadBookings(st).length, 1);
});

test('UI: service detail links to booking', () => {
  const { els, go } = boot(memStorage());
  go('#/item/banho-simples?size=mini');
  assert.ok(walk(els['detail-view']).some((n) => n.href === '#/agendar?service=banho-simples'));
});
