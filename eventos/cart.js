(function (root) {
  'use strict';

  var STORAGE_KEY = 'dan-tickets-cart';
  var SERVICE_FEE_RATE = 0.1; // 10% over the discounted subtotal
  var HALF_RATE = 0.5;
  var MAX_QTY = 10;
  var COUPONS = { DANSHOW10: { rate: 0.1 } };
  var TYPES = ['inteira', 'meia'];

  function emptyState() { return { items: [], coupon: '' }; }

  function normalizeCoupon(code) {
    return String(code == null ? '' : code).trim().toUpperCase();
  }

  function isValidItem(i) {
    return i && typeof i === 'object' && typeof i.eventId === 'string' && i.eventId.trim() && typeof i.sectorId === 'string' && i.sectorId.trim() &&
      typeof i.lotId === 'string' && i.lotId.trim() && TYPES.indexOf(i.type) !== -1 &&
      Number.isInteger(i.qty) && i.qty > 0 && i.qty <= MAX_QTY &&
      Number.isSafeInteger(i.unitCents) && i.unitCents >= 0;
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items)) return emptyState();
    var items = raw.items.filter(isValidItem).map(function (i) {
      return {
        eventId: i.eventId, eventName: String(i.eventName || ''), sectorId: i.sectorId,
        sectorName: String(i.sectorName || ''), lotId: i.lotId, lotName: String(i.lotName || ''),
        type: i.type, qty: i.qty, unitCents: i.unitCents
      };
    });
    var code = normalizeCoupon(raw.coupon);
    return { items: items, coupon: COUPONS[code] ? code : '' };
  }

  function getStorage() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  function load(storage) {
    var s = storage === undefined ? getStorage() : storage;
    if (!s) return emptyState();
    try { return sanitize(JSON.parse(s.getItem(STORAGE_KEY))); } catch (e) { return emptyState(); }
  }

  function save(state, storage) {
    var s = storage === undefined ? getStorage() : storage;
    if (!s) return false;
    try {
      s.setItem(STORAGE_KEY, JSON.stringify(sanitize(state)));
      return true;
    } catch (e) { return false; /* quota/private mode */ }
  }

  // Unit price in cents for a ticket type: Meia is 50% of the base price.
  function unitPrice(baseCents, type) {
    return type === 'meia' ? Math.round(baseCents * HALF_RATE) : baseCents;
  }

  function sameLine(a, b) {
    return a.eventId === b.eventId && a.sectorId === b.sectorId && a.lotId === b.lotId && a.type === b.type;
  }

  // Pure: returns a new state with `line` added (quantities merge, capped at MAX_QTY).
  function addItem(state, line) {
    if (!line || typeof line !== 'object') return state;
    var qty = Number(line.qty == null ? 1 : line.qty);
    if (!Number.isSafeInteger(qty) || qty <= 0) return state;
    var item = Object.assign({}, line, { qty: Math.min(MAX_QTY, qty) });
    if (!isValidItem(item)) return state;
    var next = { items: state.items.map(function (i) { return Object.assign({}, i); }), coupon: state.coupon };
    var found = next.items.filter(function (i) { return sameLine(i, item); })[0];
    if (found) {
      found.qty = Math.min(MAX_QTY, found.qty + qty);
      found.unitCents = item.unitCents;
    } else next.items.push(Object.assign(item, { qty: Math.min(MAX_QTY, qty) }));
    return next;
  }

  // Pure: sets quantity of the line at `index`; qty <= 0 removes it.
  function setQty(state, index, qty) {
    var q = Number(qty);
    if (!Number.isInteger(index) || !state.items[index] || !Number.isSafeInteger(q)) return state;
    var items = state.items.map(function (i) { return Object.assign({}, i); });
    if (q <= 0) items.splice(index, 1);
    else items[index].qty = Math.min(MAX_QTY, q);
    return { items: items, coupon: state.coupon };
  }

  function removeItem(state, index) { return setQty(state, index, 0); }

  // Pure: returns { state, ok } — ok is false for unknown codes (state unchanged).
  function applyCoupon(state, code) {
    var c = normalizeCoupon(code);
    if (!c) return { state: { items: state.items, coupon: '' }, ok: true };
    if (!COUPONS[c]) return { state: state, ok: false };
    return { state: { items: state.items, coupon: c }, ok: true };
  }

  // Totals (all integer cents): subtotal -> coupon discount -> service fee on discounted amount.
  // Note: These totals rely on the cart's cached unitCents for display purposes. Any final checkout must re-validate prices server-side.
  function totals(state) {
    var subtotal = 0;
    var tickets = 0;
    state.items.forEach(function (i) {
      subtotal += unitPrice(i.unitCents, i.type) * i.qty;
      tickets += i.qty;
    });
    var coupon = Object.prototype.hasOwnProperty.call(COUPONS, state.coupon) ? COUPONS[state.coupon] : null;
    var discount = coupon ? Math.round(subtotal * coupon.rate) : 0;
    var afterDiscount = subtotal - discount;
    var serviceFee = Math.round(afterDiscount * SERVICE_FEE_RATE);
    return {
      tickets: tickets, subtotalCents: subtotal, discountCents: discount,
      serviceFeeCents: serviceFee, totalCents: afterDiscount + serviceFee
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY, SERVICE_FEE_RATE: SERVICE_FEE_RATE, MAX_QTY: MAX_QTY,
    emptyState: emptyState, sanitize: sanitize, load: load, save: save, unitPrice: unitPrice,
    addItem: addItem, setQty: setQty, removeItem: removeItem, applyCoupon: applyCoupon, totals: totals
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.DanCart = api;
})(typeof window !== 'undefined' ? window : globalThis);
