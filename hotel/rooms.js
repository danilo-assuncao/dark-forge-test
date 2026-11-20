/* Hotel rooms: immutable catalog of suites and capacity lookups.
   Exposed as window.HotelRooms (and via module.exports in Node). */
(function (root) {
  'use strict';

  function freeze(room) {
    return Object.freeze(room);
  }

  // dailyRate is in BRL (reais); dailyRateCents avoids float rounding downstream.
  var ROOMS = Object.freeze([
    freeze({ id: 'standard', name: 'Suite Standard', dailyRate: 320, dailyRateCents: 32000, maxGuests: 2 }),
    freeze({ id: 'deluxe', name: 'Suite Deluxe', dailyRate: 540, dailyRateCents: 54000, maxGuests: 3 }),
    freeze({ id: 'family', name: 'Suite Familia', dailyRate: 680, dailyRateCents: 68000, maxGuests: 4 }),
    freeze({ id: 'presidential', name: 'Suite Presidencial', dailyRate: 1250, dailyRateCents: 125000, maxGuests: 4 })
  ]);

  // Returns rooms that fit at least `minGuests` guests (all rooms when omitted).
  function listRooms(options) {
    var opts = options === undefined || options === null ? {} : options;
    var minGuests = opts.minGuests;
    if (minGuests === undefined || minGuests === null) {
      return ROOMS.slice();
    }
    if (typeof minGuests !== 'number' || !Number.isInteger(minGuests) || minGuests < 1) {
      throw new RangeError('minGuests must be a positive integer');
    }
    return ROOMS.filter(function (room) { return room.maxGuests >= minGuests; });
  }

  // Returns the room for the id, or null when unknown.
  function getRoomById(roomId) {
    if (typeof roomId !== 'string') { return null; }
    for (var i = 0; i < ROOMS.length; i++) {
      if (ROOMS[i].id === roomId) { return ROOMS[i]; }
    }
    return null;
  }

  var api = { ROOMS: ROOMS, listRooms: listRooms, getRoomById: getRoomById };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.HotelRooms = api;
})(typeof window !== 'undefined' ? window : globalThis);
