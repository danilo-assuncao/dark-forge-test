/* Mock catalog data: fitness supplements, accessories and equipment (only supplements carry nutrition facts). Prices are in BRL cents.
   Exposed as window.DanProducts; loaded before script.js. */
(function () {
  'use strict';

  var PRODUCTS = [
    { id: 'whey-protein', name: 'Whey Protein 900g', category: 'Supplements', priceCents: 15990,
      description: 'Whey protein concentrate with 24 g of protein per serving.',
      nutrition: { serving: '30 g (1 scoop)', rows: [
        { label: 'Energy', amount: '120 kcal' },
        { label: 'Protein', amount: '24 g' },
        { label: 'Carbohydrates', amount: '3 g' },
        { label: 'Total fat', amount: '1.5 g' },
        { label: 'Sodium', amount: '50 mg' }
      ] } },
    { id: 'creatine', name: 'Creatine Monohydrate 300g', category: 'Supplements', priceCents: 8990,
      description: 'Pure micronized creatine monohydrate, 5 g per serving.',
      nutrition: { serving: '5 g (1 scoop)', rows: [
        { label: 'Energy', amount: '0 kcal' },
        { label: 'Creatine monohydrate', amount: '5 g' },
        { label: 'Carbohydrates', amount: '0 g' },
        { label: 'Protein', amount: '0 g' },
        { label: 'Total fat', amount: '0 g' }
      ] } },
    { id: 'multivitamin', name: 'Multivitamin Daily', category: 'Supplements', priceCents: 5490,
      description: 'Complete daily multivitamin and mineral blend, 60 capsules.',
      nutrition: { serving: '2 capsules', rows: [
        { label: 'Vitamin A', amount: '800 mcg' },
        { label: 'Vitamin C', amount: '90 mg' },
        { label: 'Vitamin D', amount: '10 mcg' },
        { label: 'Zinc', amount: '11 mg' },
        { label: 'Iron', amount: '14 mg' }
      ] } },
    { id: 'vitamin-d3', name: 'Vitamin D3 2000 IU', category: 'Supplements', priceCents: 3990,
      description: 'Vitamin D3 softgels for bone and immune support, 120 units.',
      nutrition: { serving: '1 softgel', rows: [
        { label: 'Vitamin D3', amount: '50 mcg (2000 IU)' },
        { label: 'Energy', amount: '5 kcal' },
        { label: 'Total fat', amount: '0.5 g' },
        { label: 'Carbohydrates', amount: '0 g' },
        { label: 'Protein', amount: '0 g' }
      ] } },
    { id: 'vitamin-c', name: 'Vitamin C 1000mg', category: 'Supplements', priceCents: 2990,
      description: 'High-strength vitamin C tablets, 90 units.',
      nutrition: { serving: '1 tablet', rows: [
        { label: 'Vitamin C', amount: '1000 mg' },
        { label: 'Energy', amount: '0 kcal' },
        { label: 'Carbohydrates', amount: '0 g' },
        { label: 'Protein', amount: '0 g' },
        { label: 'Total fat', amount: '0 g' }
      ] } },
    { id: 'omega-3', name: 'Omega-3 Fish Oil', category: 'Supplements', priceCents: 6490,
      description: 'Fish oil rich in EPA and DHA, 120 softgels.',
      nutrition: { serving: '2 softgels', rows: [
        { label: 'Energy', amount: '20 kcal' },
        { label: 'Total fat', amount: '2 g' },
        { label: 'EPA', amount: '360 mg' },
        { label: 'DHA', amount: '240 mg' },
        { label: 'Protein', amount: '0 g' }
      ] } },
    { id: 'bcaa', name: 'BCAA 2:1:1 200g', category: 'Supplements', priceCents: 7490,
      description: 'Branched-chain amino acids in a 2:1:1 ratio.',
      nutrition: { serving: '10 g (1 scoop)', rows: [
        { label: 'Energy', amount: '35 kcal' },
        { label: 'Leucine', amount: '2.5 g' },
        { label: 'Isoleucine', amount: '1.25 g' },
        { label: 'Valine', amount: '1.25 g' },
        { label: 'Carbohydrates', amount: '0 g' }
      ] } },
    { id: 'magnesium', name: 'Magnesium Glycinate', category: 'Supplements', priceCents: 4690,
      description: 'Highly absorbable magnesium glycinate, 90 capsules.',
      nutrition: { serving: '3 capsules', rows: [
        { label: 'Magnesium', amount: '420 mg' },
        { label: 'Energy', amount: '0 kcal' },
        { label: 'Carbohydrates', amount: '0 g' },
        { label: 'Protein', amount: '0 g' },
        { label: 'Total fat', amount: '0 g' }
      ] } },
    { id: 'resistance-bands', name: 'Resistance Bands Set', category: 'Accessories', priceCents: 6990,
      description: 'Set of 5 latex bands with different tension levels and a carry bag.' },
    { id: 'lifting-straps', name: 'Lifting Straps', category: 'Accessories', priceCents: 3490,
      description: 'Padded cotton wrist straps for heavy pulls and deadlifts.' },
    { id: 'shaker-bottle', name: 'Shaker Bottle 700ml', category: 'Accessories', priceCents: 2490,
      description: 'Leak-proof shaker with mixing ball and measuring scale.' },
    { id: 'gym-gloves', name: 'Training Gloves', category: 'Accessories', priceCents: 4490,
      description: 'Breathable gloves with palm padding and wrist support.' },
    { id: 'adjustable-dumbbells', name: 'Adjustable Dumbbells 20kg', category: 'Equipment', priceCents: 39990,
      description: 'Pair of adjustable dumbbells, from 2 kg to 20 kg per hand.' },
    { id: 'yoga-mat', name: 'Non-slip Yoga Mat', category: 'Equipment', priceCents: 8990,
      description: 'Extra-thick 8 mm mat with non-slip surface for floor workouts.' },
    { id: 'jump-rope', name: 'Speed Jump Rope', category: 'Equipment', priceCents: 3990,
      description: 'Adjustable steel-cable rope with ball bearings for fast skipping.' },
    { id: 'pull-up-bar', name: 'Doorway Pull-up Bar', category: 'Equipment', priceCents: 12990,
      description: 'Removable doorway bar supporting up to 150 kg, no screws needed.' }
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
