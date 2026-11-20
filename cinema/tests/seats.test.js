'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { SEAT_CODES, createSeatMap } = require('../seats.js');
const { getSessionById, getBaseTicketPrice } = require('../movies.js');

test('grid is 6x8 from A1 to F8', () => {
  assert.equal(SEAT_CODES.length, 48);
  assert.equal(SEAT_CODES[0], 'A1');
  assert.equal(SEAT_CODES[47], 'F8');
  assert.equal(new Set(SEAT_CODES).size, 48);
});

test('rejects unknown session and bad occupied input', () => {
  assert.throws(() => createSeatMap('nope'), RangeError);
  assert.throws(() => createSeatMap(42), TypeError);
  assert.throws(() => createSeatMap('ses-001', 'A1'), TypeError);
  assert.throws(() => createSeatMap('ses-001', ['G1']), RangeError);
});

test('rejects malformed seat codes', () => {
  const map = createSeatMap('ses-001');
  for (const bad of ['A0', 'A9', 'G1', 'a1', 'A10', '', ' A1', 'A1 ', 'AA1']) {
    assert.throws(() => map.selectSeat(bad, 'full'), RangeError, bad);
  }
  assert.throws(() => map.selectSeat(null, 'full'), TypeError);
  assert.throws(() => map.releaseSeat('Z9'), RangeError);
});

test('rejects invalid ticket kinds', () => {
  const map = createSeatMap('ses-001');
  assert.throws(() => map.selectSeat('A1', 'student'), RangeError);
  assert.throws(() => map.selectSeat('A1', 'toString'), RangeError);
  assert.throws(() => map.selectSeat('A1'), TypeError);
});

test('rejects occupied and duplicate seats', () => {
  const map = createSeatMap('ses-001', ['A1']);
  assert.throws(() => map.selectSeat('A1', 'full'), /occupied/);
  map.selectSeat('B2', 'full');
  assert.throws(() => map.selectSeat('B2', 'half'), /already selected/);
});

test('prices use room base price: full 100%, half 50%', () => {
  for (const s of ['ses-001', 'ses-002', 'ses-004']) {
    const base = getBaseTicketPrice(getSessionById(s).roomType);
    const map = createSeatMap(s);
    assert.equal(map.selectSeat('C3', 'full').price, base);
    assert.equal(map.selectSeat('C4', 'half').price, base / 2);
  }
});

test('release and getSelectedSeats', () => {
  const map = createSeatMap('ses-003');
  map.selectSeat('A1', 'full');
  map.selectSeat('A2', 'half');
  assert.deepEqual(map.getSelectedSeats().map((s) => s.code), ['A1', 'A2']);
  assert.equal(map.releaseSeat('A1'), true);
  assert.equal(map.releaseSeat('A1'), false);
  assert.deepEqual(map.getSelectedSeats().map((s) => s.code), ['A2']);
  map.getSelectedSeats()[0].price = 0;
  assert.equal(map.getSelectedSeats()[0].price, 36 / 2);
});

test('confirmBooking totals, marks seats occupied and clears selection', () => {
  const map = createSeatMap('ses-004');
  assert.throws(() => map.confirmBooking(), RangeError);
  map.selectSeat('D4', 'full');
  map.selectSeat('D5', 'half');
  const booking = map.confirmBooking();
  assert.equal(booking.sessionId, 'ses-004');
  assert.equal(booking.total, 96);
  assert.equal(booking.seats.length, 2);
  assert.deepEqual(map.getSelectedSeats(), []);
  assert.throws(() => map.selectSeat('D4', 'full'), /occupied/);
  assert.throws(() => map.confirmBooking(), RangeError);
});

test('occupied list is copied, not shared', () => {
  const occ = ['F8'];
  const map = createSeatMap('ses-001', occ);
  occ.length = 0;
  assert.throws(() => map.selectSeat('F8', 'full'), /occupied/);
});
