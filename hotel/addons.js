/* Hotel add-ons: immutable catalog of concierge extras and total calculation.
   Exposed as window.HotelAddons (and via module.exports in Node). */
(function (root) {
  'use strict';

  function freeze(addon) {
    return Object.freeze(addon);
  }

  // pricing: 'per-guest-night' | 'per-guest' (one-off) | 'flat' (per booking).
  var ADDONS = Object.freeze([
    freeze({ id: 'breakfast', name: 'Cafe da manha', price: 48, priceCents: 4800, pricing: 'per-guest-night' }),
    freeze({ id: 'airport-transfer', name: 'Transfer aeroporto', price: 140, priceCents: 14000, pricing: 'flat' }),
    freeze({ id: 'spa-access', name: 'Acesso ao spa', price: 95, priceCents: 9500, pricing: 'per-guest' }),
    freeze({ id: 'late-checkout', name: 'Late check-out', price: 110, priceCents: 11000, pricing: 'flat' })
  ]);

  function listAddons() {
    return ADDONS.slice();
  }

  function findAddon(id) {
    if (typeof id !== 'string') { return null; }
    for (var i = 0; i < ADDONS.length; i++) {
      if (ADDONS[i].id === id) { return ADDONS[i]; }
    }
    return null;
  }

  function isPositiveInt(n) {
    return typeof n === 'number' && Number.isInteger(n) && n >= 1;
  }

  // Returns { total, totalCents, lines } for the chosen addon ids.
  // Throws on unknown/duplicate ids, a non-array list, or invalid nights/guests.
  function calculateAddonsTotal(addonIds, counts) {
    if (!Array.isArray(addonIds)) {
      throw new TypeError('addonIds must be an array');
    }
    var opts = counts === undefined || counts === null ? {} : counts;
    var nights = opts.nights;
    var guests = opts.guests;
    if (!isPositiveInt(nights)) { throw new RangeError('nights must be a positive integer'); }
    if (!isPositiveInt(guests)) { throw new RangeError('guests must be a positive integer'); }

    var seen = {};
    var lines = [];
    var totalCents = 0;
    addonIds.forEach(function (id) {
      var addon = findAddon(id);
      if (!addon) { throw new RangeError('unknown addon id: ' + String(id)); }
      if (seen[id]) { throw new RangeError('duplicate addon id: ' + id); }
      seen[id] = true;
      var quantity = addon.pricing === 'per-guest-night' ? guests * nights
        : addon.pricing === 'per-guest' ? guests : 1;
      var subtotalCents = addon.priceCents * quantity;
      totalCents += subtotalCents;
      lines.push({ id: addon.id, quantity: quantity, subtotalCents: subtotalCents });
    });
    return { total: totalCents / 100, totalCents: totalCents, lines: lines };
  }

  var api = { ADDONS: ADDONS, listAddons: listAddons, calculateAddonsTotal: calculateAddonsTotal };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.HotelAddons = api;
})(typeof window !== 'undefined' ? window : globalThis);
