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
  var LONG_STAY_DISCOUNT = 0.08;
  var COUPONS = Object.freeze({ DANSTAY10: 0.10 });
  var ISS_RATE = 0.05;
  var MAX_NIGHTS = 30;
  var DAY_MS = 86400000;

  function parseIso(value, name) {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new RangeError(name + ' must be an ISO date string');
    }
    var ms = Date.parse(value);
    if (Number.isNaN(ms)) { throw new RangeError(name + ' is not a valid ISO date'); }
    return ms;
  }

  function utcMidnight(ms) {
    var d = new Date(ms);
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  }

  function roundCents(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
  }

  // Returns { room, nights, nightlyRates, baseTotal, longStayDiscount, couponDiscount,
  //           subtotal, iss, total } with monetary values in BRL rounded to 2 places.
  function calculateStayPrice(input) {
    var args = input || {};
    var room = rooms.getRoomById(args.roomId);
    if (!room) { throw new RangeError('Unknown roomId'); }

    var inMs = parseIso(args.checkInIso, 'checkInIso');
    var outMs = parseIso(args.checkOutIso, 'checkOutIso');
    if (outMs <= inMs) { throw new RangeError('checkOutIso must be after checkInIso'); }

    var startDay = utcMidnight(inMs);
    var nights = Math.max(1, Math.ceil((outMs - startDay) / DAY_MS));
    // Whole-day span between the UTC calendar dates when both are midnight-aligned.
    if (utcMidnight(outMs) === outMs && startDay === inMs) { nights = (outMs - inMs) / DAY_MS; }
    if (nights < 1 || nights > MAX_NIGHTS) {
      throw new RangeError('stay must be between 1 and ' + MAX_NIGHTS + ' nights');
    }

    var guests = args.guests;
    if (typeof guests !== 'number' || !Number.isInteger(guests) || guests < 1 || guests > room.maxGuests) {
      throw new RangeError('guests must be an integer between 1 and ' + room.maxGuests);
    }

    var couponCode = args.couponCode === undefined || args.couponCode === null ? '' : args.couponCode;
    if (typeof couponCode !== 'string') { throw new TypeError('couponCode must be a string'); }
    var couponRate = COUPONS[couponCode.trim().toUpperCase()] || 0;

    // Each night is priced by the UTC month it starts in.
    var nightlyRates = [];
    var baseTotal = 0;
    for (var i = 0; i < nights; i++) {
      var month = new Date(startDay + i * DAY_MS).getUTCMonth() + 1;
      var high = HIGH_SEASON_MONTHS.indexOf(month) !== -1;
      var rate = Math.round(room.dailyRateCents * (high ? HIGH_SEASON_MULTIPLIER : 1)) / 100;
      nightlyRates.push(rate);
      baseTotal += rate;
    }

    var afterLongStay = nights >= LONG_STAY_MIN_NIGHTS ? baseTotal * (1 - LONG_STAY_DISCOUNT) : baseTotal;
    var afterCoupon = afterLongStay * (1 - couponRate);
    var subtotal = roundCents(afterCoupon);
    var iss = roundCents(subtotal * ISS_RATE);

    return {
      roomId: room.id,
      nights: nights,
      guests: guests,
      nightlyRates: nightlyRates,
      baseTotal: roundCents(baseTotal),
      longStayDiscount: roundCents(baseTotal - afterLongStay),
      couponDiscount: roundCents(afterLongStay - afterCoupon),
      subtotal: subtotal,
      iss: iss,
      total: roundCents(subtotal + iss)
    };
  }

  var api = { calculateStayPrice: calculateStayPrice };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.HotelPricing = api;
})(typeof window !== 'undefined' ? window : globalThis);
