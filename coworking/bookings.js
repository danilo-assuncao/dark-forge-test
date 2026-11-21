'use strict';

const { getSpaceById } = require('./spaces');
const crypto = require('node:crypto');

function createBookingScheduler() {
  const bookings = [];

  function validateInput(input) {
    if (!input || typeof input !== 'object') {
      throw new Error('Input must be a non-null object');
    }

    const { spaceId, dateIso, startHour, endHour, attendees = 1 } = input;

    if (!dateIso || typeof dateIso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      throw new Error('dateIso must be in YYYY-MM-DD format');
    }
    
    const parsedDate = new Date(dateIso);
    if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== dateIso) {
      throw new Error('dateIso must be a valid calendar date');
    }

    if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) {
      throw new Error('startHour and endHour must be integers');
    }
    if (startHour < 8 || endHour > 20 || startHour >= endHour) {
      throw new Error('Hours must be between 8 and 20, and startHour must be less than endHour');
    }

    const space = getSpaceById(spaceId);
    if (!space) {
      throw new Error('Space not found');
    }

    if (!Number.isInteger(attendees) || attendees < 1) {
      throw new Error('attendees must be a positive integer');
    }
    if (attendees > space.maxCapacity) {
      throw new Error(`Attendees (${attendees}) exceed maximum capacity of space ${spaceId} (${space.maxCapacity})`);
    }

    return { space, validAttendees: attendees };
  }

  function checkOverlap(spaceId, dateIso, startHour, endHour) {
    const isOverlapping = bookings.some(b => 
      b.spaceId === spaceId && 
      b.dateIso === dateIso && 
      startHour < b.endHour && endHour > b.startHour
    );
    
    if (isOverlapping) {
      throw new Error('Booking overlaps with an existing reservation');
    }
  }

  function quoteSlot(input) {
    if (!input || typeof input !== 'object') {
      throw new Error('Input must be a non-null object');
    }

    const { space, validAttendees } = validateInput(input);
    const { spaceId, dateIso, startHour, endHour } = input;
    
    const hours = endHour - startHour;
    let basePrice = space.hourlyRate * hours;
    let hasDiscount = false;
    let finalPrice = basePrice;
    
    if (hours >= 8) {
      hasDiscount = true;
      finalPrice = Math.round(basePrice * 100 * 0.8) / 100;
    }

    return {
      spaceId,
      dateIso,
      startHour,
      endHour,
      attendees: validAttendees,
      price: finalPrice,
      hasDiscount
    };
  }

  function bookSlot(input) {
    const quote = quoteSlot(input);
    
    checkOverlap(quote.spaceId, quote.dateIso, quote.startHour, quote.endHour);
    
    const booking = Object.freeze({
      id: crypto.randomUUID(),
      spaceId: quote.spaceId,
      dateIso: quote.dateIso,
      startHour: quote.startHour,
      endHour: quote.endHour,
      attendees: quote.attendees,
      price: quote.price,
      hasDiscount: quote.hasDiscount
    });
    
    bookings.push(booking);
    
    return booking;
  }

  function listBookingsForDate(dateIso) {
    return bookings.filter(b => b.dateIso === dateIso);
  }

  return {
    quoteSlot,
    bookSlot,
    listBookingsForDate
  };
}

module.exports = {
  createBookingScheduler
};
