/* Dan Nutri shipping: CEP normalization, standard vs express quotes by CEP
   range, simulated teleconsultation slots and NUTRI-XXXX protocols.
   Prices are in BRL cents. Exposed as window.DanNutriShipping (and via
   module.exports when loaded from Node). */
(function (root) {
  'use strict';

  // Ranges by first CEP digit (region). Express is unavailable when null.
  var REGIONS = [
    { name: 'Sudeste', from: 0, to: 3, standard: { cents: 1490, days: 5 }, express: { cents: 2990, days: 2 } },
    { name: 'Sul', from: 8, to: 9, standard: { cents: 1990, days: 6 }, express: { cents: 3990, days: 3 } },
    { name: 'Nordeste', from: 4, to: 5, standard: { cents: 2490, days: 8 }, express: { cents: 4990, days: 4 } },
    { name: 'Centro-Oeste/Norte', from: 6, to: 7, standard: { cents: 2990, days: 10 }, express: null }
  ];
  var FREE_STANDARD_CENTS = 29900;
  var SLOT_HOURS = ['09:00', '10:30', '14:00', '15:30', '17:00'];
  var NUTRITIONISTS = ['Dra. Helena Prado', 'Dr. Rafael Moura', 'Dra. Camila Duarte'];
  var PROTOCOL_RE = /^NUTRI-\d{4}$/;

  function normalizeCep(input) {
    if (input === null || input === undefined) { return null; }
    var digits = String(input).replace(/\D/g, '');
    return digits.length === 8 ? digits : null;
  }

  function formatCep(input) {
    var d = normalizeCep(input);
    return d ? d.slice(0, 5) + '-' + d.slice(5) : null;
  }

  function regionFor(cep) {
    var first = Number(cep.charAt(0));
    for (var i = 0; i < REGIONS.length; i++) {
      if (first >= REGIONS[i].from && first <= REGIONS[i].to) { return REGIONS[i]; }
    }
    return null;
  }

  function quote(cepInput, method, subtotalCents) {
    var cep = normalizeCep(cepInput);
    if (!cep) { return { ok: false, error: 'invalid-cep' }; }
    var mode = method === 'express' ? 'express' : 'standard';
    var region = regionFor(cep);
    var opt = region[mode];
    if (!opt) { return { ok: false, error: 'express-unavailable', cep: cep, region: region.name }; }
    var cents = opt.cents;
    if (mode === 'standard' && subtotalCents >= FREE_STANDARD_CENTS) { cents = 0; }
    return { ok: true, cep: cep, region: region.name, method: mode, priceCents: cents, days: opt.days };
  }

  function quoteAll(cepInput, subtotalCents) {
    var out = [];
    var methods = ['standard', 'express'];
    for (var i = 0; i < methods.length; i++) {
      var q = quote(cepInput, methods[i], subtotalCents);
      if (q.ok) { out.push(q); }
    }
    return out;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  // Deterministic simulated slots: weekdays only, starting the day after `from`.
  function teleconsultSlots(from, days) {
    var start = from instanceof Date ? new Date(from.getTime()) : new Date();
    var count = days === undefined ? 5 : days;
    var out = [];
    var cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var guard = 0;
    while (out.length < count * SLOT_HOURS.length && guard < 60) {
      guard++;
      cursor.setDate(cursor.getDate() + 1);
      var dow = cursor.getDay();
      if (dow === 0 || dow === 6) { continue; }
      var date = cursor.getFullYear() + '-' + pad(cursor.getMonth() + 1) + '-' + pad(cursor.getDate());
      for (var h = 0; h < SLOT_HOURS.length; h++) {
        out.push({
          date: date,
          time: SLOT_HOURS[h],
          nutritionist: NUTRITIONISTS[(out.length) % NUTRITIONISTS.length]
        });
      }
    }
    return out;
  }

  function generateProtocol(rng) {
    var r = typeof rng === 'function' ? rng() : Math.random();
    var n = Math.min(9999, Math.floor(r * 10000));
    return 'NUTRI-' + ('000' + n).slice(-4);
  }

  function isProtocol(value) {
    return PROTOCOL_RE.test(String(value));
  }

  var api = {
    normalizeCep: normalizeCep,
    formatCep: formatCep,
    quote: quote,
    quoteAll: quoteAll,
    teleconsultSlots: teleconsultSlots,
    generateProtocol: generateProtocol,
    isProtocol: isProtocol,
    freeStandardCents: FREE_STANDARD_CENTS
  };

  root.DanNutriShipping = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
