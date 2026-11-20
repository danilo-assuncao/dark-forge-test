'use strict';

const { getSessionById, getBaseTicketPrice } = require('./movies.js');

const ROWS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F']);
const COLUMNS = 8;
const SEAT_CODES = Object.freeze(
  ROWS.flatMap((row) => Array.from({ length: COLUMNS }, (_, i) => `${row}${i + 1}`)),
);
const TICKET_MULTIPLIERS = Object.freeze({ full: 1, half: 0.5 });

const SEAT_PATTERN = /^[A-F][1-8]$/;

function assertSeatCode(code) {
  if (typeof code !== 'string') {
    throw new TypeError('seat code must be a string');
  }
  if (!SEAT_PATTERN.test(code)) {
    throw new RangeError(`invalid seat code: ${code} (expected A1..F8)`);
  }
}

function toCents(value) {
  return Math.round(value * 100) / 100;
}

function createSeatMap(sessionId, occupiedSeats = []) {
  const session = getSessionById(sessionId);
  if (session === null) {
    throw new RangeError(`unknown session: ${sessionId}`);
  }
  if (!Array.isArray(occupiedSeats)) {
    throw new TypeError('occupiedSeats must be an array');
  }
  const occupied = new Set();
  for (const code of occupiedSeats) {
    assertSeatCode(code);
    occupied.add(code);
  }
  const basePrice = getBaseTicketPrice(session.roomType);
  const selected = new Map();

  function selectSeat(code, ticketKind) {
    assertSeatCode(code);
    if (typeof ticketKind !== 'string') {
      throw new TypeError('ticketKind must be a string');
    }
    if (!Object.prototype.hasOwnProperty.call(TICKET_MULTIPLIERS, ticketKind)) {
      throw new RangeError(`ticketKind must be one of: ${Object.keys(TICKET_MULTIPLIERS).join(', ')}`);
    }
    if (occupied.has(code)) {
      throw new RangeError(`seat already occupied: ${code}`);
    }
    if (selected.has(code)) {
      throw new RangeError(`seat already selected: ${code}`);
    }
    const seat = Object.freeze({
      code,
      ticketKind,
      price: toCents(basePrice * TICKET_MULTIPLIERS[ticketKind]),
    });
    selected.set(code, seat);
    return seat;
  }

  function releaseSeat(code) {
    assertSeatCode(code);
    return selected.delete(code);
  }

  function getSelectedSeats() {
    return Array.from(selected.values(), (s) => ({ ...s }));
  }

  function confirmBooking() {
    if (selected.size === 0) {
      throw new RangeError('no seats selected');
    }
    const seats = getSelectedSeats();
    const total = toCents(seats.reduce((sum, s) => sum + s.price, 0));
    for (const s of seats) occupied.add(s.code);
    selected.clear();
    return { sessionId: session.id, seats, total };
  }

  return { sessionId: session.id, selectSeat, releaseSeat, getSelectedSeats, confirmBooking };
}

module.exports = { ROWS, COLUMNS, SEAT_CODES, TICKET_MULTIPLIERS, createSeatMap };
