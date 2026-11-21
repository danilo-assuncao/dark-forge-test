const catalogData = [
  {
    id: "p1",
    name: "Dorflex 30cp",
    activeIngredient: "Cafeína, Dipirona, Mucato de isometepteno",
    stripe: "isento",
    isGeneric: false,
    priceBrl: 22.50,
    requiresPrescription: false
  },
  {
    id: "p2",
    name: "Dipirona + Isometepteno + Cafeína 30cp Genérico",
    activeIngredient: "Cafeína, Dipirona, Mucato de isometepteno",
    stripe: "generico",
    isGeneric: true,
    priceBrl: 15.00,
    requiresPrescription: false
  },
  {
    id: "p2b",
    name: "Dipirona + Isometepteno + Cafeína 30cp Genérico B",
    activeIngredient: "Mucato de isometepteno, Cafeína, Dipirona", 
    stripe: "generico",
    isGeneric: true,
    priceBrl: 18.00,
    requiresPrescription: false
  },
  {
    id: "p3",
    name: "Tylenol 750mg 20cp",
    activeIngredient: "Paracetamol",
    stripe: "isento",
    isGeneric: false,
    priceBrl: 28.00,
    requiresPrescription: false
  },
  {
    id: "p4",
    name: "Paracetamol 750mg 20cp Genérico",
    activeIngredient: "Paracetamol",
    stripe: "generico",
    isGeneric: true,
    priceBrl: 12.00,
    requiresPrescription: false
  },
  {
    id: "p5",
    name: "Roacutan 20mg 30cp",
    activeIngredient: "Isotretinoína",
    stripe: "vermelha",
    isGeneric: false,
    priceBrl: 250.00,
    requiresPrescription: true
  },
  {
    id: "p6",
    name: "Isotretinoína 20mg 30cp Gen",
    activeIngredient: "Isotretinoína",
    stripe: "vermelha",
    isGeneric: true,
    priceBrl: 150.00,
    requiresPrescription: true
  },
  {
    id: "p7",
    name: "Amoxil 500mg 21cp",
    activeIngredient: "Amoxicilina",
    stripe: "vermelha",
    isGeneric: false,
    priceBrl: 65.00,
    requiresPrescription: true
  },
  {
    id: "p8",
    name: "Amoxicilina 500mg 21cp Gen",
    activeIngredient: "Amoxicilina",
    stripe: "vermelha",
    isGeneric: true,
    priceBrl: 30.00,
    requiresPrescription: true
  },
  {
    id: "p9",
    name: "Amoxicilina 500mg 21cp Gen B",
    activeIngredient: "Amoxicilina",
    stripe: "vermelha",
    isGeneric: true,
    priceBrl: 35.00,
    requiresPrescription: true
  },
  {
    id: "p10",
    name: "Mixed Rx Generic",
    activeIngredient: "Isotretinoína, Paracetamol",
    stripe: "vermelha",
    isGeneric: true,
    priceBrl: 5.00, // Cheap, but requires prescription
    requiresPrescription: true
  },
  {
    id: "p11",
    name: "Mixed OTC Product",
    activeIngredient: "Isotretinoína, Paracetamol",
    stripe: "isento",
    isGeneric: false,
    priceBrl: 50.00,
    requiresPrescription: false
  },
  {
    id: "p12",
    name: "Equal Price Generic 1",
    activeIngredient: "Amoxicilina",
    stripe: "vermelha",
    isGeneric: true,
    priceBrl: 35.00,
    requiresPrescription: true
  },
  {
    id: "p13",
    name: "No Generic OTC",
    activeIngredient: "Unique OTC Ingredient",
    stripe: "isento",
    isGeneric: false,
    priceBrl: 10.00,
    requiresPrescription: false
  },
  {
    id: "p14",
    name: "No Generic Rx",
    activeIngredient: "Unique Rx Ingredient",
    stripe: "vermelha",
    isGeneric: false,
    priceBrl: 100.00,
    requiresPrescription: true
  }
];

const VALID_STRIPES = ['isento', 'vermelha', 'generico'];

function deepFreeze(obj) {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((prop) => {
    if (obj.hasOwnProperty(prop) && obj[prop] !== null && typeof obj[prop] === 'object' && !Object.isFrozen(obj[prop])) {
      deepFreeze(obj[prop]);
    }
  });
  return obj;
}

const products = deepFreeze(catalogData.map(p => ({...p})));

function removeAccents(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function searchCatalog(opts = {}) {
  if (!opts) opts = {};
  const { query, stripe } = opts;
  let result = products;
  
  if (query !== undefined && query !== null) {
    if (typeof query !== 'string') {
      return [];
    }
    const q = removeAccents(query.toLowerCase()).trim();
    if (q.length > 0) {
      result = result.filter(p => 
        removeAccents(p.name.toLowerCase()).includes(q) || 
        removeAccents(p.activeIngredient.toLowerCase()).includes(q)
      );
    }
  }
  
  if (stripe !== undefined && stripe !== null) {
    if (!VALID_STRIPES.includes(stripe)) {
      return [];
    }
    result = result.filter(p => p.stripe === stripe);
  }
  
  return result.map(p => ({...p}));
}

function getProductById(id) {
  if (typeof id !== 'string') return null;
  const p = products.find(p => p.id === id);
  return p ? { ...p } : null;
}

function normalizeIngredients(ingredientString) {
  return removeAccents(ingredientString.toLowerCase())
    .split(',')
    .map(s => s.trim())
    .sort()
    .join(', ');
}

function findGenericAlternatives(productId) {
  const product = getProductById(productId);
  if (!product) return [];
  
  const productIngredients = normalizeIngredients(product.activeIngredient);

  return products
    .filter(p => p.isGeneric)
    .filter(p => p.id !== product.id)
    .filter(p => normalizeIngredients(p.activeIngredient) === productIngredients)
    .filter(p => p.priceBrl < product.priceBrl)
    .filter(p => p.requiresPrescription === product.requiresPrescription) // Must match prescription status exactly
    .sort((a, b) => a.priceBrl - b.priceBrl)
    .map(p => ({...p}));
}

module.exports = {
  products,
  searchCatalog,
  getProductById,
  findGenericAlternatives
};
