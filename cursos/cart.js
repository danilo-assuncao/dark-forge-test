/* Dan Academy cart: persisted in localStorage under "dan-edu-cart". 
   Allows purchasing individual courses (avulso) or an annual pass.
   Exposed as window.DanAcademyCart (and via module.exports in Node). */
(function (root) {
  'use strict';

  var STORAGE_KEY = 'dan-edu-cart';
  var PRICE_AVULSO_CENTS = 50000;
  var PRICE_PASSE_ANUAL_CENTS = 300000;

  var COUPONS = Object.freeze({
    DANEDU10: { type: 'percent', value: 10, label: '10% off' }
  });

  function defaultStorage() {
    try {
      return (root.localStorage) || null;
    } catch (e) {
      return null;
    }
  }

  function create(opts) {
    opts = opts || {};
    var store = opts.storage === undefined ? defaultStorage() : opts.storage;
    var courses = [];
    var passeAnual = false;
    var couponCode = null;

    function persist() {
      if (store) {
        try {
          store.setItem(STORAGE_KEY, JSON.stringify({ courses: courses, passeAnual: passeAnual, coupon: couponCode }));
        } catch (e) {}
      }
    }

    function load() {
      courses = [];
      passeAnual = false;
      couponCode = null;
      var raw = null;
      try { raw = store ? store.getItem(STORAGE_KEY) : null; } catch (e) {}
      if (!raw) return;
      var data;
      try { data = JSON.parse(raw); } catch (e) { return; }
      if (data) {
        if (Array.isArray(data.courses)) {
          for (var i = 0; i < data.courses.length; i++) {
            if (typeof data.courses[i] === 'string' && courses.indexOf(data.courses[i]) === -1) {
              courses.push(data.courses[i]);
            }
          }
        }
        passeAnual = !!data.passeAnual;
        if (data.coupon && COUPONS[data.coupon]) {
          couponCode = data.coupon;
        }
      }
    }

    var api = {
      addCurso: function (id) {
        if (typeof id !== 'string' || !id) return false;
        if (courses.indexOf(id) === -1) {
          courses.push(id);
          persist();
        }
        return true;
      },
      removeCurso: function (id) {
        var i = courses.indexOf(id);
        if (i !== -1) {
          courses.splice(i, 1);
          persist();
          return true;
        }
        return false;
      },
      setPasseAnual: function (val) {
        passeAnual = !!val;
        persist();
        return true;
      },
      applyCoupon: function (code) {
        var key = String(code || '').trim().toUpperCase();
        if (!COUPONS[key]) return false;
        couponCode = key;
        persist();
        return true;
      },
      removeCoupon: function () {
        couponCode = null;
        persist();
        return true;
      },
      clear: function () {
        courses = [];
        passeAnual = false;
        couponCode = null;
        persist();
        return true;
      },
      totals: function () {
        var subtotalCents = 0;
        var lines = [];
        
        for (var i = 0; i < courses.length; i++) {
          subtotalCents += PRICE_AVULSO_CENTS;
          lines.push({ type: 'curso', id: courses[i], priceCents: PRICE_AVULSO_CENTS });
        }
        
        if (passeAnual) {
          subtotalCents += PRICE_PASSE_ANUAL_CENTS;
          lines.push({ type: 'passe_anual', priceCents: PRICE_PASSE_ANUAL_CENTS });
        }

        var discountCents = 0;
        var coupon = couponCode ? COUPONS[couponCode] : null;
        if (coupon && subtotalCents > 0) {
          if (coupon.type === 'percent') {
            discountCents = Math.round((subtotalCents * coupon.value) / 100);
          }
        }

        return {
          lines: lines,
          courses: courses.slice(),
          passeAnual: passeAnual,
          subtotalCents: subtotalCents,
          discountCents: discountCents,
          coupon: couponCode,
          totalCents: subtotalCents - discountCents
        };
      }
    };

    load();
    return api;
  }

  var api = {
    create: create,
    PRICE_AVULSO_CENTS: PRICE_AVULSO_CENTS,
    PRICE_PASSE_ANUAL_CENTS: PRICE_PASSE_ANUAL_CENTS,
    COUPONS: COUPONS
  };

  if (typeof window !== 'undefined') {
    root.DanAcademyCart = create();
    root.DanAcademyCart.create = create;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
