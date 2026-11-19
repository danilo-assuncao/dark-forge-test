/* Dan Pets cart: lines indexed by item + size (porte), persisted in
   localStorage under "dan-pets-cart". Each line is a one-off purchase ("avulsa")
   or a monthly subscription ("assinatura", 5% off). The DANPET10 coupon takes
   10% off the order after the subscription discount. Money is in BRL cents.
   Exposed as window.DanPetsCart in the browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var C = root.DanPetsCatalog || (typeof require === 'function' ? require('./catalog.js') : null);

  var STORAGE_KEY = 'dan-pets-cart';
  var MODES = ['avulsa', 'assinatura'];
  var SUBSCRIPTION_PERCENT = 5;
  var COUPONS = { DANPET10: 10 };
  var MAX_QTY = 99;

  function lineKey(itemId, sizeId) { return itemId + '|' + sizeId; }

  function findItem(id) {
    return C.ITEMS.filter(function (i) { return i.id === id; })[0] || null;
  }

  function normalizeCoupon(code) {
    return String(code == null ? '' : code).trim().toUpperCase();
  }

  function cleanQty(q) {
    var n = Math.floor(Number(q));
    if (!isFinite(n) || n < 1) return 1;
    return Math.min(n, MAX_QTY);
  }

  function cleanMode(m) { return MODES.indexOf(m) !== -1 ? m : 'avulsa'; }

  function createCart(storage) {
    var lines = []; // { itemId, size, qty, mode }
    var coupon = null;

    function save() {
      if (!storage) return;
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ lines: lines, coupon: coupon }));
      } catch (e) { /* storage full or blocked: keep in-memory cart */ }
    }

    function load() {
      var data = null;
      try { data = storage ? JSON.parse(storage.getItem(STORAGE_KEY)) : null; } catch (e) { data = null; }
      if (!data || !Array.isArray(data.lines)) return;
      data.lines.forEach(function (l) {
        var item = l && findItem(l.itemId);
        if (!item || item.sizes.indexOf(l.size) === -1) return; // drop stale/invalid entries
        if (find(l.itemId, l.size)) return;
        lines.push({ itemId: l.itemId, size: l.size, qty: cleanQty(l.qty), mode: cleanMode(l.mode) });
      });
      if (COUPONS[normalizeCoupon(data.coupon)]) coupon = normalizeCoupon(data.coupon);
    }

    function find(itemId, size) {
      return lines.filter(function (l) { return l.itemId === itemId && l.size === size; })[0] || null;
    }

    // Adds qty of item+size. Same item+size merges into one line; mode is updated.
    function add(itemId, size, mode, qty) {
      var item = findItem(itemId);
      if (!item || item.sizes.indexOf(size) === -1) return false;
      var line = find(itemId, size);
      var n = qty == null ? 1 : cleanQty(qty);
      if (line) {
        line.qty = Math.min(line.qty + n, MAX_QTY);
        line.mode = cleanMode(mode);
      } else {
        lines.push({ itemId: itemId, size: size, qty: n, mode: cleanMode(mode) });
      }
      save();
      return true;
    }

    function setQty(itemId, size, qty) {
      var line = find(itemId, size);
      if (!line) return false;
      if (!(Number(qty) >= 1)) return remove(itemId, size);
      line.qty = cleanQty(qty);
      save();
      return true;
    }

    function setMode(itemId, size, mode) {
      var line = find(itemId, size);
      if (!line || MODES.indexOf(mode) === -1) return false;
      line.mode = mode;
      save();
      return true;
    }

    function remove(itemId, size) {
      var before = lines.length;
      lines = lines.filter(function (l) { return !(l.itemId === itemId && l.size === size); });
      var changed = lines.length !== before;
      if (changed) save();
      return changed;
    }

    function clear() { lines = []; coupon = null; save(); }

    function applyCoupon(code) {
      var c = normalizeCoupon(code);
      if (!COUPONS[c]) return false;
      coupon = c;
      save();
      return true;
    }

    function removeCoupon() { coupon = null; save(); }

    function totals() {
      var subtotal = 0;
      var subscriptionDiscount = 0;
      var detailed = lines.map(function (l) {
        var item = findItem(l.itemId);
        var unit = C.priceFor(item, l.size);
        var base = unit * l.qty;
        var off = l.mode === 'assinatura' ? Math.round(base * SUBSCRIPTION_PERCENT / 100) : 0;
        subtotal += base;
        subscriptionDiscount += off;
        return {
          itemId: l.itemId, size: l.size, qty: l.qty, mode: l.mode, name: item.name,
          unitPrice: unit, subtotal: base, discount: off, total: base - off,
        };
      });
      var afterSub = subtotal - subscriptionDiscount;
      var couponDiscount = coupon ? Math.round(afterSub * COUPONS[coupon] / 100) : 0;
      return {
        lines: detailed, coupon: coupon, subtotal: subtotal,
        subscriptionDiscount: subscriptionDiscount, couponDiscount: couponDiscount,
        total: afterSub - couponDiscount,
        count: lines.reduce(function (n, l) { return n + l.qty; }, 0),
      };
    }

    load();
    return {
      add: add, setQty: setQty, setMode: setMode, remove: remove, clear: clear,
      applyCoupon: applyCoupon, removeCoupon: removeCoupon, totals: totals,
    };
  }

  var api = {
    STORAGE_KEY: STORAGE_KEY, MODES: MODES, SUBSCRIPTION_PERCENT: SUBSCRIPTION_PERCENT,
    COUPONS: COUPONS, lineKey: lineKey, createCart: createCart,
  };
  root.DanPetsCart = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
