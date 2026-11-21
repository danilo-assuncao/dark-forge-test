import React, { useState } from 'react';
import { mockFurniture, categories } from './data/furniture';
import { ShoppingCart, Search, Menu } from 'lucide-react';

function App() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredFurniture = mockFurniture.filter((item) => {
    const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Menu className="h-6 w-6 text-gray-500 sm:hidden" />
            <h1 className="text-2xl font-bold text-amber-700">MobiDecor</h1>
          </div>
          
          <div className="hidden sm:flex flex-1 max-w-md mx-8 relative">
            <input
              type="text"
              placeholder="Buscar móveis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-full relative">
              <ShoppingCart className="h-6 w-6 text-gray-600" />
              <span className="absolute top-0 right-0 bg-amber-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center transform translate-x-1 -translate-y-1">
                0
              </span>
            </button>
          </div>
        </div>
        {/* Mobile Search */}
        <div className="sm:hidden px-4 pb-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar móveis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Categories */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setSelectedCategory('Todos')}
              className={`px-4 py-2 rounded-full font-medium transition-colors ${
                selectedCategory === 'Todos'
                  ? 'bg-amber-700 text-white'
                  : 'bg-white text-gray-600 hover:bg-amber-50 border border-gray-200'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-700 text-white'
                    : 'bg-white text-gray-600 hover:bg-amber-50 border border-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFurniture.length > 0 ? (
            filteredFurniture.map((item) => (
              <div key={item.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow group flex flex-col">
                <div className="relative h-64 overflow-hidden bg-gray-200">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {!item.inStock && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">
                      Esgotado
                    </div>
                  )}
                  <div className="absolute top-2 left-2 bg-white/90 text-amber-800 text-xs font-bold px-2 py-1 rounded shadow-sm backdrop-blur-sm">
                    {item.category}
                  </div>
                </div>
                <div className="p-4 flex flex-col flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-1">{item.name}</h3>
                  <p className="text-gray-500 text-sm mb-4 line-clamp-2">{item.description}</p>
                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-xl font-bold text-gray-900">
                      R$ {item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <button
                      disabled={!item.inStock}
                      className={`p-2 rounded-full transition-colors ${
                        item.inStock 
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-600 hover:text-white'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                      aria-label="Adicionar ao carrinho"
                    >
                      <ShoppingCart className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-12 text-center">
              <p className="text-gray-500 text-lg">Nenhum móvel encontrado para a sua busca.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
