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
    var seen = Object.create(null);
    return parsed.filter(function (id) {
      if (typeof id !== 'string' || !id || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  }

  // Returns true when the write reached the storage, false when it failed.
  function writeIds(storage, key, ids) {
    try { storage.setItem(key, JSON.stringify(ids)); return true; } catch (e) { return false; }
  }

  // Price per m² in BRL cents, rounded; null when the inputs are unusable.
  function pricePerM2(listing) {
    if (!listing || !Number.isFinite(listing.areaM2) || !(listing.areaM2 > 0) || !Number.isFinite(listing.price)) return null;
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
    var groups = Object.create(null);
    rows.forEach(function (r) {
      if (r.pricePerM2 === null || typeof r.modality !== 'string' || !r.modality) return;
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

  // When a write to the primary storage fails (quota, private mode), the
  // affected key is served from an in-memory copy so reads and return values
  // stay consistent with what the caller just did.
  function createStore(storage) {
    var primary = storage || defaultStorage();
    var memory = memoryStorage();
    var degraded = Object.create(null);

    function read(key) { return readIds(degraded[key] ? memory : primary, key); }
    function write(key, ids) {
      if (!degraded[key] && writeIds(primary, key, ids)) return;
      degraded[key] = true;
      writeIds(memory, key, ids);
    }

    function toggleIn(key, id) {
      var ids = read(key);
      var i = ids.indexOf(id);
      if (i >= 0) ids.splice(i, 1); else ids.push(id);
      write(key, ids);
      return i < 0;
    }

    return {
      getFavorites: function () { return read(FAVORITES_KEY); },
      isFavorite: function (id) { return read(FAVORITES_KEY).indexOf(id) >= 0; },
      // Returns true when the listing is now a favorite.
      toggleFavorite: function (id) {
        if (typeof id !== 'string' || !id) return false;
        return toggleIn(FAVORITES_KEY, id);
      },
      getCompareIds: function () { return read(COMPARE_KEY); },
      isInCompare: function (id) { return read(COMPARE_KEY).indexOf(id) >= 0; },
      // Returns true if added (or already present); false if invalid or the selection is full.
      addToCompare: function (id) {
        if (typeof id !== 'string' || !id) return false;
        var ids = read(COMPARE_KEY);
        if (ids.indexOf(id) >= 0) return true;
        if (ids.length >= MAX_COMPARE) return false;
        ids.push(id);
        write(COMPARE_KEY, ids);
        return true;
      },
      removeFromCompare: function (id) {
        write(COMPARE_KEY, read(COMPARE_KEY).filter(function (x) { return x !== id; }));
      },
      clearCompare: function () { write(COMPARE_KEY, []); },
      // Resolves the selected ids against the given listings, prunes unknown ids and compares them.
      compare: function (listings) {
        var all = Array.isArray(listings) ? listings : [];
        var ids = read(COMPARE_KEY);
        var kept = [];
        var picked = [];
        ids.forEach(function (id) {
          var l = all.filter(function (x) { return x && x.id === id; })[0];
          if (l) { kept.push(id); picked.push(l); }
        });
        // Prune ids of listings that no longer exist so they free their slot.
        if (kept.length !== ids.length) write(COMPARE_KEY, kept);
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
