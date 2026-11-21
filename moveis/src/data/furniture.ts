export interface Furniture {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  imageUrl: string;
  inStock: boolean;
}

export const mockFurniture: Furniture[] = [
  {
    id: '1',
    name: 'Poltrona Elegance',
    category: 'Salas',
    price: 1250.00,
    description: 'Poltrona com design moderno, estofamento em linho e pés de madeira maciça.',
    imageUrl: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?auto=format&fit=crop&q=80&w=800',
    inStock: true,
  },
  {
    id: '2',
    name: 'Mesa de Jantar Ágata',
    category: 'Cozinhas',
    price: 3400.00,
    description: 'Mesa de jantar para 6 lugares com tampo de vidro temperado e base em aço carbono.',
    imageUrl: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&q=80&w=800',
    inStock: true,
  },
  {
    id: '3',
    name: 'Sofá Retrátil 3 Lugares',
    category: 'Salas',
    price: 2890.00,
    description: 'Sofá retrátil e reclinável, ultra confortável com molas ensacadas.',
    imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&q=80&w=800',
    inStock: false,
  },
  {
    id: '4',
    name: 'Cama Queen Size Imperial',
    category: 'Quartos',
    price: 1850.00,
    description: 'Cama queen size com cabeceira estofada em veludo azul marinho.',
    imageUrl: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&q=80&w=800',
    inStock: true,
  },
  {
    id: '5',
    name: 'Guarda-roupa 6 Portas',
    category: 'Quartos',
    price: 2100.00,
    description: 'Guarda-roupa espaçoso com espelhos centrais e excelente divisão interna.',
    imageUrl: 'https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&q=80&w=800',
    inStock: true,
  },
  {
    id: '6',
    name: 'Estante de Livros Minimalista',
    category: 'Escritórios',
    price: 680.00,
    description: 'Estante em MDP com acabamento madeirado, perfeita para home office.',
    imageUrl: 'https://images.unsplash.com/photo-1594620113688-ea8c5e62bc16?auto=format&fit=crop&q=80&w=800',
    inStock: true,
  }
];

export const categories = Array.from(new Set(mockFurniture.map(f => f.category)));
