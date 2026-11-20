/* Hotel pricing: seasonal nightly rates, long-stay discount, coupon and ISS.
   Exposed as window.HotelPricing (and via module.exports in Node). */
(function (root) {
  'use strict';

  var rooms = (typeof require === 'function' && typeof module !== 'undefined')
    ? require('./rooms.js')
    : root.HotelRooms;

  var HIGH_SEASON_MONTHS = Object.freeze([1, 7, 12]); // UTC months (1-12)
  var HIGH_SEASON_MULTIPLIER = 1.25;
  var LONG_STAY_MIN_NIGHTS = 5;
  var LONG_STAY_DISCOUNT_PCT = 8;
  var COUPONS = Object.freeze({ DANSTAY10: 10 } /* percent */);
  var ISS_PCT = 5;
  var MAX_NIGHTS = 30;
  var DAY_MS = 86400000;

  // Strict ISO: YYYY-MM-DD, or date + time with an explicit Z / +-HH:MM offset.
  // Time-less dates are UTC midnight; impossible calendar dates (02-30) are rejected.
  var ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2}))?$/;

  function parseIso(value, name) {
    if (typeof value !== 'string') { throw new RangeError(name + ' must be an ISO date string'); }
    var m = ISO_RE.exec(value.trim());
    if (!m) { throw new RangeError(name + ' is not a valid ISO date'); }
    var y = +m[1], mo = +m[2], d = +m[3];
    var check = new Date(Date.UTC(y, mo - 1, d));
    if (check.getUTCFullYear() !== y || check.getUTCMonth() !== mo - 1 || check.getUTCDate() !== d) {
      throw new RangeError(name + ' is not a valid calendar date');
    }
    if (m[4] !== undefined && (+m[4] > 23 || +m[5] > 59 || (m[6] !== undefined && +m[6] > 59))) {
      throw new RangeError(name + ' has an invalid time');
    }
    var ms = Date.parse(value.trim());
    if (Number.isNaN(ms)) { throw new RangeError(name + ' is not a valid ISO date'); }
    return ms;
  }

  function utcMidnight(ms) {
    var d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  // Display estimate only: re-price and validate coupons server-side before charging.
  // Returns { room, nights, nightlyRates, baseTotal, longStayDiscount, couponDiscount,
  //           subtotal, iss, total } with monetary values in BRL rounded to 2 places.
  function calculateStayPrice(input) {
    var args = input || {};
    var room = rooms.getRoomById(args.roomId);
    if (!room) { throw new RangeError('Unknown roomId'); }

    var inMs = parseIso(args.checkInIso, 'checkInIso');
    var outMs = parseIso(args.checkOutIso, 'checkOutIso');
    if (outMs <= inMs) { throw new RangeError('checkOutIso must be after checkInIso'); }

    // Nights = difference between UTC calendar dates (time of day is ignored).
    var startDay = utcMidnight(inMs);
    var nights = Math.round((utcMidnight(outMs) - startDay) / DAY_MS);
    if (nights < 1 || nights > MAX_NIGHTS) {
      throw new RangeError('stay must be between 1 and ' + MAX_NIGHTS + ' nights (UTC calendar dates)');
    }

    var guests = args.guests;
    if (typeof guests !== 'number' || !Number.isInteger(guests) || guests < 1 || guests > room.maxGuests) {
      throw new RangeError('guests must be an integer between 1 and ' + room.maxGuests);
    }

    var couponCode = args.couponCode === undefined || args.couponCode === null ? '' : args.couponCode;
    if (typeof couponCode !== 'string') { throw new TypeError('couponCode must be a string'); }
    var couponPct = 0;
    var couponKey = couponCode.trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(COUPONS, couponKey)) { couponPct = COUPONS[couponKey]; }

    // Each night is priced by the UTC month it starts in.
    // All money math in integer cents so the itemised lines reconcile exactly.
    var nightlyRates = [];
    var baseCents = 0;
    for (var i = 0; i < nights; i++) {
      var month = new Date(startDay + i * DAY_MS).getUTCMonth() + 1;
      var high = HIGH_SEASON_MONTHS.indexOf(month) !== -1;
      var rateCents = Math.round(room.dailyRateCents * (high ? HIGH_SEASON_MULTIPLIER : 1));
      nightlyRates.push(rateCents / 100);
      baseCents += rateCents;
    }

    var afterLongStay = nights >= LONG_STAY_MIN_NIGHTS
      ? Math.round(baseCents * (100 - LONG_STAY_DISCOUNT_PCT) / 100) : baseCents;
    var subtotalCents = Math.round(afterLongStay * (100 - couponPct) / 100);
    var issCents = Math.round(subtotalCents * ISS_PCT / 100);

    return {
      roomId: room.id,
      nights: nights,
      guests: guests,
      nightlyRates: nightlyRates,
      baseTotal: baseCents / 100,
      longStayDiscount: (baseCents - afterLongStay) / 100,
      couponDiscount: (afterLongStay - subtotalCents) / 100,
      subtotal: subtotalCents / 100,
      iss: issCents / 100,
      total: (subtotalCents + issCents) / 100
    };
  }

  var api = { calculateStayPrice: calculateStayPrice };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.HotelPricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
