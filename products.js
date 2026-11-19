/* Mock catalog data: nutritional compounds. Prices are in BRL cents.
   Exposed as window.DanProducts; loaded before script.js. */
(function () {
  'use strict';

  var PRODUCTS = [
    { id: 'whey-protein', name: 'Whey Protein 900g', category: 'Protein', priceCents: 15990,
      description: 'Whey protein concentrate with 24 g of protein per serving.' },
    { id: 'creatine', name: 'Creatine Monohydrate 300g', category: 'Performance', priceCents: 8990,
      description: 'Pure micronized creatine monohydrate, 5 g per serving.' },
    { id: 'multivitamin', name: 'Multivitamin Daily', category: 'Vitamins', priceCents: 5490,
      description: 'Complete daily multivitamin and mineral blend, 60 capsules.' },
    { id: 'vitamin-d3', name: 'Vitamin D3 2000 IU', category: 'Vitamins', priceCents: 3990,
      description: 'Vitamin D3 softgels for bone and immune support, 120 units.' },
    { id: 'vitamin-c', name: 'Vitamin C 1000mg', category: 'Vitamins', priceCents: 2990,
      description: 'High-strength vitamin C tablets, 90 units.' },
    { id: 'omega-3', name: 'Omega-3 Fish Oil', category: 'Essential fats', priceCents: 6490,
      description: 'Fish oil rich in EPA and DHA, 120 softgels.' },
    { id: 'bcaa', name: 'BCAA 2:1:1 200g', category: 'Amino acids', priceCents: 7490,
      description: 'Branched-chain amino acids in a 2:1:1 ratio.' },
    { id: 'magnesium', name: 'Magnesium Glycinate', category: 'Minerals', priceCents: 4690,
      description: 'Highly absorbable magnesium glycinate, 90 capsules.' }
  ];

  window.DanProducts = {
    all: function () {
      return PRODUCTS.slice();
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
