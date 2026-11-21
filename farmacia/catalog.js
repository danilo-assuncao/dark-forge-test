const products = [
  {
    id: "p1",
    name: "Dorflex 30cp",
    activeIngredient: "Dipirona, Mucato de isometepteno, Cafeína",
    stripe: "isento",
    priceBrl: 22.50,
    requiresPrescription: false
  },
  {
    id: "p2",
    name: "Dipirona 30cp Genérico",
    activeIngredient: "Dipirona, Mucato de isometepteno, Cafeína",
    stripe: "generico",
    priceBrl: 15.00,
    requiresPrescription: false
  },
  {
    id: "p3",
    name: "Tylenol 750mg 20cp",
    activeIngredient: "Paracetamol",
    stripe: "isento",
    priceBrl: 28.00,
    requiresPrescription: false
  },
  {
    id: "p4",
    name: "Paracetamol 750mg 20cp Genérico",
    activeIngredient: "Paracetamol",
    stripe: "generico",
    priceBrl: 12.00,
    requiresPrescription: false
  },
  {
    id: "p5",
    name: "Roacutan 20mg 30cp",
    activeIngredient: "Isotretinoína",
    stripe: "vermelha",
    priceBrl: 250.00,
    requiresPrescription: true
  },
  {
    id: "p6",
    name: "Isotretinoína 20mg 30cp Gen",
    activeIngredient: "Isotretinoína",
    stripe: "generico",
    priceBrl: 150.00,
    requiresPrescription: false
  },
  {
    id: "p7",
    name: "Amoxil 500mg 21cp",
    activeIngredient: "Amoxicilina",
    stripe: "vermelha",
    priceBrl: 65.00,
    requiresPrescription: true
  },
  {
    id: "p8",
    name: "Amoxicilina 500mg 21cp Gen",
    activeIngredient: "Amoxicilina",
    stripe: "generico",
    priceBrl: 30.00,
    requiresPrescription: false
  }
];

function searchCatalog({ query, stripe } = {}) {
  let result = products;
  
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.activeIngredient.toLowerCase().includes(q)
    );
  }
  
  if (stripe) {
    result = result.filter(p => p.stripe === stripe);
  }
  
  return result;
}

function getProductById(id) {
  return products.find(p => p.id === id) || null;
}

function findGenericAlternatives(productId) {
  const product = getProductById(productId);
  if (!product) return [];
  
  return products
    .filter(p => p.activeIngredient === product.activeIngredient && p.id !== product.id && p.priceBrl < product.priceBrl)
    .sort((a, b) => a.priceBrl - b.priceBrl);
}

module.exports = {
  products,
  searchCatalog,
  getProductById,
  findGenericAlternatives
};
