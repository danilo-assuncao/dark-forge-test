'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const V = require('../visits.js');

// Fixed "now": Monday 2026-03-02 (local time).
const NOW = new Date(2026, 2, 2, 10, 0, 0);
const contact = { name: 'Ana Souza', email: 'Ana@Example.com', phone: '(11) 98765-4321' };
const base = { listingId: 'apt-001', mode: 'presencial', date: '2026-03-03', shift: 'manha', contact };
const mk = () => V.createScheduler({ now: () => NOW });

test('protocol format', () => {
  assert.equal(V.formatProtocol(1), 'IMOB-0001');
  assert.equal(V.formatProtocol(12345), 'IMOB-12345');
  assert.ok(V.isValidProtocol('IMOB-0042'));
  ['IMOB-1', 'imob-0001', 'IMOB-ABCD', '', null].forEach((p) => assert.equal(V.isValidProtocol(p), false));
});

test('contact validation accepts and normalizes', () => {
  const r = V.validateContact(contact);
  assert.ok(r.ok);
  assert.deepEqual(r.contact, { name: 'Ana Souza', email: 'ana@example.com', phone: '11987654321' });
  assert.equal(V.normalizePhone('+55 11 3456-7890'), '1134567890');
});

test('contact validation rejects bad data', () => {
  const r = V.validateContact({ name: 'Ana', email: 'x@y', phone: '123' });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'name', 'phone']);
  assert.equal(V.validateContact().ok, false);
  assert.equal(V.normalizePhone('11 08765-4321'), null);
  assert.equal(V.normalizePhone('11 8765-4321'), null);
  assert.equal(V.normalizePhone('abc'), null);
});

test('date validation', () => {
  assert.equal(V.validateDate('2026-03-02', NOW), null);
  assert.ok(V.validateDate('2026-03-01', NOW));
  assert.ok(V.validateDate('2026-02-30', NOW));
  assert.ok(V.validateDate('03/03/2026', NOW));
  assert.ok(V.validateDate('2026-06-01', NOW));
  assert.equal(V.validateDate('2026-05-01', NOW), null);
});

test('schedules a visit and issues sequential protocols', () => {
  const s = mk();
  const a = s.schedule(base);
  assert.ok(a.ok);
  assert.equal(a.protocol, 'IMOB-0001');
  assert.equal(a.booking.brokerId, 'cor-001');
  assert.equal(a.booking.contact.email, 'ana@example.com');
  const b = s.schedule(Object.assign({}, base, { shift: 'tarde' }));
  assert.equal(b.protocol, 'IMOB-0002');
  assert.deepEqual(s.find('IMOB-0001').status, 'confirmed');
});

test('one visit per broker per slot, then falls back and runs out', () => {
  const s = mk();
  assert.equal(s.schedule(base).booking.brokerId, 'cor-001');
  assert.equal(s.schedule(base).booking.brokerId, 'cor-002');
  const r = s.schedule(base);
  assert.equal(r.ok, false);
  assert.ok(r.errors.slot);
  assert.deepEqual(s.availableShifts('2026-03-03', 'presencial'), ['tarde']);
});

test('failed attempts do not consume protocols', () => {
  const s = mk();
  assert.equal(s.schedule(Object.assign({}, base, { shift: 'noite' })).ok, false);
  assert.equal(s.schedule(base).protocol, 'IMOB-0001');
});

test('video and in-person availability differ', () => {
  const s = mk();
  // Wed 2026-03-04: Camila (video) does not work Wednesdays; Tue 03-03 she does (tarde).
  assert.deepEqual(s.availableShifts('2026-03-03', 'video'), ['manha', 'tarde']);
  const v = s.schedule(Object.assign({}, base, { mode: 'video', shift: 'tarde', brokerId: 'cor-003' }));
  assert.equal(v.booking.brokerId, 'cor-003');
  assert.equal(s.schedule(Object.assign({}, base, { mode: 'video', shift: 'tarde', brokerId: 'cor-003' })).ok, false);
  // Sunday: nobody works.
  assert.deepEqual(s.availableShifts('2026-03-08', 'presencial'), []);
});

test('rejects invalid requests with field errors', () => {
  const s = mk();
  const r = s.schedule({ listingId: ' ', mode: 'fax', shift: 'x', date: '2026-01-01', contact: {} });
  assert.equal(r.ok, false);
  assert.deepEqual(Object.keys(r.errors).sort(), ['contact', 'date', 'listingId', 'mode', 'shift']);
  assert.equal(s.schedule().ok, false);
  assert.deepEqual(s.availableShifts('2026-01-01', 'presencial'), []);
});

test('cancel frees the slot', () => {
  const s = mk();
  const a = s.schedule(base);
  s.schedule(base);
  assert.equal(s.schedule(base).ok, false);
  assert.equal(s.cancel(a.protocol), true);
  assert.equal(s.cancel(a.protocol), false);
  assert.equal(s.cancel('IMOB-9999'), false);
  assert.equal(s.schedule(base).protocol, 'IMOB-0003');
  assert.equal(s.find(a.protocol).status, 'cancelled');
});
