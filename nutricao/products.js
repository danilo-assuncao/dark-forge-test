/* Dan Nutri catalog: categories, presentations, goals and per-dose macros.
   Prices are in BRL cents. Exposed as window.DanNutriProducts (and via
   module.exports when loaded from Node). */
(function (root) {
  'use strict';

  var CATEGORIES = [
    'Proteinas',
    'Vitaminas & Longevidade',
    'Pre-Treino & Energia',
    'Planos Alimentares'
  ];
  var PRESENTATIONS = ['300g', '900g', '60 caps', 'Mensal'];
  var GOALS = ['Hipertrofia', 'Emagrecimento', 'Saude'];

  // macros per dose: kcal, proteinG, carbsG
  var PRODUCTS = [
    { id: 'whey-concentrado', name: 'Whey Protein Concentrado', category: 'Proteinas',
      presentations: ['300g', '900g'], goals: ['Hipertrofia', 'Saude'],
      priceCents: { '300g': 8990, '900g': 21990 },
      dose: '30g', macros: { kcal: 120, proteinG: 24, carbsG: 3 } },
    { id: 'whey-isolado', name: 'Whey Protein Isolado', category: 'Proteinas',
      presentations: ['300g', '900g'], goals: ['Emagrecimento', 'Hipertrofia'],
      priceCents: { '300g': 11990, '900g': 29990 },
      dose: '30g', macros: { kcal: 110, proteinG: 27, carbsG: 1 } },
    { id: 'multivitaminico', name: 'Multivitaminico Longevidade', category: 'Vitaminas & Longevidade',
      presentations: ['60 caps'], goals: ['Saude'],
      priceCents: { '60 caps': 6990 },
      dose: '2 caps', macros: { kcal: 5, proteinG: 0, carbsG: 1 } },
    { id: 'omega-3', name: 'Omega 3', category: 'Vitaminas & Longevidade',
      presentations: ['60 caps'], goals: ['Saude', 'Emagrecimento'],
      priceCents: { '60 caps': 5990 },
      dose: '2 caps', macros: { kcal: 20, proteinG: 0, carbsG: 0 } },
    { id: 'pre-treino', name: 'Pre-Treino Energy', category: 'Pre-Treino & Energia',
      presentations: ['300g'], goals: ['Hipertrofia', 'Emagrecimento'],
      priceCents: { '300g': 9990 },
      dose: '10g', macros: { kcal: 15, proteinG: 0, carbsG: 4 } },
    { id: 'cafeina', name: 'Cafeina Termogenica', category: 'Pre-Treino & Energia',
      presentations: ['60 caps'], goals: ['Emagrecimento'],
      priceCents: { '60 caps': 4990 },
      dose: '1 cap', macros: { kcal: 2, proteinG: 0, carbsG: 0 } },
    { id: 'plano-hipertrofia', name: 'Plano Alimentar Hipertrofia', category: 'Planos Alimentares',
      presentations: ['Mensal'], goals: ['Hipertrofia'],
      priceCents: { 'Mensal': 14990 },
      dose: '1 refeicao', macros: { kcal: 650, proteinG: 45, carbsG: 70 } },
    { id: 'plano-emagrecimento', name: 'Plano Alimentar Emagrecimento', category: 'Planos Alimentares',
      presentations: ['Mensal'], goals: ['Emagrecimento'],
      priceCents: { 'Mensal': 13990 },
      dose: '1 refeicao', macros: { kcal: 420, proteinG: 38, carbsG: 35 } },
    { id: 'plano-saude', name: 'Plano Alimentar Saude', category: 'Planos Alimentares',
      presentations: ['Mensal'], goals: ['Saude'],
      priceCents: { 'Mensal': 12990 },
      dose: '1 refeicao', macros: { kcal: 520, proteinG: 30, carbsG: 55 } }
  ];

  function filter(pred) {
    var out = [];
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (pred(PRODUCTS[i])) {
        out.push(PRODUCTS[i]);
      }
    }
    return out;
  }

  var api = {
    categories: CATEGORIES,
    presentations: PRESENTATIONS,
    goals: GOALS,
    products: PRODUCTS,
    find: function (id) {
      var m = filter(function (p) { return p.id === id; });
      return m.length ? m[0] : null;
    },
    byCategory: function (category) {
      return filter(function (p) { return p.category === category; });
    },
    byGoal: function (goal) {
      return filter(function (p) { return p.goals.indexOf(goal) !== -1; });
    }
  };

  root.DanNutriProducts = api;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : this);
