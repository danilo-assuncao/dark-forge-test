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

  function service(id, name, category, priceCents, baseMinutes, warranty, interval, description, checklist) {
    var boxTime = formatMinutes(baseMinutes);
    return { id: id, name: name, category: category, priceCents: priceCents, description: description,
      boxTime: boxTime, checklist: checklist.slice(),
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
    service('oil-change', 'Troca de oleo e filtros', REVISAO, 24990, 60, '90 dias', '10.000 km ou 12 meses', 'Oleo do motor, filtro de oleo e filtro de ar com checklist de 20 itens.', ['Oleo do motor','Filtro de oleo','Filtro de ar','Nivel dos fluidos','Vazamentos visiveis']),
    service('major-service', 'Revisao completa', REVISAO, 54990, 180, '6 meses', '20.000 km ou 12 meses', 'Revisao por quilometragem: fluidos, correias, velas, filtros e inspecao geral.', ['Fluidos e filtros','Correias e mangueiras','Velas de ignicao','Freios e suspensao','Inspecao geral']),
    service('timing-belt', 'Troca da correia dentada', REVISAO, 79990, 240, '12 meses', '60.000 km', 'Correia dentada, tensor e bomba dagua substituidos com ajuste de ponto.', ['Correia dentada','Tensor','Bomba dagua','Ajuste de ponto','Teste de funcionamento']),
    service('brake-pads', 'Troca de pastilhas de freio', FREIOS, 31990, 75, '6 meses', '30.000 km', 'Pastilhas dianteiras com limpeza das pincas e teste em pista.', ['Pastilhas dianteiras','Limpeza das pincas','Espessura dos discos','Nivel do fluido','Teste em pista']),
    service('brake-discs', 'Troca de discos e fluido de freio', FREIOS, 64990, 120, '12 meses', '50.000 km', 'Discos dianteiros, pastilhas e sangria completa do fluido de freio.', ['Discos dianteiros','Pastilhas','Sangria do fluido','Pincas e mangueiras','Teste em pista']),
    service('shock-absorbers', 'Troca de amortecedores', FREIOS, 89990, 210, '12 meses', '60.000 km', 'Par de amortecedores com coxins e batentes, seguido de alinhamento.', ['Amortecedores (par)','Coxins','Batentes','Alinhamento final','Teste em pista']),
    service('tire-fitting', 'Montagem e balanceamento de pneus', PNEUS, 19990, 60, '30 dias', 'A cada 10.000 km', 'Montagem de quatro pneus com balanceamento computadorizado.', ['Montagem dos quatro pneus','Balanceamento computadorizado','Calibragem','Valvulas','Aperto das rodas']),
    service('wheel-alignment', 'Alinhamento e cambagem', PNEUS, 14990, 45, '30 dias', 'A cada 10.000 km', 'Alinhamento 3D das quatro rodas com relatorio antes e depois.', ['Alinhamento 3D','Cambagem e caster','Convergencia','Relatorio antes e depois','Pressao dos pneus']),
    service('tire-rotation', 'Rodizio e calibragem', PNEUS, 8990, 30, '15 dias', 'A cada 10.000 km', 'Rodizio dos pneus, calibragem e verificacao de desgaste.', ['Rodizio dos pneus','Calibragem','Desgaste da banda','Aperto das rodas','Estado do estepe']),
    service('scanner-diagnosis', 'Diagnostico com scanner', ELETRICA, 17990, 45, '30 dias', 'Quando a luz de injecao acender', 'Leitura de falhas, dados em tempo real e laudo tecnico impresso.', ['Leitura de falhas','Dados em tempo real','Limpeza dos codigos','Laudo tecnico impresso','Inspecao visual']),
    service('battery-replacement', 'Troca de bateria e teste do alternador', ELETRICA, 42990, 40, '12 meses', 'A cada 24 meses', 'Bateria nova com teste de carga, alternador e motor de partida.', ['Teste de carga da bateria','Alternador','Motor de partida','Terminais e cabos','Bateria nova instalada']),
    service('ac-service', 'Higienizacao e recarga do ar-condicionado', ELETRICA, 38990, 90, '6 meses', 'A cada 12 meses', 'Recarga de gas, troca do filtro de cabine e higienizacao do sistema.', ['Recarga de gas','Filtro de cabine','Higienizacao do sistema','Teste de pressao','Temperatura na saida'])
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
