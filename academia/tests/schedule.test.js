'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../schedule.js');
const A = require('../classes.js');

function memStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m };
}

test('slots are valid, unique and reference real classes/instructors', () => {
  assert.equal(new Set(S.SLOTS.map((s) => s.id)).size, S.SLOTS.length);
  for (const s of S.SLOTS) {
    assert.ok(A.getClass(s.classId), s.id);
    assert.ok(A.getClass(s.classId).instructors.includes(s.instructorId), s.id);
    assert.ok(S.toMinutes(s.start) !== null, s.id);
    assert.ok(s.day >= 0 && s.day <= 6, s.id);
  }
});

test('no two catalog slots clash with each other', () => {
  for (let i = 0; i < S.SLOTS.length; i++) {
    for (let j = i + 1; j < S.SLOTS.length; j++) {
      const a = S.SLOTS[i], b = S.SLOTS[j];
      if (a.day === b.day && a.instructorId === b.instructorId) assert.equal(S.slotsOverlap(a, b), false, `${a.id}/${b.id}`);
    }
  }
});

test('toMinutes / endTime', () => {
  assert.equal(S.toMinutes('07:30'), 450);
  assert.equal(S.toMinutes('24:00'), null);
  assert.equal(S.toMinutes('7:30'), null);
  assert.equal(S.endTime(S.getSlot('ff-seg-0700')), '07:50');
  assert.equal(S.slotsForDay(1).map((s) => s.id).join(), 'ff-seg-0700,sp-seg-1830');
});

test('slotsOverlap: same day overlap, adjacency, other day, fail closed', () => {
  const ff = S.getSlot('ff-qua-1800'); // 18:00-18:50
  const sp = S.getSlot('sp-qua-1830'); // 18:30-19:15
  assert.equal(S.slotsOverlap(ff, sp), true);
  assert.equal(S.slotsOverlap(ff, S.getSlot('ff-sex-1800')), false);
  const next = { id: 'x', classId: 'boxe', day: 3, start: '18:50' };
  assert.equal(S.slotsOverlap(ff, next), false);
  assert.equal(S.slotsOverlap(ff, null), true);
  assert.equal(S.slotsOverlap(ff, { id: 'y', classId: 'nope', day: 3, start: '18:00' }), true);
});

test('book persists in storage and survives a new schedule instance', () => {
  const st = memStorage();
  const sch = S.createSchedule(st);
  const r = sch.book('ff-seg-0700');
  assert.deepEqual(r, { ok: true, status: 'booked', spotsLeft: 19 });
  assert.ok(st.m.has(S.STORAGE_KEY));
  const again = S.createSchedule(st);
  assert.equal(again.isBooked('ff-seg-0700'), true);
  assert.equal(again.listBookings()[0].id, 'ff-seg-0700');
  assert.equal(sch.book('ff-seg-0700').reason, 'already-booked');
});

test('book rejects unknown slots and time clashes', () => {
  const sch = S.createSchedule(memStorage());
  assert.equal(sch.book('nope').reason, 'unknown-slot');
  assert.equal(sch.book('ff-qua-1800').ok, true);
  const r = sch.book('sp-qua-1830');
  assert.deepEqual(r, { ok: false, reason: 'conflict', with: 'ff-qua-1800' });
  assert.equal(sch.isBooked('sp-qua-1830'), false);
  sch.cancel('ff-qua-1800');
  assert.equal(sch.book('sp-qua-1830').ok, true);
});

test('full session sends the student to the waitlist with a position', () => {
  const cap = A.getClass('yoga-mobilidade').capacity;
  const sch = S.createSchedule(memStorage(), { occupancy: { 'yo-ter-0800': cap }, waiting: { 'yo-ter-0800': 2 } });
  assert.equal(sch.seatsLeft('yo-ter-0800'), 0);
  const r = sch.book('yo-ter-0800');
  assert.deepEqual(r, { ok: true, status: 'waitlisted', position: 3 });
  assert.equal(sch.isBooked('yo-ter-0800'), false);
  assert.equal(sch.isWaitlisted('yo-ter-0800'), true);
  assert.equal(sch.waitlistPosition('yo-ter-0800'), 3);
  assert.equal(sch.book('yo-ter-0800').reason, 'already-waitlisted');
  assert.equal(sch.listWaitlist()[0].id, 'yo-ter-0800');
});

