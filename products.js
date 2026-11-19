/* Mock catalog data for Dan Wear: apparel and accessories with sizes and body
   measurements. Prices are in BRL cents. Exposed as window.DanProducts;
   loaded before cart.js and script.js. */
(function () {
  'use strict';

  var LETTER_SIZES = ['PP', 'P', 'M', 'G', 'GG'];
  var ONE_SIZE = ['Tamanho único'];

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

  function top(id, name, priceCents, description, material, fit) {
    return { id: id, name: name, category: 'Tops', priceCents: priceCents, description: description,
      specs: [{ label: 'Material', value: material }, { label: 'Fit', value: fit }, { label: 'Care', value: 'Machine wash cold' }],
      sizes: LETTER_SIZES.slice(), measurements: TOP_TABLE };
  }
  function bottom(id, name, priceCents, description, material, fit) {
    return { id: id, name: name, category: 'Bottoms', priceCents: priceCents, description: description,
      specs: [{ label: 'Material', value: material }, { label: 'Fit', value: fit }, { label: 'Care', value: 'Machine wash cold' }],
      sizes: LETTER_SIZES.slice(), measurements: BOTTOM_TABLE };
  }
  function outer(id, name, priceCents, description, material, fit) {
    return { id: id, name: name, category: 'Outerwear', priceCents: priceCents, description: description,
      specs: [{ label: 'Material', value: material }, { label: 'Fit', value: fit }, { label: 'Care', value: 'Wash separately, low spin' }],
      sizes: LETTER_SIZES.slice(), measurements: TOP_TABLE };
  }
  function accessory(id, name, priceCents, description, material, extra) {
    return { id: id, name: name, category: 'Accessories', priceCents: priceCents, description: description,
      specs: [{ label: 'Material', value: material }, { label: 'Details', value: extra }],
      sizes: ONE_SIZE.slice() };
  }

  var PRODUCTS = [
    top('basic-tee', 'DAN Basic Tee', 7990, 'Everyday crew-neck tee in soft combed cotton.', '100% combed cotton', 'Regular'),
    top('oversized-tee', 'Oversized Graphic Tee', 8990, 'Boxy oversized tee with the DAN logo printed on the back.', '100% cotton, 180 g/m²', 'Oversized'),
    top('polo-classic', 'Classic Piqué Polo', 12990, 'Piqué polo with a two-button placket and ribbed collar.', 'Cotton piqué', 'Regular'),
    top('linen-shirt', 'Linen Short-sleeve Shirt', 17990, 'Light linen blend shirt for warm days.', 'Linen and cotton blend', 'Relaxed'),
    top('long-sleeve', 'Long-sleeve Tee', 9990, 'Mid-weight long-sleeve tee, easy to layer.', 'Cotton jersey', 'Regular'),
    bottom('chino-slim', 'Slim Chino Pants', 18990, 'Stretch cotton chinos with a slim, tapered leg.', 'Cotton twill with elastane', 'Slim'),
    bottom('jeans-straight', 'Straight Jeans', 22990, 'Mid-rise straight jeans in medium indigo denim.', 'Denim, 12 oz', 'Straight'),
    bottom('jogger', 'Everyday Jogger', 14990, 'Brushed fleece joggers with drawstring waist and zip pockets.', 'Cotton fleece', 'Tapered'),
    bottom('bermuda', 'Cotton Bermuda Shorts', 10990, 'Knee-length bermuda shorts in lightweight twill.', 'Cotton twill', 'Regular'),
    bottom('sport-shorts', 'Training Shorts', 8990, 'Quick-dry training shorts with an inner liner.', 'Recycled polyester', 'Regular'),
    outer('hoodie', 'DAN Hoodie', 21990, 'Heavyweight hoodie with kangaroo pocket and embroidered logo.', 'Cotton fleece, 320 g/m²', 'Relaxed'),
    outer('windbreaker', 'Light Windbreaker', 24990, 'Water-repellent windbreaker that packs into its own pocket.', 'Recycled nylon', 'Regular'),
    outer('denim-jacket', 'Denim Jacket', 29990, 'Classic trucker jacket in rigid denim.', 'Denim, 12 oz', 'Regular'),
    accessory('cap', 'Dad Cap', 5990, 'Curved-brim cap with embroidered DAN wordmark and adjustable strap.', 'Cotton twill', 'Adjustable strap'),
    accessory('tote-bag', 'Canvas Tote Bag', 4990, 'Sturdy canvas tote with an inner pocket.', 'Heavy canvas', '38 x 40 cm, 10 L'),
    accessory('socks-3', 'Crew Socks 3-pack', 4490, 'Three pairs of cushioned crew socks.', 'Cotton blend', 'Fits sizes 39 to 44')
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
