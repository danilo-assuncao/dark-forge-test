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
  return Sched.createSchedule(memStorage(), opts || FIXTURE);
}
const FIXTURE = { occupancy: { 'sp-seg-1830': 25, 'bx-ter-1900': 15 }, waiting: { 'sp-seg-1830': 2 } };
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

test('formatBRL boundaries', () => {
  assert.equal(App.formatBRL(0), 'R$ 0,00');
  assert.equal(App.formatBRL(99), 'R$ 0,99');
  assert.equal(App.formatBRL(100), 'R$ 1,00');
  assert.equal(App.formatBRL(100000), 'R$ 1.000,00');
  assert.equal(App.formatBRL(100000000), 'R$ 1.000.000,00');
  assert.equal(App.formatBRL(1234.5), 'R$ 12,35');
});

test('dayRows: empty day, booked row and explicit fixture', () => {
  const s = newSchedule();
  assert.deepEqual(App.dayRows(s, 0), []);
  App.toggleSlot(s, row(s, 1, 'ff-seg-0700'));
  const r = row(s, 1, 'ff-seg-0700');
  assert.equal(r.status, 'booked');
  assert.equal(r.position, null);
  assert.equal(r.seatsLeft, 19);
  assert.equal(row(s, 2, 'bx-ter-1900').seatsLeft, 1);
});

test('toggleSlot failure reasons and fallbacks', () => {
  const s = newSchedule();
  assert.equal(App.toggleSlot(s, { id: 'nope', status: 'open' }).message, 'Aula não encontrada.');
  assert.equal(App.toggleSlot(s, { id: 'nope', status: 'booked' }).message, 'Reserva não encontrada.');
  const open = row(s, 1, 'ff-seg-0700');
  App.toggleSlot(s, open);
  assert.equal(App.toggleSlot(s, open).message, 'Você já está inscrito nesta aula.');
  const full = row(s, 1, 'sp-seg-1830');
  App.toggleSlot(s, full);
  assert.equal(App.toggleSlot(s, full).message, 'Você já está na lista de espera.');
  const stub = { book: () => ({ ok: false, reason: 'x' }), cancel: () => ({ ok: false, reason: 'invalid-occupancy' }) };
  assert.equal(App.toggleSlot(stub, { id: 'a', status: 'open' }).message, 'Não foi possível concluir.');
  assert.equal(App.toggleSlot(stub, { id: 'a', status: 'booked' }).message, 'Não foi possível verificar as vagas.');
});

test('rowLabel covers every status', () => {
  assert.equal(App.rowLabel({ status: 'waitlisted' }), 'Sair da lista');
  assert.equal(App.rowLabel({ status: 'open' }), 'Reservar');
});

test('buildQuote with an invalid cycle throws', () => {
  assert.throws(() => App.buildQuote('plus', 'nope', ''), RangeError);
});

// ---- minimal fake DOM for init() ----
class FakeNode {
  constructor(tag, doc) {
    this.tag = tag; this.doc = doc; this.children = []; this.attrs = {}; this.listeners = {};
    this.hidden = false; this.tabIndex = 0; this.value = ''; this.className = ''; this._text = '';
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  appendChild(c) { this.children.push(c); return c; }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f); }
  dispatch(t, extra) {
    const e = Object.assign({ preventDefault() { this.prevented = true; }, prevented: false }, extra);
    (this.listeners[t] || []).forEach((f) => f(e));
    return e;
  }
  click() { return this.dispatch('click'); }
  focus() { this.doc.activeElement = this; }
  find(pred, out) {
    out = out || [];
    if (pred(this)) out.push(this);
    this.children.forEach((c) => c.find(pred, out));
    return out;
  }
}
function fakeDoc() {
  const doc = { activeElement: null, byId: {}, tabs: [] };
  doc.createElement = (t) => new FakeNode(t, doc);
  doc.getElementById = (id) => doc.byId[id];
  doc.querySelectorAll = (sel) => (sel === '[data-tab]' ? doc.tabs : []);
  const ids = ['day-picker', 'schedule-msg', 'slot-list', 'my-bookings', 'cycle-picker', 'plan-list',
    'enroll-summary', 'coupon', 'coupon-msg', 'quote', 'enroll-form', 'enroll-msg', 'panel-grade', 'panel-planos'];
  ids.forEach((id) => { doc.byId[id] = new FakeNode('x', doc); });
  doc.byId['panel-planos'].hidden = true;
  ['grade', 'planos'].forEach((n) => {
    const t = doc.createElement('button');
    t.setAttribute('data-tab', n);
    doc.tabs.push(t);
  });
  return doc;
}
const buttons = (n, label) => n.find((x) => x.tag === 'button' && x.textContent === label);

