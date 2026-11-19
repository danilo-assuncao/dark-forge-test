/* Mock catalog data for Dan Wear: apparel with sizes and body
   measurements. Prices are in BRL cents. Exposed as window.DanProducts;
   loaded before cart.js and script.js. */
(function () {
  'use strict';

  var LETTER_SIZES = ['PP', 'P', 'M', 'G', 'GG'];

  // Measurement tables in cm, one row per size: [chest, waist, length] or [waist, hip, inseam].
  var TOP_TABLE = {
    unit: 'cm',
    columns: ['Chest', 'Waist', 'Length'],
    rows: [
      { size: 'PP', values: ['88', '74', '66'] },
      { size: 'P', values: ['94', '80', '68'] },
      { size: 'M', values: ['100', '86', '70'] },
      { size: 'G', values: ['106', '92', '72'] },
      { size: 'GG', values: ['112', '98', '74'] }
    ]
  };
  var BOTTOM_TABLE = {
    unit: 'cm',
    columns: ['Waist', 'Hip', 'Inseam'],
    rows: [
      { size: 'PP', values: ['72', '92', '76'] },
      { size: 'P', values: ['78', '98', '77'] },
      { size: 'M', values: ['84', '104', '78'] },
      { size: 'G', values: ['90', '110', '79'] },
      { size: 'GG', values: ['96', '116', '80'] }
    ]
  };

  function piece(id, name, category, priceCents, color, fabric, fit, description, care, table) {
    return { id: id, name: name, category: category, priceCents: priceCents, description: description,
      color: color, fabric: fabric,
      specs: [{ label: 'Cor', value: color }, { label: 'Tecido', value: fabric }, { label: 'Modelagem', value: fit }, { label: 'Cuidados', value: care }],
      sizes: LETTER_SIZES.slice(), measurements: table };
  }
  function top(id, name, priceCents, color, fabric, fit, description) {
    return piece(id, name, 'Camisetas', priceCents, color, fabric, fit, description, 'Lavar à máquina em água fria', TOP_TABLE);
  }
  function bottom(id, name, priceCents, color, fabric, fit, description) {
    return piece(id, name, 'Calças', priceCents, color, fabric, fit, description, 'Lavar à máquina em água fria', BOTTOM_TABLE);
  }
  function outer(id, name, priceCents, color, fabric, fit, description) {
    return piece(id, name, 'Casacos', priceCents, color, fabric, fit, description, 'Lavar separadamente, centrifugação leve', TOP_TABLE);
  }

  var PRODUCTS = [
    top('basic-tee', 'DAN Basic Tee', 7990, 'Branco', 'Algodão penteado 100%', 'Regular', 'Everyday crew-neck tee in soft combed cotton.'),
    top('oversized-tee', 'Oversized Graphic Tee', 8990, 'Preto', 'Algodão 100%, 180 g/m²', 'Oversized', 'Boxy oversized tee with the DAN logo printed on the back.'),
    top('polo-classic', 'Classic Piqué Polo', 12990, 'Azul-marinho', 'Algodão piqué', 'Regular', 'Piqué polo with a two-button placket and ribbed collar.'),
    top('linen-shirt', 'Linen Short-sleeve Shirt', 17990, 'Areia', 'Mistura de linho e algodão', 'Relaxada', 'Light linen blend shirt for warm days.'),
    top('long-sleeve', 'Long-sleeve Tee', 9990, 'Cinza mescla', 'Malha de algodão', 'Regular', 'Mid-weight long-sleeve tee, easy to layer.'),
    bottom('chino-slim', 'Slim Chino Pants', 18990, 'Caqui', 'Sarja de algodão com elastano', 'Slim', 'Stretch cotton chinos with a slim, tapered leg.'),
    bottom('jeans-straight', 'Straight Jeans', 22990, 'Índigo médio', 'Denim 12 oz', 'Reta', 'Mid-rise straight jeans in medium indigo denim.'),
    bottom('jogger', 'Everyday Jogger', 14990, 'Grafite', 'Moletom de algodão', 'Afunilada', 'Brushed fleece joggers with drawstring waist and zip pockets.'),
    bottom('bermuda', 'Cotton Bermuda Shorts', 10990, 'Oliva', 'Sarja de algodão', 'Regular', 'Knee-length bermuda shorts in lightweight twill.'),
    bottom('sport-shorts', 'Training Shorts', 8990, 'Preto', 'Poliéster reciclado', 'Regular', 'Quick-dry training shorts with an inner liner.'),
    outer('hoodie', 'DAN Hoodie', 21990, 'Cinza chumbo', 'Moletom de algodão, 320 g/m²', 'Relaxada', 'Heavyweight hoodie with kangaroo pocket and embroidered logo.'),
    outer('windbreaker', 'Light Windbreaker', 24990, 'Verde-militar', 'Nylon reciclado', 'Regular', 'Water-repellent windbreaker that packs into its own pocket.'),
    outer('denim-jacket', 'Denim Jacket', 29990, 'Índigo escuro', 'Denim rígido 12 oz', 'Regular', 'Classic trucker jacket in rigid denim.')
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
