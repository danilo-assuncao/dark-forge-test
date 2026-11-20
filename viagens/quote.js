/* Viagens quote bag: packages (destination + duration) with traveler count,
   optional per-passenger travel insurance and the DANTRIP10 coupon.
   Persisted in localStorage under "dan-viagens-quote". Money in BRL cents.
   Exposed as window.ViagensQuote (and via module.exports in Node). */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'dan-viagens-quote';
  var INSURANCE_CENTS = 8900; // per passenger, per package
  var COUPON_CODE = 'DANTRIP10';
  var COUPON_PERCENT = 10;
  var MAX_TRAVELERS = 10;

  var data = root.ViagensDestinations || (typeof require !== 'undefined' ? require('./destinations.js') : null);

  function emptyState() { return { items: [], coupon: '' }; }

  function clampTravelers(n) {
    n = Math.floor(Number(n));
    if (!isFinite(n) || n < 1) { return 1; }
    return n > MAX_TRAVELERS ? MAX_TRAVELERS : n;
  }

  function normalizeCoupon(code) { return String(code || '').trim().toUpperCase(); }

  function isValidCoupon(code) { return normalizeCoupon(code) === COUPON_CODE; }

  // Drops anything that is not a known destination/duration; dedupes by id+duration.
  function sanitize(raw) {
    var state = emptyState();
    if (!raw || typeof raw !== 'object') { return state; }
    var seen = {};
    (Array.isArray(raw.items) ? raw.items : []).forEach(function (it) {
      if (!it || typeof it !== 'object') { return; }
      var d = data.getDestination(it.id);
      var dur = Number(it.duration);
      if (!d || d.durations.indexOf(dur) < 0) { return; }
      var key = d.id + ':' + dur;
      if (seen[key]) { return; }
      seen[key] = true;
      state.items.push({ id: d.id, duration: dur, travelers: clampTravelers(it.travelers), insurance: it.insurance === true });
    });
    // A coupon only makes sense with items in the bag.
    state.coupon = state.items.length && isValidCoupon(raw.coupon) ? COUPON_CODE : '';
    return state;
  }

  function getStorage() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  function load(storage) {
    storage = storage || getStorage();
    if (!storage) { return emptyState(); }
    try { return sanitize(JSON.parse(storage.getItem(STORAGE_KEY))); } catch (e) { return emptyState(); }
  }

  function save(state, storage) {
    storage = storage || getStorage();
    if (!storage) { return false; }
    try { storage.setItem(STORAGE_KEY, JSON.stringify(sanitize(state))); return true; } catch (e) { return false; }
  }

  function addItem(state, item) {
    var next = sanitize({ items: [item], coupon: '' }).items[0];
    if (!next) { return state; }
    var items = state.items.filter(function (i) { return !(i.id === next.id && i.duration === next.duration); });
    items.push(next);
    return { items: items, coupon: state.coupon };
  }

  function updateItem(state, id, duration, patch) {
    return {
      coupon: state.coupon,
      items: state.items.map(function (i) {
        if (i.id !== id || i.duration !== duration) { return i; }
        return {
          id: i.id, duration: i.duration,
          travelers: patch.travelers !== undefined ? clampTravelers(patch.travelers) : i.travelers,
          insurance: patch.insurance !== undefined ? patch.insurance === true : i.insurance
        };
      })
    };
  }

  function removeItem(state, id, duration) {
    var items = state.items.filter(function (i) { return !(i.id === id && i.duration === duration); });
    return { coupon: items.length ? state.coupon : '', items: items };
  }

  function setCoupon(state, code) {
    return { items: state.items, coupon: isValidCoupon(code) ? COUPON_CODE : '' };
  }

  // Invalid non-empty codes keep the current state and flag an error; an empty
  // code clears the coupon; a valid code applies it.
  function applyCoupon(state, code) {
    var c = normalizeCoupon(code);
    if (!c) { return { state: setCoupon(state, ''), error: false }; }
    if (!isValidCoupon(c)) { return { state: state, error: true }; }
    return { state: setCoupon(state, c), error: false };
  }

  function compute(state) {
    var lines = state.items.map(function (i) {
      var d = data.getDestination(i.id);
      var packageCents = d.priceCents[i.duration] * i.travelers;
      var insuranceCents = i.insurance ? INSURANCE_CENTS * i.travelers : 0;
      return { id: i.id, name: d.name, duration: i.duration, travelers: i.travelers, insurance: i.insurance,
        packageCents: packageCents, insuranceCents: insuranceCents, totalCents: packageCents + insuranceCents };
    });
    var subtotal = lines.reduce(function (s, l) { return s + l.totalCents; }, 0);
    var discount = isValidCoupon(state.coupon) ? Math.round(subtotal * COUPON_PERCENT / 100) : 0;
    return { lines: lines, subtotalCents: subtotal, discountCents: discount, totalCents: subtotal - discount };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY, INSURANCE_CENTS: INSURANCE_CENTS, COUPON_CODE: COUPON_CODE,
    COUPON_PERCENT: COUPON_PERCENT, MAX_TRAVELERS: MAX_TRAVELERS,
    emptyState: emptyState, sanitize: sanitize, load: load, save: save, addItem: addItem,
    updateItem: updateItem, removeItem: removeItem, setCoupon: setCoupon, applyCoupon: applyCoupon, isValidCoupon: isValidCoupon,
    clampTravelers: clampTravelers, compute: compute
  };
  root.ViagensQuote = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
