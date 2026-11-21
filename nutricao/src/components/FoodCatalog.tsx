import { useState } from 'react';
import type { Food } from '../types';

interface Props {
  foods: Food[];
}

export const FoodCatalog: React.FC<Props> = ({ foods }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const categories = Array.from(new Set(foods.map(f => f.category)));

  const filteredFoods = foods.filter(food => {
    const matchesSearch = food.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? food.category === categoryFilter : true;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Catálogo de Alimentos</h2>
      
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Buscar alimento..." 
          className="border border-gray-300 rounded px-3 py-2 flex-grow"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        
        <select 
          className="border border-gray-300 rounded px-3 py-2 bg-white"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">Todas as Categorias</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFoods.map(food => (
          <div key={food.id} className="border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow bg-white">
            <h3 className="font-bold text-lg text-gray-900">{food.name}</h3>
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-3 mt-1">
              {food.category}
            </span>
            <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
              <div className="flex flex-col"><span className="font-semibold text-gray-800">{food.calories}</span> kcal</div>
              <div className="flex flex-col"><span className="font-semibold text-gray-800">{food.protein}g</span> Proteína</div>
              <div className="flex flex-col"><span className="font-semibold text-gray-800">{food.carbs}g</span> Carb.</div>
              <div className="flex flex-col"><span className="font-semibold text-gray-800">{food.fat}g</span> Gordura</div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredFoods.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          Nenhum alimento encontrado.
        </div>
      )}
    </div>
  );
};
