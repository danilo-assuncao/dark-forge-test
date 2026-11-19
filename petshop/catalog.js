/* Dan Pets catalog: products and services grouped by category, sizes (portes)
   and the weight/dosage table. Prices are in BRL cents. Exposed as
   window.DanPetsCatalog in the browser and via module.exports in Node. */
(function (root) {
  'use strict';

  var CATEGORIES = [
    { id: 'caes', name: 'Caes' },
    { id: 'gatos', name: 'Gatos' },
    { id: 'banho-tosa', name: 'Banho & Tosa' },
    { id: 'farmacia', name: 'Farmacia Pet' },
  ];

  var SIZES = [
    { id: 'mini', name: 'Mini', weightRange: 'ate 10 kg', minKg: 0, maxKg: 10 },
    { id: 'medio', name: 'Medio', weightRange: '10 a 25 kg', minKg: 10, maxKg: 25 },
    { id: 'grande', name: 'Grande', weightRange: 'acima de 25 kg', minKg: 25, maxKg: Infinity },
  ];

  var ITEMS = [
    { id: 'racao-caes-adultos', category: 'caes', name: 'Racao Premium Caes Adultos', price: 18990, sizes: ['mini', 'medio', 'grande'] },
    { id: 'osso-natural', category: 'caes', name: 'Osso Natural Mastigavel', price: 2490, sizes: ['mini', 'medio', 'grande'] },
    { id: 'coleira-ajustavel', category: 'caes', name: 'Coleira Ajustavel', price: 3990, sizes: ['mini', 'medio', 'grande'] },
    { id: 'racao-gatos-castrados', category: 'gatos', name: 'Racao Gatos Castrados', price: 15990, sizes: ['mini'] },
    { id: 'areia-sanitaria', category: 'gatos', name: 'Areia Sanitaria Higienica', price: 3490, sizes: ['mini'] },
    { id: 'arranhador', category: 'gatos', name: 'Arranhador com Plataforma', price: 8990, sizes: ['mini'] },
    { id: 'banho-simples', category: 'banho-tosa', name: 'Banho', price: 5000, sizes: ['mini', 'medio', 'grande'], service: true },
    { id: 'tosa-higienica', category: 'banho-tosa', name: 'Tosa Higienica', price: 4000, sizes: ['mini', 'medio', 'grande'], service: true },
    { id: 'banho-e-tosa', category: 'banho-tosa', name: 'Banho e Tosa Completa', price: 9000, sizes: ['mini', 'medio', 'grande'], service: true },
    { id: 'vermifugo', category: 'farmacia', name: 'Vermifugo Oral', price: 4590, sizes: ['mini', 'medio', 'grande'], dosage: true },
    { id: 'antipulgas', category: 'farmacia', name: 'Antipulgas e Carrapatos', price: 8990, sizes: ['mini', 'medio', 'grande'], dosage: true },
    { id: 'suplemento-articular', category: 'farmacia', name: 'Suplemento Articular', price: 6990, sizes: ['medio', 'grande'], dosage: true },
  ];

  // Size price multipliers for services (larger pets cost more to groom).
  var SIZE_PRICE_FACTOR = { mini: 1, medio: 1.4, grande: 1.8 };

  // Weight bands and the dose (tablets per administration) for Farmacia Pet.
  var DOSAGE_TABLE = [
    { size: 'mini', minKg: 0, maxKg: 5, dose: '1/2 comprimido' },
    { size: 'mini', minKg: 5, maxKg: 10, dose: '1 comprimido' },
    { size: 'medio', minKg: 10, maxKg: 17.5, dose: '2 comprimidos' },
    { size: 'medio', minKg: 17.5, maxKg: 25, dose: '3 comprimidos' },
    { size: 'grande', minKg: 25, maxKg: 40, dose: '4 comprimidos' },
    { size: 'grande', minKg: 40, maxKg: Infinity, dose: '5 comprimidos' },
  ];

  function sizeForWeight(kg) {
    if (typeof kg !== 'number' || !(kg > 0)) return null;
    for (var i = 0; i < SIZES.length; i++) {
      if (kg <= SIZES[i].maxKg) return SIZES[i];
    }
    return null;
  }

  function dosageForWeight(kg) {
    if (typeof kg !== 'number' || !(kg > 0)) return null;
    for (var i = 0; i < DOSAGE_TABLE.length; i++) {
      if (kg <= DOSAGE_TABLE[i].maxKg) return DOSAGE_TABLE[i];
    }
    return null;
  }

  function itemsByCategory(categoryId) {
    return ITEMS.filter(function (it) { return it.category === categoryId; });
  }

  function priceFor(item, sizeId) {
    if (item.sizes.indexOf(sizeId) === -1) return null;
    var factor = item.service ? SIZE_PRICE_FACTOR[sizeId] : 1;
    return Math.round(item.price * factor);
  }

  function formatBRL(cents) {
    var v = (cents / 100).toFixed(2).replace('.', ',');
    return 'R$ ' + v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  var api = {
    CATEGORIES: CATEGORIES, SIZES: SIZES, ITEMS: ITEMS, DOSAGE_TABLE: DOSAGE_TABLE,
    sizeForWeight: sizeForWeight, dosageForWeight: dosageForWeight,
    itemsByCategory: itemsByCategory, priceFor: priceFor, formatBRL: formatBRL,
  };
  root.DanPetsCatalog = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
