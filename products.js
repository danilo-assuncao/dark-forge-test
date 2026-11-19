/* Mock menu for Dan Food: dishes grouped by category, with the portion sizes
   served, estimated preparation time and a nutrition table. Prices are in BRL
   cents. Exposed as window.DanProducts; loaded before cart.js and script.js.
   The "sizes" field holds the portions; "boxTime" holds the preparation time
   of the base (first) portion and "checklist" the main ingredients. */
(function () {
  'use strict';

  var PORTIONS = ['Individual', 'Duplo', 'Familia'];
  var SINGLE = ['Porcao unica'];
  // Preparation-time and nutrition multipliers per portion, relative to Individual.
  var TIME_FACTOR = { 'Individual': 1, 'Duplo': 1.25, 'Familia': 1.5, 'Porcao unica': 1 };
  var AMOUNT_FACTOR = { 'Individual': 1, 'Duplo': 2, 'Familia': 3.5, 'Porcao unica': 1 };

  function formatMinutes(total) {
    var rounded = Math.round(total / 5) * 5;
    var h = Math.floor(rounded / 60);
    var m = rounded % 60;
    if (h === 0) {
      return m + ' min';
    }
    return m === 0 ? h + 'h' : h + 'h' + (m < 10 ? '0' : '') + m;
  }

  // Nutrition table: one row per portion with prep time, energy, macros and sodium.
  // nutrition = [kcal, carbs (g), protein (g), fat (g), sodium (mg)] for the base portion.
  function nutritionTable(sizes, baseMinutes, nutrition) {
    var rows = [];
    for (var i = 0; i < sizes.length; i++) {
      var f = AMOUNT_FACTOR[sizes[i]];
      rows.push({ size: sizes[i], values: [formatMinutes(baseMinutes * TIME_FACTOR[sizes[i]]),
        Math.round(nutrition[0] * f) + ' kcal', Math.round(nutrition[1] * f) + ' g',
        Math.round(nutrition[2] * f) + ' g', Math.round(nutrition[3] * f) + ' g',
        Math.round(nutrition[4] * f) + ' mg'] });
    }
    return { unit: 'Informacao nutricional por porcao',
      columns: ['Tempo de preparo', 'Calorias', 'Carboidratos', 'Proteinas', 'Gorduras', 'Sodio'], rows: rows };
  }

  function dish(id, name, category, priceCents, baseMinutes, sizes, nutrition, description, ingredients) {
    var prepTime = formatMinutes(baseMinutes);
    return { id: id, name: name, category: category, priceCents: priceCents, description: description,
      boxTime: prepTime, checklist: ingredients.slice(),
      specs: [{ label: 'Categoria', value: category },
        { label: 'Porcoes', value: sizes.join(', ') },
        { label: 'Tempo de preparo (' + sizes[0] + ')', value: prepTime },
        { label: 'Calorias (' + sizes[0] + ')', value: nutrition[0] + ' kcal' }],
      sizes: sizes.slice(), measurements: nutritionTable(sizes, baseMinutes, nutrition) };
  }

  var EXECUTIVOS = 'Pratos Executivos';
  var MASSAS = 'Massas & Risotos';
  var BURGERS = 'Burgers Artesanais';
  var SOBREMESAS = 'Sobremesas & Bebidas';

  var PRODUCTS = [
    dish('file-parmegiana', 'File a parmegiana', EXECUTIVOS, 3990, 30, PORTIONS, [780, 62, 46, 38, 1250], 'File de carne empanado com molho de tomate, queijo gratinado, arroz e batata frita.', ['File de carne','Molho de tomate','Queijo mussarela','Arroz','Batata frita']),
    dish('frango-grelhado', 'Frango grelhado com legumes', EXECUTIVOS, 3290, 25, PORTIONS, [520, 38, 48, 18, 780], 'Peito de frango grelhado, arroz integral, legumes salteados e salada verde.', ['Peito de frango','Arroz integral','Legumes salteados','Salada verde','Azeite']),
    dish('feijoada-completa', 'Feijoada completa', EXECUTIVOS, 4590, 50, PORTIONS, [950, 78, 52, 46, 1850], 'Feijao preto com carnes selecionadas, arroz, couve, farofa e laranja.', ['Feijao preto','Carnes selecionadas','Arroz','Couve refogada','Farofa']),
    dish('fettuccine-alfredo', 'Fettuccine ao molho alfredo', MASSAS, 3690, 25, PORTIONS, [720, 78, 24, 34, 890], 'Massa fresca com molho cremoso de queijo parmesao e manteiga.', ['Fettuccine fresco','Creme de leite','Parmesao','Manteiga','Salsa']),
    dish('risoto-cogumelos', 'Risoto de cogumelos', MASSAS, 4190, 35, PORTIONS, [640, 84, 16, 24, 820], 'Arroz arboreo cremoso com mix de cogumelos, vinho branco e parmesao.', ['Arroz arboreo','Mix de cogumelos','Vinho branco','Parmesao','Caldo de legumes']),
    dish('lasanha-bolonhesa', 'Lasanha a bolonhesa', MASSAS, 3890, 30, PORTIONS, [810, 66, 42, 40, 1320], 'Camadas de massa, molho bolonhesa, presunto e queijo gratinado.', ['Massa de lasanha','Molho bolonhesa','Presunto','Queijo mussarela','Molho branco']),
    dish('burger-classico', 'Burger classico', BURGERS, 3290, 20, PORTIONS, [740, 48, 36, 44, 1100], 'Hamburguer de 180 g, queijo cheddar, alface, tomate e molho da casa no pao brioche.', ['Hamburguer 180 g','Queijo cheddar','Alface e tomate','Molho da casa','Pao brioche']),
    dish('burger-bacon', 'Burger bacon crocante', BURGERS, 3790, 22, PORTIONS, [890, 50, 42, 56, 1480], 'Hamburguer de 180 g, bacon crocante, cheddar e cebola caramelizada.', ['Hamburguer 180 g','Bacon crocante','Cheddar','Cebola caramelizada','Pao brioche']),
    dish('burger-veggie', 'Burger veggie de grao-de-bico', BURGERS, 3490, 20, PORTIONS, [610, 62, 22, 28, 920], 'Burger de grao-de-bico e beterraba com rucula, tomate seco e maionese de ervas.', ['Burger de grao-de-bico','Rucula','Tomate seco','Maionese de ervas','Pao integral']),
    dish('petit-gateau', 'Petit gateau com sorvete', SOBREMESAS, 2490, 15, SINGLE, [520, 62, 8, 28, 180], 'Bolo quente de chocolate com recheio cremoso e sorvete de creme.', ['Chocolate meio amargo','Manteiga','Ovos','Sorvete de creme','Calda de chocolate']),
    dish('pudim-leite', 'Pudim de leite', SOBREMESAS, 1490, 10, ['Individual', 'Familia'], [320, 52, 7, 9, 110], 'Pudim de leite condensado com calda de caramelo.', ['Leite condensado','Leite','Ovos','Calda de caramelo']),
    dish('suco-natural', 'Suco natural da fruta', SOBREMESAS, 990, 5, ['Individual', 'Duplo'], [110, 26, 1, 0, 10], 'Suco da fruta do dia, sem adicao de acucar, servido gelado.', ['Fruta do dia','Agua gelada','Gelo','Folhas de hortela'])
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
