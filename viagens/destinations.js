/* Viagens catalog: destinations grouped by category, with durations,
   climate and inclusions. Prices are in BRL cents per person.
   Exposed as window.ViagensDestinations (and via module.exports in Node). */
(function (root) {
  'use strict';

  var CATEGORIES = ['Praias', 'Serra & Inverno', 'Internacional', 'Ecoturismo'];
  var DURATIONS = [3, 7, 12];

  var DESTINATIONS = [
    { id: 'porto-de-galinhas', name: 'Porto de Galinhas, PE', category: 'Praias',
      durations: [3, 7], climate: { season: 'Setembro a Fevereiro', avgTempC: 28, summary: 'Quente e ensolarado' },
      includes: ['Hospedagem', 'Cafe da manha', 'Passeio de jangada'],
      priceCents: { 3: 189000, 7: 369000 } },
    { id: 'jericoacoara', name: 'Jericoacoara, CE', category: 'Praias',
      durations: [7, 12], climate: { season: 'Julho a Janeiro', avgTempC: 30, summary: 'Seco e com ventos fortes' },
      includes: ['Hospedagem', 'Cafe da manha', 'Translado 4x4', 'Passeio de buggy'],
      priceCents: { 7: 429000, 12: 689000 } },
    { id: 'campos-do-jordao', name: 'Campos do Jordao, SP', category: 'Serra & Inverno',
      durations: [3, 7], climate: { season: 'Junho a Agosto', avgTempC: 12, summary: 'Frio e seco, noites abaixo de 5 C' },
      includes: ['Hospedagem', 'Cafe da manha', 'Fondue de boas-vindas'],
      priceCents: { 3: 159000, 7: 319000 } },
    { id: 'gramado', name: 'Gramado, RS', category: 'Serra & Inverno',
      durations: [3, 7, 12], climate: { season: 'Maio a Setembro', avgTempC: 10, summary: 'Frio intenso, chance de geada' },
      includes: ['Hospedagem', 'Cafe da manha', 'Ingresso Snowland', 'City tour'],
      priceCents: { 3: 179000, 7: 349000, 12: 559000 } },
    { id: 'lisboa', name: 'Lisboa, Portugal', category: 'Internacional',
      durations: [7, 12], climate: { season: 'Abril a Outubro', avgTempC: 22, summary: 'Ameno a quente, pouca chuva' },
      includes: ['Passagem aerea', 'Hospedagem', 'Cafe da manha', 'Seguro viagem'],
      priceCents: { 7: 599000, 12: 879000 } },
    { id: 'santiago', name: 'Santiago, Chile', category: 'Internacional',
      durations: [3, 7], climate: { season: 'Junho a Setembro (neve) ou Dezembro a Marco', avgTempC: 15, summary: 'Quatro estacoes bem definidas' },
      includes: ['Passagem aerea', 'Hospedagem', 'Seguro viagem'],
      priceCents: { 3: 349000, 7: 579000 } },
    { id: 'bonito', name: 'Bonito, MS', category: 'Ecoturismo',
      durations: [3, 7], climate: { season: 'Maio a Setembro', avgTempC: 24, summary: 'Seco, aguas cristalinas' },
      includes: ['Hospedagem', 'Cafe da manha', 'Flutuacao no Rio Sucuri', 'Guia credenciado'],
      priceCents: { 3: 219000, 7: 419000 } },
    { id: 'amazonia', name: 'Amazonia, AM', category: 'Ecoturismo',
      durations: [7, 12], climate: { season: 'Julho a Dezembro', avgTempC: 31, summary: 'Quente e umido, menos chuva' },
      includes: ['Lodge na selva', 'Pensao completa', 'Passeios de barco', 'Guia local'],
      priceCents: { 7: 489000, 12: 779000 } }
  ];

  var DURATION_LABELS = { 3: '3 dias', 7: '7 dias', 12: '12 dias' };

  function formatBRL(cents) {
    if (typeof cents !== 'number' || !isFinite(cents)) { return 'Sob consulta'; }
    var abs = Math.abs(Math.round(cents));
    var reais = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    var c = abs % 100;
    return (cents < 0 ? '-' : '') + 'R$ ' + reais + ',' + (c < 10 ? '0' : '') + c;
  }

  function durationLabel(d) {
    return DURATION_LABELS[d] || d + ' dias';
  }

  function byCategory(category) {
    return DESTINATIONS.filter(function (d) { return d.category === category; });
  }

  // Lowercase, accent-free, trimmed text used for searching.
  function normalize(text) {
    var t = String(text === undefined || text === null ? '' : text).toLowerCase();
    if (t.normalize) { t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
    return t.replace(/\s+/g, ' ').trim();
  }

  function searchText(d) {
    return normalize([d.name, d.category, d.climate.summary, d.includes.join(' ')].join(' '));
  }

  // Day-by-day plan for a destination and package length. Day 1 is arrival,
  // the last day is departure and the days in between rotate through the
  // package inclusions (activities) with free days mixed in.
  function buildItinerary(dest, duration) {
    var n = Number(duration);
    if (!dest || !dest.priceCents || dest.durations.indexOf(n) < 0) { return []; }
    var lodging = /Hospedagem|Lodge/;
    var activities = dest.includes.filter(function (i) { return !lodging.test(i) && !/Cafe da manha|Pensao|Seguro|Passagem/.test(i); });
    var days = [];
    for (var i = 1; i <= n; i++) {
      var title;
      var detail;
      if (i === 1) {
        title = 'Chegada';
        detail = 'Chegada a ' + dest.name + ', acomodacao e passeio de reconhecimento.';
      } else if (i === n) {
        title = 'Despedida';
        detail = 'Cafe da manha, ultimas compras e traslado de volta.';
      } else if (activities.length && (i % 3 !== 0 || n <= 3)) {
        var act = activities[(i - 2) % activities.length];
        title = act;
        detail = 'Dia dedicado a: ' + act + '.';
      } else {
        title = 'Dia livre';
        detail = 'Tempo livre para descansar e explorar ' + dest.name + ' por conta propria.';
      }
      days.push({ day: i, title: title, detail: detail });
    }
    return days;
  }

  function filterDestinations(opts) {
    opts = opts || {};
    return DESTINATIONS.filter(function (d) {
      if (opts.category && d.category !== opts.category) { return false; }
      if (opts.duration && d.durations.indexOf(Number(opts.duration)) < 0) { return false; }
      if (opts.query && searchText(d).indexOf(normalize(opts.query)) < 0) { return false; }
      return true;
    });
  }

  function getDestination(id) {
    for (var i = 0; i < DESTINATIONS.length; i++) {
      if (DESTINATIONS[i].id === id) { return DESTINATIONS[i]; }
    }
    return null;
  }

  var api = {
    CATEGORIES: CATEGORIES,
    DURATIONS: DURATIONS,
    DESTINATIONS: DESTINATIONS,
    formatBRL: formatBRL,
    durationLabel: durationLabel,
    byCategory: byCategory,
    filterDestinations: filterDestinations,
    getDestination: getDestination,
    normalize: normalize,
    buildItinerary: buildItinerary
  };

  root.ViagensDestinations = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
