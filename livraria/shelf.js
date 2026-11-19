/* Dan Books shelf (shopping bag): persisted in localStorage under
   "dan-books-shelf". A line is a book id plus a format ({ id, format, qty }).
   Totals: subtotal (BRL cents), optional gift wrap (flat fee, physical copies
   only) and an optional coupon (DANBOOK10 = 10% off the subtotal). Exposed as
   window.DanBooksShelf (and via module.exports in Node, where
   create({ storage, catalog }) can inject dependencies). Requires books.js.
   Prices, coupons and totals are display-only: a checkout must recompute
   everything server-side from ids and formats. */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'dan-books-shelf';
  var MAX_QTY = 99;
  var GIFT_WRAP_CENTS = 890; // flat fee per order, only when a physical copy is in the shelf
  var DIGITAL_FORMATS = ['ebook'];

  var COUPONS = Object.freeze({
    DANBOOK10: Object.freeze({ type: 'percent', value: 10, label: '10% off your books' })
  });

  function hasCoupon(key) {
    return typeof key === 'string' && Object.prototype.hasOwnProperty.call(COUPONS, key);
  }

  function defaultCatalog() {
    if (root.DanBooksCatalog) return root.DanBooksCatalog;
    if (typeof require === 'function') {
      try { return require('./books.js'); } catch (e) { /* fall through */ }
    }
    return null;
  }

  function defaultStorage() {
    try { return root.localStorage || null; } catch (e) { return null; }
  }

  function normalizeQty(qty) {
    var n = Math.floor(Number(qty));
    if (isNaN(n) || n < 1) return 0;
    return n > MAX_QTY ? MAX_QTY : n;
  }

  function create(opts) {
    opts = opts || {};
    var store = opts.storage === undefined ? defaultStorage() : opts.storage;
    var items = [];
    var couponCode = null;
    var giftWrap = false;
    var loaded = false;
    var listeners = [];

    function getCatalog() { return opts.catalog || defaultCatalog(); }

    function validLine(id, format) {
      var c = getCatalog();
      return !!(c && c.priceFor(id, format) !== null);
    }

    function indexOf(id, format) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id && items[i].format === format) return i;
      }
      return -1;
    }

    function notify() {
      var snapshot = listeners.slice();
      for (var i = 0; i < snapshot.length; i++) {
        try { snapshot[i](api.totals()); } catch (e) { /* isolate bad subscribers */ }
      }
    }

    function persist() {
      if (store) {
        try {
          store.setItem(STORAGE_KEY, JSON.stringify({ items: items, coupon: couponCode, giftWrap: giftWrap }));
        } catch (e) { /* storage full or blocked: keep the in-memory shelf */ }
      }
      notify();
    }

    function load() {
      var raw = null;
      // A failed read keeps the current in-memory state (matters on reload()).
      try { raw = store ? store.getItem(STORAGE_KEY) : null; } catch (e) { return; }
      items = [];
      couponCode = null;
      giftWrap = false;
      if (!raw) return;
      var data;
      try { data = JSON.parse(raw); } catch (e) { return; }
      if (!data || !Array.isArray(data.items)) return;
      for (var i = 0; i < data.items.length; i++) {
        var it = data.items[i] || {};
        var qty = normalizeQty(it.qty);
        if (qty && validLine(it.id, it.format) && indexOf(it.id, it.format) === -1) {
          items.push({ id: it.id, format: it.format, qty: qty });
        }
      }
      if (hasCoupon(data.coupon)) couponCode = data.coupon;
      giftWrap = data.giftWrap === true;
    }

    // Loads persisted state once the catalog is available; false while it is not.
    function ensure() {
      if (!loaded && getCatalog()) {
        load();
        loaded = true;
        notify();
      }
      return loaded;
    }

    var api = {
      coupons: COUPONS,
      add: function (id, format, qty) {
        if (!ensure()) return false;
        var q = normalizeQty(qty === undefined ? 1 : qty);
        if (!q || !validLine(id, format)) return false;
        var i = indexOf(id, format);
        if (i === -1) items.push({ id: id, format: format, qty: q });
        else items[i].qty = Math.min(MAX_QTY, items[i].qty + q);
        persist();
        return true;
      },
      setQty: function (id, format, qty) {
        if (!ensure()) return false;
        var i = indexOf(id, format);
        var n = Number(qty);
        if (i === -1 || qty === null || typeof qty === 'boolean' || String(qty).trim() === '' || isNaN(n)) return false;
        var q = normalizeQty(n);
        if (q) items[i].qty = q; else items.splice(i, 1);
        persist();
        return true;
      },
      remove: function (id, format) {
        if (!ensure()) return false;
        var i = indexOf(id, format);
        if (i === -1) return false;
        items.splice(i, 1);
        persist();
        return true;
      },
      clear: function () {
        if (!ensure()) return false;
        items = [];
        couponCode = null;
        giftWrap = false;
        persist();
        return true;
      },
      items: function () {
        ensure();
        return items.map(function (it) { return { id: it.id, format: it.format, qty: it.qty }; });
      },
      setGiftWrap: function (on) {
        if (!ensure()) return false;
        giftWrap = on === true;
        persist();
        return true;
      },
      applyCoupon: function (code) {
        var key = String(code || '').trim().toUpperCase();
        if (!hasCoupon(key)) return false;
        if (!ensure()) return false;
        couponCode = key;
        persist();
        return true;
      },
      removeCoupon: function () {
        if (!ensure()) return false;
        couponCode = null;
        persist();
        return true;
      },
      totals: function () {
        ensure();
        var catalog = getCatalog();
        var subtotalCents = 0, count = 0, physical = 0;
        var lines = [];
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var price = catalog ? catalog.priceFor(it.id, it.format) : null;
          if (price === null) continue;
          var lineCents = price * it.qty;
          subtotalCents += lineCents;
          count += it.qty;
          if (DIGITAL_FORMATS.indexOf(it.format) === -1) physical += it.qty;
          lines.push({ id: it.id, format: it.format, qty: it.qty, lineCents: lineCents });
        }
        var coupon = couponCode ? COUPONS[couponCode] : null;
        var discountCents = coupon && subtotalCents > 0
          ? Math.round(subtotalCents * coupon.value / 100) : 0;
        var giftWrapCents = giftWrap && physical > 0 ? GIFT_WRAP_CENTS : 0;
        return {
          lines: lines,
          count: count,
          subtotalCents: subtotalCents,
          giftWrap: giftWrap,
          giftWrapCents: giftWrapCents,
          coupon: couponCode,
          discountCents: discountCents,
          totalCents: subtotalCents - discountCents + giftWrapCents
        };
      },
      subscribe: function (fn) {
        listeners.push(fn);
        return function () {
          var i = listeners.indexOf(fn);
          if (i !== -1) listeners.splice(i, 1);
        };
      },
      reload: function () {
        loaded = false;
        ensure();
      }
    };

    ensure();
    return api;
  }

  var api = {
    create: create, STORAGE_KEY: STORAGE_KEY, MAX_QTY: MAX_QTY,
    GIFT_WRAP_CENTS: GIFT_WRAP_CENTS, COUPONS: COUPONS
  };
  if (typeof window !== 'undefined') {
    root.DanBooksShelf = create();
    root.DanBooksShelf.create = create;
    // Keep tabs in sync: another tab wrote the shelf (or cleared storage, key === null).
    if (typeof root.addEventListener === 'function') {
      root.addEventListener('storage', function (e) {
        if (!e || (e.key !== null && e.key !== STORAGE_KEY)) return;
        // Ignore sessionStorage events that share the key name.
        if (e.storageArea && e.storageArea !== defaultStorage()) return;
        root.DanBooksShelf.reload();
      });
    }
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
