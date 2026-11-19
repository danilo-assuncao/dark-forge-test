/* Mock service catalog for Dan Motors: mechanical services grouped by
   specialty, with the vehicle sizes (portes) served, estimated bay time and a
   technical table. Prices are in BRL cents. Exposed as window.DanProducts;
   loaded before cart.js and script.js. The "sizes" field holds the portes. */
(function () {
  'use strict';

  var PORTES = ['Hatch/Sedan', 'SUV/Picape', 'Utilitario'];
  // Bay-time multiplier per porte, relative to the Hatch/Sedan base time.
  var PORTE_FACTOR = [1, 1.25, 1.5];

  function formatMinutes(total) {
    var rounded = Math.round(total / 5) * 5;
    var h = Math.floor(rounded / 60);
    var m = rounded % 60;
    if (h === 0) {
      return m + ' min';
    }
    return m === 0 ? h + 'h' : h + 'h' + (m < 10 ? '0' : '') + m;
  }

  // Technical table: one row per porte with bay time, warranty and interval.
  function technicalTable(baseMinutes, warranty, interval) {
    var rows = [];
    for (var i = 0; i < PORTES.length; i++) {
      rows.push({ size: PORTES[i], values: [formatMinutes(baseMinutes * PORTE_FACTOR[i]), warranty, interval] });
    }
    return { unit: 'Tempo de box por porte', columns: ['Tempo de box', 'Garantia', 'Intervalo recomendado'], rows: rows };
  }

  function service(id, name, category, priceCents, baseMinutes, warranty, interval, description) {
    var boxTime = formatMinutes(baseMinutes);
    return { id: id, name: name, category: category, priceCents: priceCents, description: description,
      boxTime: boxTime,
      specs: [{ label: 'Especialidade', value: category },
        { label: 'Portes atendidos', value: PORTES.join(', ') },
        { label: 'Tempo de box (Hatch/Sedan)', value: boxTime },
        { label: 'Garantia', value: warranty },
        { label: 'Intervalo recomendado', value: interval }],
      sizes: PORTES.slice(), measurements: technicalTable(baseMinutes, warranty, interval) };
  }

  var REVISAO = 'Revisao & Motor';
  var FREIOS = 'Freios & Suspensao';
  var PNEUS = 'Pneus & Alinhamento';
  var ELETRICA = 'Eletrica & Diagnostico';

  var PRODUCTS = [
    service('oil-change', 'Troca de oleo e filtros', REVISAO, 24990, 60, '90 dias', '10.000 km ou 12 meses', 'Oleo do motor, filtro de oleo e filtro de ar com checklist de 20 itens.'),
    service('major-service', 'Revisao completa', REVISAO, 54990, 180, '6 meses', '20.000 km ou 12 meses', 'Revisao por quilometragem: fluidos, correias, velas, filtros e inspecao geral.'),
    service('timing-belt', 'Troca da correia dentada', REVISAO, 79990, 240, '12 meses', '60.000 km', 'Correia dentada, tensor e bomba dagua substituidos com ajuste de ponto.'),
    service('brake-pads', 'Troca de pastilhas de freio', FREIOS, 31990, 75, '6 meses', '30.000 km', 'Pastilhas dianteiras com limpeza das pinças e teste em pista.'),
    service('brake-discs', 'Troca de discos e fluido de freio', FREIOS, 64990, 120, '12 meses', '50.000 km', 'Discos dianteiros, pastilhas e sangria completa do fluido de freio.'),
    service('shock-absorbers', 'Troca de amortecedores', FREIOS, 89990, 210, '12 meses', '60.000 km', 'Par de amortecedores com coxins e batentes, seguido de alinhamento.'),
    service('tire-fitting', 'Montagem e balanceamento de pneus', PNEUS, 19990, 60, '30 dias', 'A cada 10.000 km', 'Montagem de quatro pneus com balanceamento computadorizado.'),
    service('wheel-alignment', 'Alinhamento e cambagem', PNEUS, 14990, 45, '30 dias', 'A cada 10.000 km', 'Alinhamento 3D das quatro rodas com relatorio antes e depois.'),
    service('tire-rotation', 'Rodizio e calibragem', PNEUS, 8990, 30, '15 dias', 'A cada 10.000 km', 'Rodizio dos pneus, calibragem e verificacao de desgaste.'),
    service('scanner-diagnosis', 'Diagnostico com scanner', ELETRICA, 17990, 45, '30 dias', 'Quando a luz de injecao acender', 'Leitura de falhas, dados em tempo real e laudo tecnico impresso.'),
    service('battery-replacement', 'Troca de bateria e teste do alternador', ELETRICA, 42990, 40, '12 meses', 'A cada 24 meses', 'Bateria nova com teste de carga, alternador e motor de partida.'),
    service('ac-service', 'Higienizacao e recarga do ar-condicionado', ELETRICA, 38990, 90, '6 meses', 'A cada 12 meses', 'Recarga de gas, troca do filtro de cabine e higienizacao do sistema.')
  ];

  window.DanProducts = {
    all: function () {
      return PRODUCTS.slice();
    },
    categories: function () {
      var out = [];
      for (var i = 0; i < PRODUCTS.length; i++) {
        if (out.indexOf(PRODUCTS[i].category) === -1) {
          out.push(PRODUCTS[i].category);
        }
      }
      return out;
    },
    find: function (id) {
      for (var i = 0; i < PRODUCTS.length; i++) {
        if (PRODUCTS[i].id === id) {
          return PRODUCTS[i];
        }
      }
      return null;
    }
  };
})();
