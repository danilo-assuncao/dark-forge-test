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

function searchCatalog({ query, stripe } = {}) {
  let result = products;
  
  if (query !== undefined) {
    if (typeof query !== 'string') {
      return [];
    }
    const q = query.toLowerCase().trim();
    if (q.length > 0) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.activeIngredient.toLowerCase().includes(q)
      );
    }
  }
  
  if (stripe !== undefined) {
    if (!VALID_STRIPES.includes(stripe)) {
      return [];
    }
    result = result.filter(p => p.stripe === stripe);
  }
  
  return result.map(p => ({...p}));
}

function getProductById(id) {
  const p = products.find(p => p.id === id);
  return p ? { ...p } : null;
}

function normalizeIngredients(ingredientString) {
  return ingredientString.split(',').map(s => s.trim().toLowerCase()).sort().join(', ');
}

function findGenericAlternatives(productId) {
  const product = getProductById(productId);
  if (!product) return [];
  
  const productIngredients = normalizeIngredients(product.activeIngredient);

  return products
    .filter(p => p.isGeneric)
    .filter(p => normalizeIngredients(p.activeIngredient) === productIngredients)
    .filter(p => p.id !== product.id)
    .filter(p => p.priceBrl < product.priceBrl)
    .filter(p => p.requiresPrescription === product.requiresPrescription || p.requiresPrescription)
    .sort((a, b) => a.priceBrl - b.priceBrl)
    .map(p => ({...p}));
}

module.exports = {
  products,
  searchCatalog,
  getProductById,
  findGenericAlternatives
};
