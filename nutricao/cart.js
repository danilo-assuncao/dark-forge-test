/* Dan Nutri cart: persisted in localStorage under "dan-nutri-cart". A line is
   identified by product id plus presentation ({ id, presentation, qty }).
   Totals: subtotal (BRL cents), combo protein/kcal (per-dose macros x qty) and
   an optional coupon (DANNUTRI10, DAN50). Exposed as window.DanNutriCart (and
   via module.exports in Node, where create({ storage, catalog }) can inject
   dependencies). */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'dan-nutri-cart';
  var MAX_QTY = 99;

  // percent: value is a percentage; fixed: valueCents off.
  // minCents is the minimum subtotal required for the discount to apply.
  var COUPONS = {
    DANNUTRI10: { type: 'percent', value: 10, minCents: 0, label: '10% off your order' },
    DAN50: { type: 'fixed', valueCents: 5000, minCents: 25000, label: 'R$ 50,00 off orders from R$ 250,00' }
  };

  function defaultCatalog() {
    if (root.DanNutriProducts) { return root.DanNutriProducts; }
    if (typeof require === 'function') {
      try { return require('./products.js'); } catch (e) { /* fall through */ }
    }
    return null;
  }

  function defaultStorage() {
    try {
      return (root.localStorage) || null;
    } catch (e) {
      return null;
    }
  }

  function normalizeQty(qty) {
    var n = Math.floor(Number(qty));
    if (!isFinite(n) || n < 1) { return 0; }
    return n > MAX_QTY ? MAX_QTY : n;
  }

  function create(opts) {
    opts = opts || {};
    var catalog = opts.catalog || defaultCatalog();
    var store = opts.storage === undefined ? defaultStorage() : opts.storage;
    var items = [];
    var couponCode = null;
    var listeners = [];

    function validLine(id, presentation) {
      var p = catalog && catalog.find(id);
      return p && p.presentations.indexOf(presentation) !== -1 ? p : null;
    }

    function indexOf(id, presentation) {
      for (var i = 0; i < items.length; i++) {
        if (items[i].id === id && items[i].presentation === presentation) { return i; }
      }
      return -1;
    }

    function persist() {
      if (store) {
        try {
          store.setItem(STORAGE_KEY, JSON.stringify({ items: items, coupon: couponCode }));
        } catch (e) { /* storage full or blocked: keep the in-memory cart */ }
      }
      for (var i = 0; i < listeners.length; i++) { listeners[i](api.totals()); }
    }

    function load() {
      items = [];
      couponCode = null;
      var raw = null;
      try { raw = store ? store.getItem(STORAGE_KEY) : null; } catch (e) { raw = null; }
      if (!raw) { return; }
      var data;
      try { data = JSON.parse(raw); } catch (e) { return; }
      if (!data || !Array.isArray(data.items)) { return; }
      for (var i = 0; i < data.items.length; i++) {
        var it = data.items[i] || {};
        var qty = normalizeQty(it.qty);
        if (qty && validLine(it.id, it.presentation) && indexOf(it.id, it.presentation) === -1) {
          items.push({ id: it.id, presentation: it.presentation, qty: qty });
        }
      }
      if (typeof data.coupon === 'string' && COUPONS[data.coupon]) { couponCode = data.coupon; }
    }

    var api = {
      coupons: COUPONS,
      add: function (id, presentation, qty) {
        var q = normalizeQty(qty === undefined ? 1 : qty);
        if (!q || !validLine(id, presentation)) { return false; }
        var i = indexOf(id, presentation);
        if (i === -1) {
          items.push({ id: id, presentation: presentation, qty: q });
        } else {
          items[i].qty = Math.min(MAX_QTY, items[i].qty + q);
        }
        persist();
        return true;
      },
      setQty: function (id, presentation, qty) {
        var i = indexOf(id, presentation);
        if (i === -1) { return false; }
        var q = normalizeQty(qty);
        if (q) { items[i].qty = q; } else { items.splice(i, 1); }
        persist();
        return true;
      },
      remove: function (id, presentation) {
        var i = indexOf(id, presentation);
        if (i === -1) { return false; }
        items.splice(i, 1);
        persist();
        return true;
      },
      clear: function () {
        items = [];
        couponCode = null;
        persist();
      },
      items: function () {
        return items.map(function (it) {
          return { id: it.id, presentation: it.presentation, qty: it.qty };
        });
      },
      applyCoupon: function (code) {
        var key = String(code || '').trim().toUpperCase();
        if (!COUPONS[key]) { return false; }
        couponCode = key;
        persist();
        return true;
      },
      removeCoupon: function () {
        couponCode = null;
        persist();
      },
      totals: function () {
        var subtotalCents = 0, proteinG = 0, kcal = 0, count = 0;
        var lines = [];
        for (var i = 0; i < items.length; i++) {
          var it = items[i];
          var p = catalog.find(it.id);
          var lineCents = p.priceCents[it.presentation] * it.qty;
          subtotalCents += lineCents;
          proteinG += p.macros.proteinG * it.qty;
          kcal += p.macros.kcal * it.qty;
          count += it.qty;
          lines.push({ id: it.id, presentation: it.presentation, qty: it.qty, lineCents: lineCents });
        }
        var discountCents = 0;
        var coupon = couponCode ? COUPONS[couponCode] : null;
        if (coupon && subtotalCents > 0 && subtotalCents >= coupon.minCents) {
          discountCents = coupon.type === 'percent'
            ? Math.round(subtotalCents * coupon.value / 100)
            : Math.min(coupon.valueCents, subtotalCents);
        }
        return {
          lines: lines,
          count: count,
          subtotalCents: subtotalCents,
          proteinG: proteinG,
          kcal: kcal,
          coupon: couponCode,
          discountCents: discountCents,
          totalCents: subtotalCents - discountCents
        };
      },
      subscribe: function (fn) {
        listeners.push(fn);
        return function () {
          var i = listeners.indexOf(fn);
          if (i !== -1) { listeners.splice(i, 1); }
        };
      },
      reload: load
    };

    load();
    return api;
  }

  var api = { create: create, STORAGE_KEY: STORAGE_KEY, MAX_QTY: MAX_QTY, COUPONS: COUPONS };
  if (typeof window !== 'undefined') {
    root.DanNutriCart = create();
    root.DanNutriCart.create = create;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