test('waitlisted slots still validate clashes', () => {
  const sch = S.createSchedule(memStorage(), { occupancy: { 'sp-qua-1830': 25 } });
  sch.book('ff-qua-1800');
  assert.equal(sch.book('sp-qua-1830').reason, 'conflict');
});

test('releaseSeat promotes the first-in-line student', () => {
  const sch = S.createSchedule(memStorage(), { occupancy: { 'bx-ter-1900': 16 } });
  sch.book('bx-ter-1900');
  assert.equal(sch.releaseSeat('bx-ter-1900').promoted, true);
  assert.equal(sch.isBooked('bx-ter-1900'), true);
  assert.equal(sch.isWaitlisted('bx-ter-1900'), false);
  assert.equal(sch.seatsLeft('bx-ter-1900'), 0);
});

test('releaseSeat does not promote when others are ahead, or none held', () => {
  const sch = S.createSchedule(memStorage(), { occupancy: { 'bx-ter-1900': 16 }, waiting: { 'bx-ter-1900': 1 } });
  sch.book('bx-ter-1900');
  assert.equal(sch.releaseSeat('bx-ter-1900').promoted, false);
  assert.equal(sch.isWaitlisted('bx-ter-1900'), true);
  assert.equal(sch.waitlistPosition('bx-ter-1900'), 1);
  assert.equal(sch.releaseSeat('bx-ter-1900').promoted, true);
  assert.equal(S.createSchedule(memStorage()).releaseSeat('bx-ter-1900').reason, 'no-seat-held');
  assert.equal(sch.releaseSeat('nope').reason, 'unknown-slot');
});

test('cancel handles bookings, waitlist and unknowns', () => {
  const sch = S.createSchedule(memStorage(), { occupancy: { 'yo-qui-0800': 15 } });
  sch.book('ff-seg-0700');
  sch.book('yo-qui-0800');
  assert.equal(sch.cancel('ff-seg-0700').status, 'cancelled');
  assert.equal(sch.cancel('yo-qui-0800').status, 'left-waitlist');
  assert.equal(sch.cancel('ff-seg-0700').reason, 'not-found');
  assert.equal(sch.seatsLeft('ff-seg-0700'), 20);
});

test('non-numeric occupancy normalises to zero', () => {
  const sch = S.createSchedule(memStorage(), { occupancy: { 'sp-seg-1830': 'abc' } });
  assert.equal(sch.seatsLeft('sp-seg-1830'), A.getClass('spinning').capacity);
  assert.equal(sch.book('sp-seg-1830').status, 'booked');
  assert.equal(sch.seatsLeft('sp-seg-1830'), A.getClass('spinning').capacity - 1);
});

test('over-capacity and negative occupancy fail closed / normalise', () => {
  const over = S.createSchedule(memStorage(), { occupancy: { 'sp-seg-1830': 999, 'bx-ter-1900': Infinity } });
  assert.equal(over.seatsLeft('sp-seg-1830'), 0);
  assert.equal(over.book('sp-seg-1830').status, 'waitlisted');
  assert.equal(over.book('bx-ter-1900').status, 'waitlisted');
  const neg = S.createSchedule(memStorage(), { occupancy: { 'sp-seg-1830': -5 } });
  assert.equal(neg.seatsLeft('sp-seg-1830'), A.getClass('spinning').capacity);
});

test('clashes are enforced against waitlisted slots in both directions', () => {
  const sch = S.createSchedule(memStorage(), { occupancy: { 'sp-qua-1830': 25 } });
  assert.equal(sch.book('sp-qua-1830').status, 'waitlisted');
  assert.deepEqual(sch.book('ff-qua-1800'), { ok: false, reason: 'conflict', with: 'sp-qua-1830' });
  const sch2 = S.createSchedule(memStorage(), { occupancy: { 'ff-qua-1800': 20 } });
  assert.equal(sch2.book('ff-qua-1800').status, 'waitlisted');
  assert.equal(sch2.book('sp-qua-1830').reason, 'conflict');
});

test('promotion blocked by a clash (tampered storage) keeps student waitlisted', () => {
  const st = memStorage();
  st.setItem(S.STORAGE_KEY, JSON.stringify({ booked: ['ff-qua-1800'], waitlist: ['sp-qua-1830'] }));
  const sch = S.createSchedule(st, { occupancy: { 'sp-qua-1830': 25 } });
  const r = sch.releaseSeat('sp-qua-1830');
  assert.equal(r.promoted, false);
  assert.equal(sch.isWaitlisted('sp-qua-1830'), true);
  assert.equal(sch.isBooked('sp-qua-1830'), false);
});

