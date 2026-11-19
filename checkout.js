/* Simulated shipping for Dan Motors checkout. Exposed as window.DanCheckout;
   loaded after cart.js and before script.js. The fee depends only on the
   first digit of the 8-digit CEP (Brazilian postal region); nothing is sent
   anywhere. Amounts are BRL cents. */
(function () {
  'use strict';

  // First CEP digit -> { region, cents, minutes }.
  var REGIONS = {
    '0': { region: 'Grande São Paulo', cents: 1490, minutes: 45 },
    '1': { region: 'Interior de São Paulo', cents: 1890, minutes: 75 },
    '2': { region: 'Rio de Janeiro e Espírito Santo', cents: 2190, minutes: 120 },
    '3': { region: 'Minas Gerais', cents: 2290, minutes: 150 },
    '4': { region: 'Bahia e Sergipe', cents: 2990, minutes: 180 },
    '5': { region: 'Nordeste', cents: 3290, minutes: 210 },
    '6': { region: 'Norte e Nordeste', cents: 3890, minutes: 300 },
    '7': { region: 'Centro-Oeste', cents: 2890, minutes: 180 },
    '8': { region: 'Paraná e Santa Catarina', cents: 2490, minutes: 150 },
    '9': { region: 'Rio Grande do Sul', cents: 2690, minutes: 165 }
  };

  // Returns the CEP as 8 digits, or null when it is not a valid "12345678" / "12345-678".
  function normalizeCep(raw) {
    var value = String(raw === undefined || raw === null ? '' : raw).trim();
    if (!/^\d{5}-?\d{3}$/.test(value)) {
      return null;
    }
    return value.replace('-', '');
  }

  // Pickup at the counter: free, ready in a fixed time.
  var PICKUP_MINUTES = 20;
  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  // Returns { cep, region, cents, minutes } or null for an invalid CEP.
  // minutes = estimated delivery time for the CEP range.
  function quote(raw) {
    var cep = normalizeCep(raw);
    if (!cep) {
      return null;
    }
    var entry = REGIONS[cep.charAt(0)];
    return { cep: cep, region: entry.region, cents: entry.cents, minutes: entry.minutes };
  }

  // mode 'pickup' (free, no CEP needed) or 'delivery' (priced by CEP).
  // Returns { mode, cents, minutes, region, cep } or null when the mode is
  // unknown or delivery has an invalid CEP.
  function fulfillment(mode, rawCep) {
    if (mode === 'pickup') {
      return { mode: 'pickup', cents: 0, minutes: PICKUP_MINUTES, region: null, cep: null };
    }
    if (mode !== 'delivery') {
      return null;
    }
    var q = quote(rawCep);
    if (!q) {
      return null;
    }
    return { mode: 'delivery', cents: q.cents, minutes: q.minutes, region: q.region, cep: q.cep };
  }

  // Tracking code "DAN-XXXX". DISPLAY LABEL ONLY: it has ~20 bits of entropy and
  // is generated client-side, so never use it to authorize access to an order.
  // Optional rng returns a float in [0, 1) (used by tests); otherwise it uses
  // crypto.getRandomValues when available (32 divides 256, so masking is unbiased).
  function trackingCode(rng) {
    var out = '';
    var bytes = null;
    var cr = typeof crypto !== 'undefined' ? crypto : null;
    if (typeof rng !== 'function' && cr && typeof cr.getRandomValues === 'function') {
      bytes = cr.getRandomValues(new Uint8Array(4));
    }
    var next = typeof rng === 'function' ? rng : Math.random;
    for (var i = 0; i < 4; i++) {
      var idx = bytes ? bytes[i] & (CODE_ALPHABET.length - 1) : Math.floor(next() * CODE_ALPHABET.length);
      out += CODE_ALPHABET.charAt(idx);
    }
    return 'DAN-' + out;
  }

  window.DanCheckout = {
    normalizeCep: normalizeCep, quote: quote, fulfillment: fulfillment, trackingCode: trackingCode
  };
})();
