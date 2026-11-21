'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createBookingScheduler } = require('../bookings');

test('coworking/bookings.js', async (t) => {
  await t.test('quoteSlot calculates price correctly without discount', () => {
    const scheduler = createBookingScheduler();
    const quote = scheduler.quoteSlot({
      spaceId: 'sala-focus-4p', // 65.00/hour
      dateIso: '2026-11-20',
      startHour: 10,
      endHour: 12,
      attendees: 3
    });
    
    assert.strictEqual(quote.price, 130);
    assert.strictEqual(quote.hasDiscount, false);
    assert.strictEqual(quote.spaceId, 'sala-focus-4p');
  });

  await t.test('quoteSlot applies 20% discount for >= 8 hours', () => {
    const scheduler = createBookingScheduler();
    const quote = scheduler.quoteSlot({
      spaceId: 'sala-focus-4p', // 65.00/hour
      dateIso: '2026-11-20',
      startHour: 9,
      endHour: 18, // 9 hours
      attendees: 3
    });
    
    // 9 * 65 = 585, with 20% discount = 468
    assert.strictEqual(quote.price, 468);
    assert.strictEqual(quote.hasDiscount, true);
  });

  await t.test('quoteSlot validates business hours', () => {
    const scheduler = createBookingScheduler();
    
    assert.throws(() => {
      scheduler.quoteSlot({
        spaceId: 'hot-desk',
        dateIso: '2026-11-20',
        startHour: 7, // Too early
        endHour: 10
      });
    }, /Hours must be between 8 and 20/);

    assert.throws(() => {
      scheduler.quoteSlot({
        spaceId: 'hot-desk',
        dateIso: '2026-11-20',
        startHour: 18,
        endHour: 21 // Too late
      });
    }, /Hours must be between 8 and 20/);

    assert.throws(() => {
      scheduler.quoteSlot({
        spaceId: 'hot-desk',
        dateIso: '2026-11-20',
        startHour: 12,
        endHour: 10 // Invalid range
      });
    }, /startHour must be less than endHour/);
  });

  await t.test('quoteSlot validates capacity', () => {
    const scheduler = createBookingScheduler();
    
    assert.throws(() => {
      scheduler.quoteSlot({
        spaceId: 'sala-focus-4p',
        dateIso: '2026-11-20',
        startHour: 10,
        endHour: 12,
        attendees: 5 // Exceeds max capacity of 4
      });
    }, /exceed maximum capacity/);
  });

  await t.test('bookSlot creates a booking and listBookingsForDate retrieves it', () => {
    const scheduler = createBookingScheduler();
    const date = '2026-11-21';
    
    const booking = scheduler.bookSlot({
      spaceId: 'hot-desk',
      dateIso: date,
      startHour: 9,
      endHour: 12,
      attendees: 1
    });

    assert.ok(booking.id);
    assert.strictEqual(booking.price, 66); // 3 * 22
    
    const bookings = scheduler.listBookingsForDate(date);
    assert.strictEqual(bookings.length, 1);
    assert.deepStrictEqual(bookings[0], booking);
    
    // Different date should return empty array
    const otherDateBookings = scheduler.listBookingsForDate('2026-11-22');
    assert.strictEqual(otherDateBookings.length, 0);
  });

  await t.test('bookSlot prevents overlapping bookings', () => {
    const scheduler = createBookingScheduler();
    const date = '2026-11-20';
    
    scheduler.bookSlot({
      spaceId: 'sala-board-12p',
      dateIso: date,
      startHour: 10,
      endHour: 14,
      attendees: 10
    });

    // Overlaps at the end
    assert.throws(() => {
      scheduler.bookSlot({
        spaceId: 'sala-board-12p',
        dateIso: date,
        startHour: 9,
        endHour: 11,
        attendees: 10
      });
    }, /overlaps/);

    // Overlaps at the start
    assert.throws(() => {
      scheduler.bookSlot({
        spaceId: 'sala-board-12p',
        dateIso: date,
        startHour: 13,
        endHour: 15,
        attendees: 10
      });
    }, /overlaps/);

    // Completely inside
    assert.throws(() => {
      scheduler.bookSlot({
        spaceId: 'sala-board-12p',
        dateIso: date,
        startHour: 11,
        endHour: 13,
        attendees: 10
      });
    }, /overlaps/);

    // Surrounding
    assert.throws(() => {
      scheduler.bookSlot({
        spaceId: 'sala-board-12p',
        dateIso: date,
        startHour: 9,
        endHour: 15,
        attendees: 10
      });
    }, /overlaps/);

    // Back-to-back should be allowed
    assert.doesNotThrow(() => {
      scheduler.bookSlot({
        spaceId: 'sala-board-12p',
        dateIso: date,
        startHour: 8,
        endHour: 10,
        attendees: 10
      });
    });

    assert.doesNotThrow(() => {
      scheduler.bookSlot({
        spaceId: 'sala-board-12p',
        dateIso: date,
        startHour: 14,
        endHour: 16,
        attendees: 10
      });
    });
    
    // Different space should be allowed
    assert.doesNotThrow(() => {
      scheduler.bookSlot({
        spaceId: 'auditorio-40p',
        dateIso: date,
        startHour: 10,
        endHour: 14,
        attendees: 10
      });
    });
  });
});
