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
  const sch = S.createSchedule(memStorage(), { occupancy: { 'yo-ter-0800': 15 }, waiting: { 'yo-ter-0800': 2 } });
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
  assert.equal(sch.book('sp-seg-1830').status, 'booked');
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