test('storage drops waitlist entries that are also booked', () => {
  const st = memStorage();
  st.setItem(S.STORAGE_KEY, JSON.stringify({ booked: ['ff-seg-0700'], waitlist: ['ff-seg-0700'] }));
  const sch = S.createSchedule(st);
  assert.equal(sch.isBooked('ff-seg-0700'), true);
  assert.equal(sch.isWaitlisted('ff-seg-0700'), false);
});

test('waitlist persists across instances sharing storage', () => {
  const st = memStorage();
  const opts = { occupancy: { 'yo-ter-0800': 15 }, waiting: { 'yo-ter-0800': 1 } };
  S.createSchedule(st, opts).book('yo-ter-0800');
  const again = S.createSchedule(st, opts);
  assert.equal(again.isWaitlisted('yo-ter-0800'), true);
  assert.equal(again.waitlistPosition('yo-ter-0800'), 2);
});

test('releaseSeat without booking/waitlist frees a seat; queue is served first', () => {
  const sch = S.createSchedule(memStorage(), { occupancy: { 'sp-seg-1830': 25 } });
  assert.equal(sch.seatsLeft('sp-seg-1830'), 0);
  assert.deepEqual(sch.releaseSeat('sp-seg-1830'), { ok: true, promoted: false });
  assert.equal(sch.seatsLeft('sp-seg-1830'), 1);
  for (let i = 0; i < 24; i++) assert.equal(sch.releaseSeat('sp-seg-1830').ok, true);
  assert.equal(sch.releaseSeat('sp-seg-1830').reason, 'no-seat-held');

  const q = S.createSchedule(memStorage(), { occupancy: { 'sp-seg-1830': 25 }, waiting: { 'sp-seg-1830': 1 } });
  q.releaseSeat('sp-seg-1830'); // taken by the waiter ahead, not an open seat
  assert.equal(q.seatsLeft('sp-seg-1830'), 0);
});

test('schedule does not mutate caller-supplied opts', () => {
  const opts = { occupancy: { 'bx-ter-1900': 16 }, waiting: { 'bx-ter-1900': 2 } };
  const sch = S.createSchedule(memStorage(), opts);
  sch.releaseSeat('bx-ter-1900');
  assert.deepEqual(opts, { occupancy: { 'bx-ter-1900': 16 }, waiting: { 'bx-ter-1900': 2 } });
});

test('default storage (none available in Node) falls back to memory', () => {
  const sch = S.createSchedule();
  assert.equal(sch.book('ff-seg-0700').ok, true);
  assert.equal(sch.isBooked('ff-seg-0700'), true);
});

test('memory fallback recovers once storage writes succeed again', () => {
  const st = memStorage();
  let failWrites = true;
  const flaky = { getItem: st.getItem, setItem(k, v) { if (failWrites) throw new Error('quota'); st.setItem(k, v); } };
  const sch = S.createSchedule(flaky);
  sch.book('ff-seg-0700');
  failWrites = false;
  sch.book('yo-ter-0800');
  assert.deepEqual(sch.listBookings().map((x) => x.id).sort(), ['ff-seg-0700', 'yo-ter-0800']);
  assert.equal(sch.isBooked('yo-ter-0800'), true);
  assert.equal(S.createSchedule(st).isBooked('yo-ter-0800'), true);
});

test('corrupt or tampered storage is ignored; missing storage falls back to memory', () => {
  const st = memStorage();
  st.setItem(S.STORAGE_KEY, '{not json');
  assert.deepEqual(S.createSchedule(st).listBookings(), []);
  st.setItem(S.STORAGE_KEY, JSON.stringify({ booked: ['ff-seg-0700', 'ff-seg-0700', 'bogus', 5], waitlist: 'x' }));
  assert.deepEqual(S.createSchedule(st).listBookings().map((s) => s.id), ['ff-seg-0700']);

  const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  const sch = S.createSchedule(throwing);
  assert.equal(sch.book('ff-seg-0700').ok, true);
  assert.equal(sch.isBooked('ff-seg-0700'), true);
});
