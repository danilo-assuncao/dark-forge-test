'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
  A.PROMOS.forEach((p) => assert.ok(A.findItem(p.itemId), p.itemId));
  assert.equal(A.promoPrice(9000, 15), 7650);
});

test('delivery quote by CEP is simulated per region and validated', () => {
  assert.deepEqual(A.deliveryQuote('01310-100', 'entrega'), { cep: '01310-100', zone: 'local', mode: 'entrega', fee: 800, days: 1 });
  assert.equal(A.deliveryQuote('01310100', 'taxi').fee, 1600);
  assert.equal(A.deliveryQuote('30000000', 'entrega').zone, 'regional');
  assert.equal(A.deliveryQuote('90000000', 'entrega').fee, 3500);
  assert.equal(A.deliveryQuote('90000000', 'loja').fee, 0);
  ['', '123', '1234567a', '00000000', null, '123456789'].forEach((c) => assert.equal(A.deliveryQuote(c, 'entrega'), null, String(c)));
});

test('availableSlots: closed Sunday, short Saturday, invalid dates', () => {
  assert.deepEqual(A.availableSlots('2030-01-13'), []);
  assert.deepEqual(A.availableSlots('nope'), []);
  assert.deepEqual(A.availableSlots('2030-02-31'), []);
  const mon = A.availableSlots('2030-01-07');
  assert.ok(mon.includes('09:00') && !mon.includes('17:30'));
  assert.ok(!mon.includes('08:00'));
  const sat = A.availableSlots('2030-01-12');
  assert.ok(sat.length > 0 && sat.every((t) => t <= '12:00'));
  assert.ok(!mon.includes('13:00')); // (7+13)%5 === 0 -> simulated as taken
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
  const errs = A.validateBooking({});
  ['petName', 'species', 'size', 'serviceId', 'date', 'mode'].forEach((k) => assert.ok(errs[k], k));
  assert.ok(A.validateBooking({ ...valid(), petName: '   ' }).petName);
  assert.ok(A.validateBooking({ ...valid(), species: 'peixe' }).species);
  assert.ok(A.validateBooking({ ...valid(), notes: 'x'.repeat(301) }).notes);
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
  // Banho e Tosa Completa medio: 9000 * 1.4 = 12600, 15% off -> 10710; taxi local = 1600.
  assert.equal(r.booking.servicePrice, 10710);
  assert.equal(r.booking.deliveryFee, 1600);
  assert.equal(r.booking.total, 12310);
  assert.equal(JSON.parse(st.data.get(A.BOOKING_KEY)).length, 1);
  let calls = 0;
  const again = A.createBooking(valid(), st, () => (calls++ ? 0.5 : 0.1234)); // first draw collides
  assert.equal(again.booking.protocol, 'PET-5000');
  assert.equal(A.createBooking(valid(), st, () => 0.1234).ok, false); // never reuses a protocol
  assert.match(again.booking.protocol, /^PET-\d{4}$/);
  assert.equal(A.loadBookings(st).length, 2);
});

test('createBooking in store mode has no delivery fee; invalid input is rejected', () => {
  const r = A.createBooking({ ...valid(), mode: 'loja', serviceId: 'tosa-higienica', cep: '' }, memStorage());
  assert.equal(r.ok, true);
  assert.equal(r.booking.deliveryFee, 0);
  assert.equal(r.booking.cep, null);
  assert.equal(r.booking.total, 5600);
  const st = memStorage();
  const bad = A.createBooking({ ...valid(), petName: '' }, st);
  assert.equal(bad.ok, false);
  assert.equal(st.data.size, 0);
  assert.deepEqual(A.loadBookings({ getItem: () => '{oops' }), []);
});

test('index.html has promo and booking containers', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  assert.match(html, /id="promos"/);
  assert.match(html, /id="booking-view"/);
});
