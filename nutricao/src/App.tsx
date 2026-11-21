import { useState } from 'react';
import { FoodCatalog } from './components/FoodCatalog';
import { DietCatalog } from './components/DietCatalog';
import { foodsData, dietsData } from './data';

function App() {
  const [activeTab, setActiveTab] = useState<'foods' | 'diets'>('foods');

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-green-600 text-white p-4 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-extrabold tracking-tight">NutriSPA</h1>
          <nav className="flex gap-2">
            <button 
              onClick={() => setActiveTab('foods')}
              className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'foods' ? 'bg-green-800 text-white' : 'hover:bg-green-700'}`}
            >
              Alimentos
            </button>
            <button 
              onClick={() => setActiveTab('diets')}
              className={`px-4 py-2 rounded font-medium transition-colors ${activeTab === 'diets' ? 'bg-green-800 text-white' : 'hover:bg-green-700'}`}
            >
              Dietas
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-6 px-4">
        {activeTab === 'foods' ? (
          <FoodCatalog foods={foodsData} />
        ) : (
          <DietCatalog diets={dietsData} foods={foodsData} />
        )}
      </main>
    </div>
  );
}

export default App;
