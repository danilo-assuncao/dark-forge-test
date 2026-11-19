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
  assert.equal(a.booking.brokerId, 'cor-002');
  assert.equal(a.booking.contact.email, 'ana@example.com');
  const b = s.schedule(Object.assign({}, base, { shift: 'tarde' }));
  assert.equal(b.protocol, 'IMOB-0002');
  assert.equal(s.find('IMOB-0001', 'ana@example.com').status, 'confirmed');
});

test('one visit per broker per slot, then falls back and runs out', () => {
  const s = mk();
  assert.equal(s.schedule(base).booking.brokerId, 'cor-002');
  assert.equal(s.schedule(base).booking.brokerId, 'cor-001');
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
  assert.equal(s.cancel(a.protocol, 'ana@example.com'), true);
  assert.equal(s.cancel(a.protocol, 'ana@example.com'), false);
  assert.equal(s.cancel('IMOB-9999', 'ana@example.com'), false);
  assert.equal(s.schedule(base).protocol, 'IMOB-0003');
  assert.equal(s.find(a.protocol, 'ANA@example.com').status, 'cancelled');
});

test('flexible broker stays free: presencial then video in the same slot', () => {
  const s = mk();
  assert.equal(s.schedule(base).booking.brokerId, 'cor-002');
  const v = s.schedule(Object.assign({}, base, { mode: 'video' }));
  assert.ok(v.ok);
  assert.equal(v.booking.brokerId, 'cor-001');
});

test('same-day shifts that already ended are unavailable', () => {
  const late = new Date(2026, 2, 2, 17, 0, 0);
  const s = V.createScheduler({ now: () => late });
  assert.deepEqual(s.availableShifts('2026-03-02', 'presencial'), ['tarde']);
  const r = s.schedule(Object.assign({}, base, { date: '2026-03-02' }));
  assert.equal(r.ok, false);
  assert.ok(r.errors.shift);
  const evening = new Date(2026, 2, 2, 18, 0, 0);
  assert.deepEqual(V.createScheduler({ now: () => evening }).availableShifts('2026-03-02', 'presencial'), []);
  assert.ok(mk().schedule(Object.assign({}, base, { date: '2026-03-02', shift: 'tarde' })).ok);
});

test('returned bookings are copies', () => {
  const s = mk();
  const a = s.schedule(base);
  a.booking.contact.email = 'evil@x.com';
  s.find(a.protocol, 'ana@example.com').contact.name = 'Hacked';
  assert.equal(s.find(a.protocol, 'ana@example.com').contact.email, 'ana@example.com');
  assert.equal(s.find(a.protocol, 'ana@example.com').contact.name, 'Ana Souza');
});

test('find and cancel require the matching contact email', () => {
  const s = mk();
  const a = s.schedule(base);
  assert.equal(s.find(a.protocol), null);
  assert.equal(s.find(a.protocol, 'other@example.com'), null);
  assert.equal(s.cancel(a.protocol), false);
  assert.equal(s.cancel(a.protocol, 'other@example.com'), false);
  assert.equal(s.find(a.protocol, 'ana@example.com').status, 'confirmed');
});

test('input length and listingId bounds', () => {
  const s = mk();
  assert.ok(s.schedule(Object.assign({}, base, { listingId: 'x'.repeat(65) })).errors.listingId);
  assert.ok(s.schedule(Object.assign({}, base, { listingId: '<img onerror=x>' })).errors.listingId);
  assert.equal(V.validateContact(Object.assign({}, contact, { name: 'A ' + 'b'.repeat(100) })).ok, false);
  assert.equal(V.validateContact(Object.assign({}, contact, { email: 'a'.repeat(250) + '@b.co' })).ok, false);
  assert.equal(s.schedule(base).protocol, 'IMOB-0001');
});

test('brokerId override rejects unavailable brokers without using a protocol', () => {
  const s = mk();
  const bad = [
    { brokerId: 'cor-999' },
    { brokerId: 'cor-003', mode: 'presencial', shift: 'tarde' }, // video-only
    { brokerId: 'cor-003', mode: 'video', date: '2026-03-02', shift: 'tarde' }, // Monday off
    { brokerId: 'cor-003', mode: 'video', shift: 'manha' }, // tarde only
  ];
  bad.forEach((o) => {
    const r = s.schedule(Object.assign({}, base, o));
    assert.equal(r.ok, false, JSON.stringify(o));
    assert.ok(r.errors.slot, JSON.stringify(o));
  });
  assert.equal(s.schedule(base).protocol, 'IMOB-0001');
});
