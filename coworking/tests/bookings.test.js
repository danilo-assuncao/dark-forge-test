'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createBookingScheduler } = require('../bookings');

test('coworking/bookings.js', async (t) => {
  await t.test('quoteSlot calculates price correctly without discount (7 hours)', () => {
    const scheduler = createBookingScheduler();
    const quote = scheduler.quoteSlot({
      spaceId: 'sala-focus-4p', // 65.00/hour
      dateIso: '2026-11-20',
      startHour: 8,
      endHour: 15, // exactly 7 hours
      attendees: 3
    });
    
    assert.strictEqual(quote.price, 455);
    assert.strictEqual(quote.hasDiscount, false);
    assert.strictEqual(quote.spaceId, 'sala-focus-4p');
  });

  await t.test('quoteSlot applies 20% discount for exactly 8 hours', () => {
    const scheduler = createBookingScheduler();
    const quote = scheduler.quoteSlot({
      spaceId: 'sala-focus-4p',
      dateIso: '2026-11-20',
      startHour: 8,
      endHour: 16, // exactly 8 hours
      attendees: 3
    });
    
    assert.strictEqual(quote.price, 416); // 8 * 65 = 520, 520 * 0.8 = 416
    assert.strictEqual(quote.hasDiscount, true);
  });

  await t.test('quoteSlot applies 20% discount for maximum 12 hours (8 to 20)', () => {
    const scheduler = createBookingScheduler();
    const quote = scheduler.quoteSlot({
      spaceId: 'sala-focus-4p',
      dateIso: '2026-11-20',
      startHour: 8,
      endHour: 20, // 12 hours
      attendees: 3
    });
    
    assert.strictEqual(quote.price, 624); // 12 * 65 = 780, 780 * 0.8 = 624
    assert.strictEqual(quote.hasDiscount, true);
  });
  
  await t.test('quoteSlot handles float precision in discount', () => {
    const scheduler = createBookingScheduler();
    // hot-desk rate is 22.00
    const quote = scheduler.quoteSlot({
      spaceId: 'hot-desk',
      dateIso: '2026-11-20',
      startHour: 8,
      endHour: 16, // 8 hours
      attendees: 1
    });
    
    // 8 * 22 = 176, 176 * 0.8 = 140.8
    // With floats this can be 140.80000000000001
    // We expect exactly 140.8
    assert.strictEqual(quote.price, 140.8);
  });

  await t.test('quoteSlot validates business hours and fractional hours', () => {
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
        endHour: 12 // Equal hours
      });
    }, /startHour must be less than endHour/);

    assert.throws(() => {
      scheduler.quoteSlot({
        spaceId: 'hot-desk',
        dateIso: '2026-11-20',
        startHour: 9.5, // Fractional
        endHour: 11
      });
    }, /startHour and endHour must be integers/);
    
    assert.throws(() => {
      scheduler.quoteSlot({
        spaceId: 'hot-desk',
        dateIso: '2026-11-20',
        startHour: '9', // string
        endHour: 11
      });
    }, /startHour and endHour must be integers/);
  });

  await t.test('quoteSlot validates input object', () => {
    const scheduler = createBookingScheduler();
    
    assert.throws(() => {
      scheduler.quoteSlot(null);
    }, /Input must be a non-null object/);
    
    assert.throws(() => {
      scheduler.quoteSlot(undefined);
    }, /Input must be a non-null object/);
  });
  
  await t.test('quoteSlot validates space', () => {
    const scheduler = createBookingScheduler();
    
    assert.throws(() => {
      scheduler.quoteSlot({
        spaceId: 'non-existent',
        dateIso: '2026-11-20',
        startHour: 10,
        endHour: 12
      });
    }, /Space not found/);
  });
  
  await t.test('quoteSlot validates dates', () => {
    const scheduler = createBookingScheduler();
    
    const base = {
      spaceId: 'hot-desk',
      startHour: 10,
      endHour: 12
    };

    assert.throws(() => scheduler.quoteSlot({ ...base, dateIso: '2026-1-5' }), /dateIso must be in YYYY-MM-DD/);
    assert.throws(() => scheduler.quoteSlot({ ...base, dateIso: '2026-01-05T00:00:00Z' }), /dateIso must be in YYYY-MM-DD/);
    assert.throws(() => scheduler.quoteSlot({ ...base, dateIso: ' 2026-01-05' }), /dateIso must be in YYYY-MM-DD/);
    assert.throws(() => scheduler.quoteSlot({ ...base, dateIso: undefined }), /dateIso must be in YYYY-MM-DD/);
    assert.throws(() => scheduler.quoteSlot({ ...base, dateIso: '2026-02-31' }), /dateIso must be a valid calendar date/);
  });

  await t.test('quoteSlot validates attendees capacity and type', () => {
    const scheduler = createBookingScheduler();
    const base = { spaceId: 'sala-focus-4p', dateIso: '2026-11-20', startHour: 10, endHour: 12 };
    
    assert.throws(() => scheduler.quoteSlot({ ...base, attendees: 5 }), /exceed maximum capacity/);
    assert.throws(() => scheduler.quoteSlot({ ...base, attendees: 0 }), /attendees must be a positive integer/);
    assert.throws(() => scheduler.quoteSlot({ ...base, attendees: 1.5 }), /attendees must be a positive integer/);
    
    // Default to 1 if not passed
    const quote = scheduler.quoteSlot({ ...base });
    assert.strictEqual(quote.attendees, 1);
  });

  await t.test('bookSlot creates a frozen booking with correct ID and discount', () => {
    const scheduler = createBookingScheduler();
    const booking = scheduler.bookSlot({
      spaceId: 'hot-desk',
      dateIso: '2026-11-21',
      startHour: 8,
      endHour: 16,
      attendees: 1
    });

    assert.match(booking.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    assert.strictEqual(booking.price, 140.8); 
    assert.strictEqual(booking.hasDiscount, true);
    assert.strictEqual(Object.isFrozen(booking), true);
  });

  await t.test('scheduler instances are isolated', () => {
    const s1 = createBookingScheduler();
    const s2 = createBookingScheduler();
    
    s1.bookSlot({ spaceId: 'hot-desk', dateIso: '2026-11-20', startHour: 10, endHour: 12 });
    
    assert.strictEqual(s1.listBookingsForDate('2026-11-20').length, 1);
    assert.strictEqual(s2.listBookingsForDate('2026-11-20').length, 0);
  });

  await t.test('bookSlot overlapping scenarios', async (t) => {
    const scheduler = createBookingScheduler();
    const date = '2026-11-20';
    
    scheduler.bookSlot({
      spaceId: 'sala-board-12p',
      dateIso: date,
      startHour: 10,
      endHour: 14,
      attendees: 10
    });

    await t.test('rejects exact duplicate', () => {
      assert.throws(() => {
        scheduler.bookSlot({ spaceId: 'sala-board-12p', dateIso: date, startHour: 10, endHour: 14, attendees: 10 });
      }, /overlaps/);
      assert.strictEqual(scheduler.listBookingsForDate(date).length, 1);
    });

    await t.test('rejects partial overlap at start', () => {
      assert.throws(() => {
        scheduler.bookSlot({ spaceId: 'sala-board-12p', dateIso: date, startHour: 9, endHour: 11, attendees: 10 });
      }, /overlaps/);
      assert.strictEqual(scheduler.listBookingsForDate(date).length, 1);
    });

    await t.test('rejects partial overlap at end', () => {
      assert.throws(() => {
        scheduler.bookSlot({ spaceId: 'sala-board-12p', dateIso: date, startHour: 13, endHour: 15, attendees: 10 });
      }, /overlaps/);
    });
    
    await t.test('rejects inner overlap', () => {
      assert.throws(() => {
        scheduler.bookSlot({ spaceId: 'sala-board-12p', dateIso: date, startHour: 11, endHour: 13, attendees: 10 });
      }, /overlaps/);
    });
    
    await t.test('rejects outer overlap', () => {
      assert.throws(() => {
        scheduler.bookSlot({ spaceId: 'sala-board-12p', dateIso: date, startHour: 9, endHour: 15, attendees: 10 });
      }, /overlaps/);
    });

    await t.test('allows back-to-back', () => {
      assert.doesNotThrow(() => {
        scheduler.bookSlot({ spaceId: 'sala-board-12p', dateIso: date, startHour: 8, endHour: 10, attendees: 10 });
      });
      assert.doesNotThrow(() => {
        scheduler.bookSlot({ spaceId: 'sala-board-12p', dateIso: date, startHour: 14, endHour: 16, attendees: 10 });
      });
    });

    await t.test('allows exact same hours on different date', () => {
      assert.doesNotThrow(() => {
        scheduler.bookSlot({ spaceId: 'sala-board-12p', dateIso: '2026-11-21', startHour: 10, endHour: 14, attendees: 10 });
      });
    });
    
    await t.test('allows exact same hours on different space', () => {
      assert.doesNotThrow(() => {
        scheduler.bookSlot({ spaceId: 'auditorio-40p', dateIso: date, startHour: 10, endHour: 14, attendees: 10 });
      });
    });
  });
});
