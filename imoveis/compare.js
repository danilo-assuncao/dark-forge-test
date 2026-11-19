/* Imóveis comparison and favorites: keeps a favorites list and a comparison
   selection (max 3 listings) in localStorage, and computes price per m² plus
   a "best value" highlight. Money is in BRL cents. Standalone: listings are
   passed in as plain objects ({ id, price, areaM2, modality, ... }). Exposed
   as window.ImoveisCompare in the browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var MAX_COMPARE = 3;
  var FAVORITES_KEY = 'imoveis.favorites';
  var COMPARE_KEY = 'imoveis.compare';

  function memoryStorage() {
    var data = {};
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(data, k) ? data[k] : null; },
      setItem: function (k, v) { data[k] = String(v); },
      removeItem: function (k) { delete data[k]; },
    };
  }

  function defaultStorage() {
    try {
      if (root.localStorage) return root.localStorage;
    } catch (e) { /* storage blocked */ }
    return memoryStorage();
  }

  function readIds(storage, key) {
    var raw;
    try { raw = storage.getItem(key); } catch (e) { return []; }
    if (!raw) return [];
    var parsed;
    try { parsed = JSON.parse(raw); } catch (e) { return []; }
    if (!Array.isArray(parsed)) return [];
    var seen = {};
    return parsed.filter(function (id) {
      if (typeof id !== 'string' || !id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  function writeIds(storage, key, ids) {
    try { storage.setItem(key, JSON.stringify(ids)); } catch (e) { /* quota/blocked: state stays in memory of caller */ }
  }

  // Price per m² in BRL cents, rounded; null when the inputs are unusable.
  function pricePerM2(listing) {
    if (!listing || !(listing.areaM2 > 0) || !Number.isFinite(listing.price)) return null;
    return Math.round(listing.price / listing.areaM2);
  }

  // Compares listings side by side (at most MAX_COMPARE). Each row gets
  // pricePerM2 and bestValue. Sale and rent prices are not comparable, so the
  // best value (lowest price per m²) is picked within each modality; a lone
  // listing in its modality is not highlighted.
  function compareListings(listings) {
    var items = (Array.isArray(listings) ? listings : []).slice(0, MAX_COMPARE);
    var rows = items.map(function (l) {
      return Object.assign({}, l, { pricePerM2: pricePerM2(l), bestValue: false });
    });
    var groups = {};
    rows.forEach(function (r) {
      if (r.pricePerM2 === null) return;
      (groups[r.modality] = groups[r.modality] || []).push(r);
    });
    Object.keys(groups).forEach(function (m) {
      var g = groups[m];
      if (g.length < 2) return;
      var min = Math.min.apply(null, g.map(function (r) { return r.pricePerM2; }));
      g.forEach(function (r) { if (r.pricePerM2 === min) r.bestValue = true; });
    });
    return rows;
  }

  function createStore(storage) {
    var store = storage || defaultStorage();

    function toggleIn(key, id) {
      var ids = readIds(store, key);
      var i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1); else ids.push(id);
      writeIds(store, key, ids);
      return i < 0;
    }

    return {
      getFavorites: function () { return readIds(store, FAVORITES_KEY); },
      isFavorite: function (id) { return readIds(store, FAVORITES_KEY).indexOf(id) >= 0; },
      // Returns true when the listing is now a favorite.
      toggleFavorite: function (id) {
        if (typeof id !== 'string' || !id) return false;
        return toggleIn(FAVORITES_KEY, id);
      },
      getCompareIds: function () { return readIds(store, COMPARE_KEY); },
      isInCompare: function (id) { return readIds(store, COMPARE_KEY).indexOf(id) >= 0; },
      // Returns true if added (or already present); false if invalid or the selection is full.
      addToCompare: function (id) {
        if (typeof id !== 'string' || !id) return false;
        var ids = readIds(store, COMPARE_KEY);
        if (ids.indexOf(id) >= 0) return true;
        if (ids.length >= MAX_COMPARE) return false;
        ids.push(id);
        writeIds(store, COMPARE_KEY, ids);
        return true;
      },
      removeFromCompare: function (id) {
        writeIds(store, COMPARE_KEY, readIds(store, COMPARE_KEY).filter(function (x) { return x !== id; }));
      },
      clearCompare: function () { writeIds(store, COMPARE_KEY, []); },
      // Resolves the selected ids against the given listings and compares them.
      compare: function (listings) {
        var all = Array.isArray(listings) ? listings : [];
        var picked = readIds(store, COMPARE_KEY).map(function (id) {
          return all.filter(function (l) { return l && l.id === id; })[0];
        }).filter(Boolean);
        return compareListings(picked);
      },
    };
  }

  var api = {
    MAX_COMPARE: MAX_COMPARE,
    FAVORITES_KEY: FAVORITES_KEY,
    COMPARE_KEY: COMPARE_KEY,
    pricePerM2: pricePerM2,
    compareListings: compareListings,
    createStore: createStore,
  };

  root.ImoveisCompare = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
