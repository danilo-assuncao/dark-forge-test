'use strict';

const { getSpaceById } = require('./spaces');

function createBookingScheduler() {
  const bookings = [];

  function validateInput({ spaceId, dateIso, startHour, endHour, attendees }) {
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

    if (attendees !== undefined) {
      if (!Number.isInteger(attendees) || attendees < 1) {
        throw new Error('attendees must be a positive integer');
      }
      if (attendees > space.maxCapacity) {
        throw new Error(`Attendees (${attendees}) exceed maximum capacity of space ${spaceId} (${space.maxCapacity})`);
      }
    }

    return space;
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

  function quoteSlot({ spaceId, dateIso, startHour, endHour, attendees }) {
    const space = validateInput({ spaceId, dateIso, startHour, endHour, attendees });
    
    const hours = endHour - startHour;
    let price = space.hourlyRate * hours;
    let hasDiscount = false;
    
    if (hours >= 8) {
      price *= 0.8;
      hasDiscount = true;
    }

    return {
      spaceId,
      dateIso,
      startHour,
      endHour,
      attendees,
      price,
      hasDiscount
    };
  }

  function bookSlot({ spaceId, dateIso, startHour, endHour, attendees }) {
    const quote = quoteSlot({ spaceId, dateIso, startHour, endHour, attendees });
    
    checkOverlap(spaceId, dateIso, startHour, endHour);
    
    const booking = {
      id: Math.random().toString(36).substring(2, 11),
      spaceId,
      dateIso,
      startHour,
      endHour,
      attendees,
      price: quote.price,
      hasDiscount: quote.hasDiscount
    };
    
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