test('init renders, books, restores focus and updates my bookings', () => {
  const doc = fakeDoc();
  App.init(doc, memStorage(), Object.assign({ day: 1 }, FIXTURE));
  assert.equal(doc.byId['day-picker'].children.length, 7);
  const [reservar] = buttons(doc.byId['slot-list'], 'Reservar');
  reservar.focus();
  reservar.click();
  assert.equal(doc.byId['schedule-msg'].textContent, 'Aula reservada!');
  assert.equal(doc.byId['schedule-msg'].className, 'msg ok');
  assert.match(doc.byId['my-bookings'].textContent, /Segunda 07:00 – Forca & Funcional \(Confirmada\)/);
  assert.equal(doc.activeElement.getAttribute('data-focus'), 'slot-ff-seg-0700');
  assert.equal(doc.activeElement.textContent, 'Cancelar');
  doc.byId['day-picker'].children[0].click();
  assert.equal(doc.byId['slot-list'].textContent, 'Sem aulas neste dia.');
  assert.equal(doc.byId['schedule-msg'].textContent, '');
});

test('init: singular seat label', () => {
  const doc = fakeDoc();
  App.init(doc, memStorage(), Object.assign({ day: 2 }, FIXTURE));
  assert.match(doc.byId['slot-list'].textContent, /1 vaga(?!s)/);
});

test('init: coupon updates quote, enroll submits and message clears on change', () => {
  const doc = fakeDoc();
  App.init(doc, memStorage(), Object.assign({ day: 1 }, FIXTURE));
  const quote = () => doc.byId.quote.textContent;
  assert.ok(!/Cupom/.test(quote()));
  doc.byId.coupon.value = 'danfit10';
  doc.byId.coupon.dispatch('input');
  assert.match(quote(), /Cupom DANFIT10/);
  doc.byId.coupon.value = 'zzz';
  doc.byId.coupon.dispatch('input');
  assert.equal(doc.byId['coupon-msg'].textContent, 'Cupom inválido.');
  doc.byId.coupon.value = 'DANFIT10';
  doc.byId.coupon.dispatch('input');
  const e = doc.byId['enroll-form'].dispatch('submit');
  assert.ok(e.prevented);
  assert.match(doc.byId['enroll-msg'].textContent, /Matrícula confirmada! Protocolo FIT-\d{4}/);
  const [sel] = buttons(doc.byId['plan-list'], 'Selecionar');
  sel.focus();
  sel.click();
  assert.equal(doc.byId['enroll-msg'].textContent, '');
  assert.match(doc.activeElement.getAttribute('data-focus'), /^plan-/);
  doc.byId['cycle-picker'].children[0].click();
  assert.match(doc.byId['coupon-msg'].textContent, /Semestral e Anual/);
});

test('init: tabs switch by click and by keyboard', () => {
  const doc = fakeDoc();
  App.init(doc, memStorage(), { day: 1 });
  const [grade, planos] = doc.tabs;
  planos.click();
  assert.equal(doc.byId['panel-planos'].hidden, false);
  assert.equal(doc.byId['panel-grade'].hidden, true);
  assert.equal(planos.getAttribute('aria-selected'), 'true');
  assert.equal(grade.tabIndex, -1);
  const e = planos.dispatch('keydown', { key: 'ArrowRight' });
  assert.ok(e.prevented);
  assert.equal(doc.activeElement, grade);
  assert.equal(grade.getAttribute('aria-selected'), 'true');
  assert.equal(doc.byId['panel-planos'].hidden, true);
  grade.dispatch('keydown', { key: 'End' });
  assert.equal(doc.activeElement, planos);
  planos.dispatch('keydown', { key: 'Home' });
  assert.equal(doc.activeElement, grade);
  grade.dispatch('keydown', { key: 'ArrowLeft' });
  assert.equal(doc.activeElement, planos);
  assert.equal(planos.dispatch('keydown', { key: 'a' }).prevented, false);
});
