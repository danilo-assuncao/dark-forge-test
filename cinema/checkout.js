'use strict';

const { getSessionById } = require('./movies.js');
const { createSeatMap } = require('./seats.js');
const { calculateSnacksTotal } = require('./snacks.js');

// Sequential, deterministic identifiers are unique within this module instance.
// Four hex digits allow 65,536 orders; never wrap and reuse an identifier.
let nextProtocol = 0;

/**
 * Build an order in BRL from seats [{ code, ticketKind }] and snacks
 * [{ snackId, qty }]. Catalog prices override any supplied prices.
 * This local calculation does not reserve seats or persist orders.
 */
function buildCinemaOrder({ sessionId, seats, snacks = [], couponCode = '', buyerName }) {
  if (typeof buyerName !== 'string' || buyerName.trim() === '') {
    throw new TypeError('buyerName must be a non-empty string');
  }
  if (typeof couponCode !== 'string') throw new TypeError('couponCode must be a string');
  if (!Array.isArray(seats)) throw new TypeError('seats must be an array');
  const session = getSessionById(sessionId);
  if (!session) throw new RangeError('unknown session');
  const seatMap = createSeatMap(sessionId);
  for (const seat of seats) {
    if (!seat || typeof seat !== 'object' || Array.isArray(seat)) {
      throw new TypeError('each seat must be an object');
    }
    seatMap.selectSeat(seat.code, seat.ticketKind);
  }
  // Reject sparse snack arrays instead of silently skipping missing items.
  const snackSummary = calculateSnacksTotal(Array.isArray(snacks) ? Array.from(snacks) : snacks);
  const selectedSeats = seatMap.getSelectedSeats();
  const ticketCents = selectedSeats.reduce((sum, seat) => sum + Math.round(seat.price * 100), 0);
  const normalizedCoupon = couponCode.replace(/\s/g, '').toUpperCase();
  const discountCents = normalizedCoupon === 'DANCINE15' ? Math.round(ticketCents * 15 / 100) : 0;
  const feeCents = selectedSeats.length > 0 ? 450 : 0;
  const snackCents = Math.round(snackSummary.total * 100);
  if (nextProtocol > 0xFFFF) throw new RangeError('cinema protocol capacity exhausted');
  const protocol = `CINE-${(nextProtocol++).toString(16).toUpperCase().padStart(4, '0')}`;

  return {
    protocol,
    sessionId: session.id,
    buyerName: buyerName.trim(),
    seats: selectedSeats,
    snacks: snackSummary,
    couponCode: normalizedCoupon,
    ticketsSubtotal: ticketCents / 100,
    discount: discountCents / 100,
    convenienceFee: feeCents / 100,
    total: (ticketCents - discountCents + snackCents + feeCents) / 100,
  };
}

module.exports = { buildCinemaOrder };
