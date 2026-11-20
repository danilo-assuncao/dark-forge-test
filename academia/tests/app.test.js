'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const App = require('../app.js');
const Sched = require('../schedule.js');

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
}
function newSchedule(opts) {
  return Sched.createSchedule(memStorage(), opts || { occupancy: App.DEMO_OCCUPANCY, waiting: App.DEMO_WAITING });
}
const row = (sched, day, id) => App.dayRows(sched, day).find((r) => r.id === id);

test('formatBRL formats cents with thousands separator', () => {
  assert.equal(App.formatBRL(8990), 'R$ 89,90');
  assert.equal(App.formatBRL(123456), 'R$ 1.234,56');
  assert.equal(App.formatBRL(5), 'R$ 0,05');
  assert.equal(App.formatBRL(-1500), '-R$ 15,00');
});

test('dayRows lists the day sorted with status and seats', () => {
  const s = newSchedule();
  const rows = App.dayRows(s, 1);
  assert.deepEqual(rows.map((r) => r.id), ['ff-seg-0700', 'sp-seg-1830']);
  assert.equal(rows[0].time, '07:00 – 07:50');
  assert.equal(rows[0].status, 'open');
  assert.equal(rows[1].status, 'full');
  assert.equal(rows[1].seatsLeft, 0);
});

test('book, waitlist and cancel flow through toggleSlot', () => {
  const s = newSchedule();
  let r = row(s, 1, 'ff-seg-0700');
  assert.equal(App.rowLabel(r), 'Reservar');
  assert.equal(App.toggleSlot(s, r).message, 'Aula reservada!');
  r = row(s, 1, 'ff-seg-0700');
  assert.equal(r.status, 'booked');
  assert.equal(App.rowLabel(r), 'Cancelar');
  assert.equal(App.toggleSlot(s, r).message, 'Reserva cancelada.');

  r = row(s, 1, 'sp-seg-1830');
  assert.equal(App.rowLabel(r), 'Entrar na lista de espera');
  assert.match(App.toggleSlot(s, r).message, /nº 3 na lista/);
  r = row(s, 1, 'sp-seg-1830');
  assert.equal(r.status, 'waitlisted');
  assert.equal(r.position, 3);
  assert.equal(App.toggleSlot(s, r).message, 'Você saiu da lista de espera.');
});

test('time clashes are reported in Portuguese', () => {
  const s = newSchedule();
  // ff-qua-1800 (18:00-18:50) overlaps sp-qua-1830 on Wednesday.
  assert.equal(App.toggleSlot(s, row(s, 3, 'ff-qua-1800')).ok, true);
  const res = App.toggleSlot(s, row(s, 3, 'sp-qua-1830'));
  assert.equal(res.ok, false);
  assert.match(res.message, /Conflito/);
});

test('buildQuote applies DANFIT10 only on eligible cycles and keeps quote on invalid coupon', () => {
  const ok = App.buildQuote('plus', 'semestral', ' danfit10 ');
  assert.equal(ok.quote.couponCode, 'DANFIT10');
  assert.equal(ok.couponMessage, '');
  assert.ok(ok.lines.some((l) => l[0] === 'Cupom DANFIT10'));

  const mensal = App.buildQuote('plus', 'mensal', 'DANFIT10');
  assert.equal(mensal.quote.couponCode, null);
  assert.match(mensal.couponMessage, /Semestral e Anual/);
  assert.equal(mensal.quote.totalCents, 12990);
  assert.ok(!mensal.lines.some((l) => l[0].startsWith('Cupom')));

  const bad = App.buildQuote('start', 'anual', 'NOPE');
  assert.equal(bad.couponMessage, 'Cupom inválido.');
  assert.ok(bad.quote.totalCents > 0);
  assert.equal(App.buildQuote('start', 'anual', '').couponMessage, '');
});

test('enroll returns a valid FIT-XXXX protocol and total', () => {
  const r = App.enroll('black_vip', 'anual', 'DANFIT10', () => 0);
  assert.equal(r.protocol, 'FIT-0001');
  assert.match(r.message, /FIT-0001/);
  assert.match(r.message, /R\$ /);
  assert.match(App.enroll('start', 'mensal', '').protocol, /^FIT-\d{4}$/);
  assert.throws(() => App.enroll('nope', 'mensal', ''), RangeError);
});

test('static files: light-only styles, script order and DAN branding', () => {
  const dir = path.join(__dirname, '..');
  const css = fs.readFileSync(path.join(dir, 'styles.css'), 'utf8');
  assert.match(css, /color-scheme:\s*only light/);
  assert.ok(!/prefers-color-scheme/.test(css));
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const order = ['classes.js', 'plans.js', 'billing.js', 'schedule.js', 'app.js']
    .map((f) => html.indexOf('src="' + f + '"'));
  assert.ok(order.every((i) => i > -1));
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(/DAN/.test(html));
  for (const id of ['day-picker', 'slot-list', 'my-bookings', 'cycle-picker', 'plan-list', 'enroll-form', 'coupon', 'quote']) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
});
