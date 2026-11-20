/* Imóveis visit scheduler: books in-person (presencial) or video visits for a
   listing in a date + shift (turno) slot with a broker (corretor), validates
   the prospect's contact data and issues a sequential IMOB-XXXX protocol.
   Values are stored as given (length-capped); consumers must escape them on
   output (use textContent, never innerHTML). Each broker holds at most one visit per date+shift. Dates are YYYY-MM-DD
   (calendar days, no timezone math). Exposed as window.ImoveisVisits in the
   browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var MODES = [
    { id: 'presencial', name: 'Presencial' },
    { id: 'video', name: 'Vídeo' },
  ];

  var SHIFTS = [
    { id: 'manha', name: 'Manhã', hours: '09:00–12:00', end: 12 },
    { id: 'tarde', name: 'Tarde', hours: '13:00–18:00', end: 18 },
  ];

  // days: weekday numbers (0 = Sunday); modes: visit modes the broker serves.
  var BROKERS = [
    { id: 'cor-001', name: 'Marina Duarte', days: [1, 2, 3, 4, 5], shifts: ['manha', 'tarde'], modes: ['presencial', 'video'] },
    { id: 'cor-002', name: 'Rafael Nogueira', days: [1, 2, 3, 4, 5, 6], shifts: ['manha', 'tarde'], modes: ['presencial'] },
    { id: 'cor-003', name: 'Camila Prado', days: [2, 4, 6], shifts: ['tarde'], modes: ['video'] },
  ];

  var MAX_DAYS_AHEAD = 60;
  var MAX_NAME = 100, MAX_EMAIL = 254, MAX_LISTING_ID = 64;
  var LISTING_ID_RE = /^[\w-]+$/;
  var MAX_CANCELLED_KEPT = 100;
  var UNSAFE_NAME_RE = /[\u0000-\u001f\u007f-\u009f<>\u200e\u200f\u202a-\u202e\u2066-\u2069]/;
  var PROTOCOL_RE = /^IMOB-\d{4,}$/;

  function byId(list, id) {
    return list.filter(function (x) { return x.id === id; })[0] || null;
  }

  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof s === 'string' ? s : '');
    if (!m) return null;
    var y = +m[1], mo = +m[2], d = +m[3];
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return dt;
  }

  function toISODate(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2);
  }

  function pad(n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  }

  function today(now) {
    var n = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    return parseDate(toISODate(n));
  }

  function formatProtocol(n) {
    return 'IMOB-' + pad(n, 4);
  }

  function isValidProtocol(p) {
    return typeof p === 'string' && PROTOCOL_RE.test(p);
  }

  // Brazilian phone: optional +55, 2-digit DDD (11–99), 8-digit landline or
  // 9-digit mobile starting with 9. Returns digits (without country code) or null.
  function normalizePhone(s) {
    var d = String(s == null ? '' : s).replace(/[\s().\-]/g, '');
    if (/[^\d+]/.test(d)) return null;
    if (d.indexOf('+') > 0 || (d.indexOf('+') === 0 && d.indexOf('+55') !== 0)) return null;
    d = d.replace(/^\+?55(?=\d{10,11}$)/, '');
    if (!/^[1-9][1-9](9\d{8}|[2-5]\d{7})$/.test(d)) return null;
    return d;
  }

  function validateContact(c) {
    var errors = {};
    c = c || {};
    var name = typeof c.name === 'string' ? c.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < 3 || name.length > MAX_NAME || UNSAFE_NAME_RE.test(name) || name.split(' ').length < 2) errors.name = 'Informe nome e sobrenome (sem caracteres especiais).';
    var email = typeof c.email === 'string' ? c.email.trim() : '';
    if (email.length > MAX_EMAIL || !/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(email)) errors.email = 'E-mail inválido.';
    var phone = normalizePhone(c.phone);
    if (!phone) errors.phone = 'Telefone inválido (use DDD + número).';
    var ok = Object.keys(errors).length === 0;
    return { ok: ok, errors: errors, contact: ok ? { name: name, email: email.toLowerCase(), phone: phone } : null };
  }

  function validateDate(date, now) {
    var dt = parseDate(date);
    if (!dt) return 'Data inválida (use AAAA-MM-DD).';
    var t = today(now);
    if (dt < t) return 'A data não pode estar no passado.';
    if ((dt - t) / 86400000 > MAX_DAYS_AHEAD) return 'Agendamento permitido em até ' + MAX_DAYS_AHEAD + ' dias.';
    return null;
  }

  // True when the shift on `date` has already ended at the clock time `now`.
  function shiftEnded(date, shiftId, now) {
    var sh = byId(SHIFTS, shiftId);
    if (!sh || date !== toISODate(now)) return false;
    return now.getHours() + now.getMinutes() / 60 >= sh.end;
  }

  // Valid Date from the injected clock (falls back to the real time).
  function readClock(clock) {
    var n = clock();
    return n instanceof Date && !isNaN(n.getTime()) ? n : new Date();
  }

  // Public copy of a booking: contact is cloned and the secret token omitted.
  function copyBooking(b) {
    var c = Object.assign({}, b, { contact: Object.assign({}, b.contact) });
    delete c.token;
    return c;
  }

  // 128-bit unguessable per-booking secret (hex).
  function newToken() {
    var cr = typeof globalThis !== 'undefined' ? globalThis.crypto : null;
    if (!cr || typeof cr.getRandomValues !== 'function') throw new Error('Secure random source unavailable');
    var bytes = cr.getRandomValues(new Uint8Array(16));
    var out = '';
    for (var i = 0; i < bytes.length; i++) out += pad(bytes[i].toString(16), 2);
    return out;
  }

  function sameToken(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    var diff = 0;
    for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
  }

  // Least flexible brokers first, so versatile ones stay free for later requests.
  function byFlexibility(a, b) {
    return (a.modes.length - b.modes.length) ||
      (a.days.length * a.shifts.length - b.days.length * b.shifts.length);
  }

  function createScheduler(opts) {
    opts = opts || {};
    var brokers = opts.brokers || BROKERS;
    var clock = typeof opts.now === 'function' ? opts.now : function () { return new Date(); };
    var bookings = [];
    var counter = 0;

    function busy(brokerId, date, shift) {
      return bookings.some(function (b) {
        return b.status === 'confirmed' && b.brokerId === brokerId && b.date === date && b.shift === shift;
      });
    }

    function freeBrokers(date, shift, mode) {
      var dt = parseDate(date);
      if (!dt || !byId(SHIFTS, shift) || !byId(MODES, mode)) return [];
      var wd = dt.getUTCDay();
      return brokers.filter(function (b) {
        return b.days.indexOf(wd) !== -1 && b.shifts.indexOf(shift) !== -1 &&
          b.modes.indexOf(mode) !== -1 && !busy(b.id, date, shift);
      });
    }

    function availableShifts(date, mode) {
      var now = readClock(clock);
      if (validateDate(date, now)) return [];
      return SHIFTS.filter(function (s) { return !shiftEnded(date, s.id, now) && freeBrokers(date, s.id, mode).length > 0; })
        .map(function (s) { return s.id; });
    }

    function schedule(req) {
      req = req || {};
      var now = readClock(clock);
      var errors = {};
      var listingId = typeof req.listingId === 'string' ? req.listingId.trim() : '';
      if (listingId.length > MAX_LISTING_ID || !LISTING_ID_RE.test(listingId)) errors.listingId = 'Imóvel obrigatório.';
      if (!byId(MODES, req.mode)) errors.mode = 'Escolha visita presencial ou por vídeo.';
      if (!byId(SHIFTS, req.shift)) errors.shift = 'Escolha um turno válido.';
      var dateErr = validateDate(req.date, now);
      if (dateErr) errors.date = dateErr;
      else if (shiftEnded(req.date, req.shift, now)) errors.shift = 'Este turno já passou.';
      var c = validateContact(req.contact);
      if (!c.ok) errors.contact = c.errors;
      if (Object.keys(errors).length) return { ok: false, errors: errors };

      var free = freeBrokers(req.date, req.shift, req.mode).sort(byFlexibility);
      if (req.brokerId != null) {
        free = free.filter(function (b) { return b.id === req.brokerId; });
      }
      if (!free.length) {
        return { ok: false, errors: { slot: 'Turno indisponível para a data e modalidade escolhidas.' } };
      }
      var token = newToken();
      counter += 1;
      var booking = {
        protocol: formatProtocol(counter),
        listingId: listingId,
        mode: req.mode,
        date: req.date,
        shift: req.shift,
        brokerId: free[0].id,
        brokerName: free[0].name,
        contact: c.contact,
        status: 'confirmed',
        token: token,
      };
      bookings.push(booking);
      return { ok: true, protocol: booking.protocol, token: booking.token, booking: copyBooking(booking) };
    }

    // Protocols are sequential and guessable, so lookup and cancel require the
    // secret token returned by schedule(). There is no attempt throttling here:
    // rate limiting belongs to whatever layer exposes these methods.
    function owned(protocol, token) {
      var b = bookings.filter(function (x) { return x.protocol === protocol; })[0];
      return b && sameToken(b.token, token) ? b : null;
    }

    function find(protocol, token) {
      var b = owned(protocol, token);
      return b ? copyBooking(b) : null;
    }

    // Keep only the most recent cancelled records so memory stays bounded.
    function pruneCancelled() {
      var extra = bookings.filter(function (x) { return x.status === 'cancelled'; }).length - MAX_CANCELLED_KEPT;
      bookings = bookings.filter(function (x) {
        if (extra > 0 && x.status === 'cancelled') { extra -= 1; return false; }
        return true;
      });
    }

    function cancel(protocol, token) {
      var b = owned(protocol, token);
      if (!b || b.status !== 'confirmed') return false;
      b.status = 'cancelled';
      pruneCancelled();
      return true;
    }

    return { availableShifts: availableShifts, schedule: schedule, find: find, cancel: cancel };
  }

  var api = {
    MODES: MODES, SHIFTS: SHIFTS, BROKERS: BROKERS, MAX_DAYS_AHEAD: MAX_DAYS_AHEAD,
    createScheduler: createScheduler, validateContact: validateContact, validateDate: validateDate,
    normalizePhone: normalizePhone, formatProtocol: formatProtocol, isValidProtocol: isValidProtocol,
  };
  root.ImoveisVisits = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
