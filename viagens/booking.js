/* Viagens booking: season highlights for the Home, passenger validation,
   boarding points and the simulated TRIP-XXXX voucher.
   Exposed as window.ViagensBooking (and via module.exports in Node). */
(function (root) {
  'use strict';

  var data = root.ViagensDestinations || (typeof require !== 'undefined' ? require('./destinations.js') : null);
  var quote = root.ViagensQuote || (typeof require !== 'undefined' ? require('./quote.js') : null);

  var BOARDINGS = [
    { id: 'gru', name: 'Aeroporto de Guarulhos (GRU)' },
    { id: 'cgh', name: 'Aeroporto de Congonhas (CGH)' },
    { id: 'bra', name: 'Rodoviaria do Tiete (Sao Paulo)' },
    { id: 'gig', name: 'Aeroporto do Galeao (GIG)' }
  ];
  var CODE_PREFIX = 'TRIP-';
  // No 0/O/1/I to keep codes readable.
  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var CODE_RE = /^TRIP-[A-Z0-9]{4}$/;
  var MONTHS = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho',
    'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  // Month indexes (0-11) covered by a season text such as
  // "Setembro a Fevereiro" or "Junho a Setembro (neve) ou Dezembro a Marco".
  function seasonMonths(text) {
    var t = data.normalize(text);
    var re = /([a-z]+) a ([a-z]+)/g;
    var out = [];
    var m;
    while ((m = re.exec(t))) {
      var from = MONTHS.indexOf(m[1]);
      var to = MONTHS.indexOf(m[2]);
      if (from < 0 || to < 0) { continue; }
      for (var i = from; ; i = (i + 1) % 12) {
        if (out.indexOf(i) < 0) { out.push(i); }
        if (i === to) { break; }
      }
    }
    return out;
  }

  // Destinations in season for a 0-based month, cheapest entry price first.
  function seasonHighlights(month, limit) {
    var list = data.DESTINATIONS.filter(function (d) { return seasonMonths(d.climate.season).indexOf(month) >= 0; });
    list.sort(function (a, b) { return entryPrice(a) - entryPrice(b); });
    return list.slice(0, limit === undefined ? 3 : limit);
  }

  function entryPrice(d) {
    return Math.min.apply(null, d.durations.map(function (n) { return d.priceCents[n]; }));
  }

  function getBoarding(id) {
    for (var i = 0; i < BOARDINGS.length; i++) { if (BOARDINGS[i].id === id) { return BOARDINGS[i]; } }
    return null;
  }

  // Name: at least two words of 2+ letters. Document: CPF (11 digits) or
  // passport-like (6-9 letters/digits), punctuation ignored.
  function normalizeDocument(doc) { return String(doc || '').replace(/[\s.\-\/]/g, '').toUpperCase(); }

  function validateTraveler(t) {
    var errors = {};
    var name = String((t && t.name) || '').replace(/\s+/g, ' ').trim();
    var words = name.split(' ');
    if (words.length < 2 || !words.every(function (w) { return /^[A-Za-zÀ-ÿ'.-]{2,}$/.test(w); })) {
      errors.name = 'Informe nome e sobrenome.';
    }
    var doc = normalizeDocument(t && t.document);
    if (!(/^\d{11}$/.test(doc) || /^[A-Z0-9]{6,9}$/.test(doc))) {
      errors.document = 'Documento invalido (CPF ou passaporte).';
    }
    return { valid: !errors.name && !errors.document, errors: errors, traveler: { name: name, document: doc } };
  }

  // Everyone travels on every package, so we need as many passengers as the
  // largest party in the quote.
  function requiredTravelers(state) {
    return state.items.reduce(function (m, i) { return Math.max(m, i.travelers); }, 0);
  }

  function validateBooking(state, form) {
    var result = { valid: true, errors: [], travelers: [], boardingError: '', formError: '' };
    var need = requiredTravelers(state);
    if (!need) { result.valid = false; result.formError = 'Sua cotacao esta vazia.'; return result; }
    var list = Array.isArray(form && form.travelers) ? form.travelers : [];
    if (list.length !== need) { result.valid = false; result.formError = 'Informe os ' + need + ' viajante(s).'; return result; }
    var seen = {};
    list.forEach(function (t) {
      var v = validateTraveler(t);
      var errors = v.errors;
      if (v.valid && seen[v.traveler.document]) { errors = { document: 'Documento repetido.' }; }
      if (v.valid) { seen[v.traveler.document] = true; }
      result.errors.push(errors);
      result.travelers.push(v.traveler);
      if (errors.name || errors.document) { result.valid = false; }
    });
    if (!getBoarding(form.boarding)) { result.valid = false; result.boardingError = 'Escolha o local de embarque.'; }
    return result;
  }

  function generateCode(rng) {
    rng = rng || Math.random;
    var s = '';
    for (var i = 0; i < 4; i++) {
      var r = Number(rng());
      if (!isFinite(r) || r < 0 || r >= 1) { r = 0; }
      s += CODE_ALPHABET.charAt(Math.floor(r * CODE_ALPHABET.length));
    }
    return CODE_PREFIX + s;
  }

  function isValidCode(code) { return CODE_RE.test(String(code)); }

  // Returns { error } or { voucher }. Does not mutate the quote state.
  function issueVoucher(state, form, opts) {
    opts = opts || {};
    var v = validateBooking(state, form);
    if (!v.valid) { return { error: v }; }
    var res = quote.compute(state);
    var boarding = getBoarding(form.boarding);
    return {
      voucher: {
        code: generateCode(opts.rng),
        issuedAt: (opts.now instanceof Date ? opts.now : new Date()).toISOString(),
        boarding: boarding.name,
        travelers: v.travelers,
        lines: res.lines.map(function (l) {
          return { name: l.name, duration: l.duration, insurance: l.insurance, totalCents: l.totalCents };
        }),
        discountCents: res.discountCents,
        totalCents: res.totalCents
      }
    };
  }

  var api = {
    BOARDINGS: BOARDINGS, seasonMonths: seasonMonths, seasonHighlights: seasonHighlights,
    getBoarding: getBoarding, normalizeDocument: normalizeDocument, validateTraveler: validateTraveler,
    requiredTravelers: requiredTravelers, validateBooking: validateBooking, generateCode: generateCode,
    isValidCode: isValidCode, issueVoucher: issueVoucher
  };
  root.ViagensBooking = api;
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
})(typeof window !== 'undefined' ? window : this);
