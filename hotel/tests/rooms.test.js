'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ROOMS, listRooms, getRoomById } = require('../rooms.js');

test('catalog has the four suites with rates and capacity', () => {
  const expected = { standard: [320, 2], deluxe: [540, 3], family: [680, 4], presidential: [1250, 4] };
  assert.ok(ROOMS.length >= 4);
  for (const [id, [rate, guests]] of Object.entries(expected)) {
    const room = getRoomById(id);
    assert.equal(room.dailyRate, rate);
    assert.equal(room.dailyRateCents, rate * 100);
    assert.equal(room.maxGuests, guests);
  }
});

test('catalog is immutable', () => {
  assert.ok(Object.isFrozen(ROOMS));
  assert.ok(ROOMS.every((r) => Object.isFrozen(r)));
  assert.throws(() => { 'use strict'; ROOMS.push({}); }, TypeError);
  assert.throws(() => { 'use strict'; ROOMS[0].dailyRate = 1; }, TypeError);
});

test('listRooms returns all rooms by default and a copy', () => {
  assert.equal(listRooms().length, ROOMS.length);
  assert.equal(listRooms({}).length, ROOMS.length);
  const copy = listRooms();
  copy.pop();
  assert.equal(listRooms().length, ROOMS.length);
});

test('listRooms filters by minGuests', () => {
  assert.deepEqual(listRooms({ minGuests: 3 }).map((r) => r.id), ['deluxe', 'family', 'presidential']);
  assert.deepEqual(listRooms({ minGuests: 4 }).map((r) => r.id), ['family', 'presidential']);
  assert.deepEqual(listRooms({ minGuests: 5 }), []);
  assert.equal(listRooms({ minGuests: 1 }).length, 4);
});

test('listRooms rejects invalid minGuests', () => {
  for (const bad of [0, -1, 1.5, '2', NaN]) {
    assert.throws(() => listRooms({ minGuests: bad }), RangeError);
  }
});

test('getRoomById returns null for unknown ids', () => {
  assert.equal(getRoomById('penthouse'), null);
  assert.equal(getRoomById(undefined), null);
  assert.equal(getRoomById('toString'), null);
});
