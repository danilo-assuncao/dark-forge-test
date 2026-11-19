/* Academia weekly schedule engine: weekly slots, student bookings persisted in
   localStorage, time-clash validation, seat check-in and waitlist when full.
   Depends only on classes.js. Exposed as window.AcademiaSchedule in the browser
   and via module.exports in Node. */
(function (root) {
  'use strict';

  var Classes = (typeof module !== 'undefined' && module.exports)
    ? require('./classes.js')
    : root.AcademiaClasses;

  var STORAGE_KEY = 'academia.schedule.v1';

  // day: 0 = Sunday ... 6 = Saturday.
  var DAYS = [
    { id: 0, name: 'Domingo' }, { id: 1, name: 'Segunda' }, { id: 2, name: 'Terca' },
    { id: 3, name: 'Quarta' }, { id: 4, name: 'Quinta' }, { id: 5, name: 'Sexta' },
    { id: 6, name: 'Sabado' },
  ];

  function slot(id, classId, day, start, instructorId) {
    return { id: id, classId: classId, day: day, start: start, instructorId: instructorId };
  }

  var SLOTS = [
    slot('ff-seg-0700', 'forca-funcional', 1, '07:00', 'carla-mendes'),
    slot('sp-seg-1830', 'spinning', 1, '18:30', 'rafael-souza'),
    slot('yo-ter-0800', 'yoga-mobilidade', 2, '08:00', 'helena-prado'),
    slot('bx-ter-1900', 'boxe', 2, '19:00', 'bruno-tavares'),
    slot('ff-qua-1800', 'forca-funcional', 3, '18:00', 'bruno-tavares'),
    slot('sp-qua-1830', 'spinning', 3, '18:30', 'rafael-souza'),
    slot('yo-qui-0800', 'yoga-mobilidade', 4, '08:00', 'helena-prado'),
    slot('bx-qui-1900', 'boxe', 4, '19:00', 'bruno-tavares'),
    slot('sp-sex-0700', 'spinning', 5, '07:00', 'rafael-souza'),
    slot('ff-sex-1800', 'forca-funcional', 5, '18:00', 'carla-mendes'),
    slot('yo-sab-0900', 'yoga-mobilidade', 6, '09:00', 'helena-prado'),
    slot('bx-sab-1000', 'boxe', 6, '10:00', 'bruno-tavares'),
  ];

  function getSlot(id) {
    for (var i = 0; i < SLOTS.length; i++) if (SLOTS[i].id === id) return SLOTS[i];
    return null;
  }

  // 'HH:MM' -> minutes since midnight; null when malformed.
  function toMinutes(time) {
    var m = /^(\d{2}):(\d{2})$/.exec(String(time));
    if (!m) return null;
    var h = Number(m[1]), min = Number(m[2]);
    if (h > 23 || min > 59) return null;
    return h * 60 + min;
  }

  function toTime(minutes) {
    var h = Math.floor(minutes / 60), m = minutes % 60;
    return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
  }

  function range(s) {
    var c = Classes.getClass(s.classId);
    var start = toMinutes(s.start);
    if (!c || start === null) return null;
    return { start: start, end: start + c.durationMin };
  }

  function endTime(s) {
    var r = range(s);
    return r ? toTime(r.end) : null;
  }

  // Two slots clash when on the same day and their [start, end) ranges overlap.
  // Unresolvable slots fail closed (treated as clashing).
  function slotsOverlap(a, b) {
    if (!a || !b) return true;
    if (a.day !== b.day) return false;
    var ra = range(a), rb = range(b);
    if (!ra || !rb) return true;
    return ra.start < rb.end && rb.start < ra.end;
  }

  function slotsForDay(day) {
    return SLOTS.filter(function (s) { return s.day === day; })
      .sort(function (a, b) { return toMinutes(a.start) - toMinutes(b.start); });
  }

  function emptyState() { return { booked: [], waitlist: [] }; }

  function cleanIds(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length; i++) {
      if (typeof list[i] === 'string' && getSlot(list[i]) && out.indexOf(list[i]) === -1) out.push(list[i]);
    }
    return out;
  }

  function count(n) {
    n = Math.floor(Number(n));
    return n === n && n > 0 ? n : 0;
  }

  // Creates a schedule bound to a storage (anything with getItem/setItem;
  // defaults to window.localStorage, falling back to memory when unavailable).
  // opts.occupancy: { slotId: seats already taken by other students }.
  // opts.waiting:   { slotId: other students already on the waitlist }.
  function createSchedule(storage, opts) {
    opts = opts || {};
    // Local copies: the schedule never mutates caller-supplied objects.
    var occupancy = Object.assign({}, opts.occupancy);
    var waiting = Object.assign({}, opts.waiting);
    var released = {}; // seats freed by other students during this session

    if (!storage) {
      try { storage = root.localStorage; } catch (e) { storage = null; }
    }
    var memory = null;

    function load() {
      var raw = null;
      try { raw = memory !== null ? memory : (storage ? storage.getItem(STORAGE_KEY) : null); } catch (e) { raw = null; }
      if (!raw) return emptyState();
      try {
        var data = JSON.parse(raw);
        var booked = cleanIds(data && data.booked);
        var waitlist = cleanIds(data && data.waitlist).filter(function (id) { return booked.indexOf(id) === -1; });
        return { booked: booked, waitlist: waitlist };
      } catch (e) { return emptyState(); }
    }

    function save(state) {
      var raw = JSON.stringify(state);
      try {
        if (!storage) throw new Error('no storage');
        storage.setItem(STORAGE_KEY, raw);
        memory = null; // storage is authoritative again after a successful write
      } catch (e) { memory = raw; }
    }

    function taken(slotId, state) {
      var s = getSlot(slotId);
      if (!s) return null;
      var base = count(occupancy[slotId]) - count(released[slotId]);
      return Math.max(0, base) + (state.booked.indexOf(slotId) !== -1 ? 1 : 0);
    }

    function seatsLeft(slotId) {
      var s = getSlot(slotId);
      if (!s) return null;
      return Classes.spotsLeft(s.classId, taken(slotId, load()));
    }

    function waitlistPosition(slotId) {
      var state = load();
      if (state.waitlist.indexOf(slotId) === -1) return null;
      return count(waiting[slotId]) + 1;
    }

    // Clashes are enforced against confirmed bookings and waitlisted slots.
    function clashWith(slotId, state) {
      var s = getSlot(slotId);
      var all = state.booked.concat(state.waitlist);
      for (var i = 0; i < all.length; i++) {
        if (all[i] !== slotId && slotsOverlap(s, getSlot(all[i]))) return all[i];
      }
      return null;
    }

    // Books a seat; joins the waitlist when the session is full.
    function book(slotId) {
      var s = getSlot(slotId);
      if (!s) return { ok: false, reason: 'unknown-slot' };
      var state = load();
      if (state.booked.indexOf(slotId) !== -1) return { ok: false, reason: 'already-booked' };
      if (state.waitlist.indexOf(slotId) !== -1) return { ok: false, reason: 'already-waitlisted', position: waitlistPosition(slotId) };
      var clash = clashWith(slotId, state);
      if (clash) return { ok: false, reason: 'conflict', with: clash };
      var left = Classes.spotsLeft(s.classId, taken(slotId, state));
      if (left === null) return { ok: false, reason: 'invalid-occupancy' };
      if (left > 0) {
        state.booked.push(slotId);
        save(state);
        return { ok: true, status: 'booked', spotsLeft: left - 1 };
      }
      state.waitlist.push(slotId);
      save(state);
      return { ok: true, status: 'waitlisted', position: count(waiting[slotId]) + 1 };
    }

    // Cancels a booking or leaves the waitlist.
    function cancel(slotId) {
      var state = load();
      var bi = state.booked.indexOf(slotId);
      var wi = state.waitlist.indexOf(slotId);
      if (bi === -1 && wi === -1) return { ok: false, reason: 'not-found' };
      if (bi !== -1) state.booked.splice(bi, 1);
      if (wi !== -1) state.waitlist.splice(wi, 1);
      save(state);
      return { ok: true, status: bi !== -1 ? 'cancelled' : 'left-waitlist' };
    }

    // Simulates another student freeing a seat. Promotes the student from the
    // waitlist only when they are first in line and the promotion would not clash.
    function releaseSeat(slotId) {
      var s = getSlot(slotId);
      if (!s) return { ok: false, reason: 'unknown-slot' };
      if (count(occupancy[slotId]) - count(released[slotId]) <= 0) return { ok: false, reason: 'no-seat-held' };
      // The seat is always handed to the queue first: someone ahead takes it.
      if (count(waiting[slotId]) > 0) {
        waiting[slotId] = count(waiting[slotId]) - 1;
        occupancy[slotId] = count(occupancy[slotId]); // seat is taken by that waiter
        return { ok: true, promoted: false };
      }
      released[slotId] = count(released[slotId]) + 1;
      var state = load();
      var wi = state.waitlist.indexOf(slotId);
      // First in line: promote unless it would clash (only possible with
      // tampered storage); in that case the student stays waitlisted and the
      // seat is left open.
      if (wi !== -1 && !clashWith(slotId, state)) {
        state.waitlist.splice(wi, 1);
        state.booked.push(slotId);
        save(state);
        return { ok: true, promoted: true };
      }
      return { ok: true, promoted: false };
    }

    function listBookings() { return load().booked.map(getSlot); }
    function listWaitlist() { return load().waitlist.map(getSlot); }

    return {
      book: book,
      cancel: cancel,
      releaseSeat: releaseSeat,
      seatsLeft: seatsLeft,
      waitlistPosition: waitlistPosition,
      listBookings: listBookings,
      listWaitlist: listWaitlist,
      isBooked: function (id) { return load().booked.indexOf(id) !== -1; },
      isWaitlisted: function (id) { return load().waitlist.indexOf(id) !== -1; },
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY,
    DAYS: DAYS,
    SLOTS: SLOTS,
    getSlot: getSlot,
    slotsForDay: slotsForDay,
    toMinutes: toMinutes,
    endTime: endTime,
    slotsOverlap: slotsOverlap,
    createSchedule: createSchedule,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.AcademiaSchedule = api;
})(typeof window !== 'undefined' ? window : this);
