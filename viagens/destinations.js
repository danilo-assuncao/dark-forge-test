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

  function filterDestinations(opts) {
    opts = opts || {};
    return DESTINATIONS.filter(function (d) {
      if (opts.category && d.category !== opts.category) { return false; }
      if (opts.duration && d.durations.indexOf(Number(opts.duration)) < 0) { return false; }
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
    getDestination: getDestination
  };

  // Browser rendering (DOM APIs only, no innerHTML).
  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text !== undefined) { n.textContent = text; }
    if (cls) { n.className = cls; }
    return n;
  }

  function render(container, state) {
    container.textContent = '';
    var list = filterDestinations(state);
    if (!list.length) {
      container.appendChild(el('p', 'Nenhum destino encontrado.', 'empty'));
      return;
    }
    CATEGORIES.forEach(function (cat) {
      var items = list.filter(function (d) { return d.category === cat; });
      if (!items.length) { return; }
      var section = el('section', undefined, 'category');
      section.appendChild(el('h2', cat));
      var grid = el('div', undefined, 'grid');
      items.forEach(function (d) {
        var card = el('article', undefined, 'card');
        card.appendChild(el('h3', d.name));
        var chips = el('p', undefined, 'chips');
        d.durations.forEach(function (n) {
          chips.appendChild(el('span', durationLabel(n) + ' - ' + formatBRL(d.priceCents[n]), 'chip'));
        });
        card.appendChild(chips);
        var table = el('table');
        var rows = [
          ['Melhor epoca', d.climate.season],
          ['Temperatura media', d.climate.avgTempC + ' C'],
          ['Clima', d.climate.summary],
          ['Inclusos', d.includes.join(', ')]
        ];
        rows.forEach(function (r) {
          var tr = el('tr');
          var th = el('th', r[0]);
          th.scope = 'row';
          tr.appendChild(th);
          tr.appendChild(el('td', r[1]));
          table.appendChild(tr);
        });
        card.appendChild(table);
        grid.appendChild(card);
      });
      section.appendChild(grid);
      container.appendChild(section);
    });
  }

  function init() {
    var container = document.getElementById('catalog');
    var catSel = document.getElementById('filter-category');
    var durSel = document.getElementById('filter-duration');
    if (!container || !catSel || !durSel) { return; }
    CATEGORIES.forEach(function (c) {
      var o = el('option', c); o.value = c; catSel.appendChild(o);
    });
    DURATIONS.forEach(function (d) {
      var o = el('option', durationLabel(d)); o.value = String(d); durSel.appendChild(o);
    });
    function update() { render(container, { category: catSel.value, duration: durSel.value }); }
    catSel.addEventListener('change', update);
    durSel.addEventListener('change', update);
    update();
  }

  root.ViagensDestinations = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : this);
