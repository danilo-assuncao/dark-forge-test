import type { Diet, Food } from '../types';

interface Props {
  diets: Diet[];
  foods: Food[];
}

export const DietCatalog: React.FC<Props> = ({ diets, foods }) => {
  const foodsMap = new Map(foods.map(f => [f.id, f]));

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Planos Alimentares (Dietas)</h2>
      
      {diets.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          Nenhuma dieta encontrada.
        </div>
      ) : (
        <div className="space-y-6">
          {diets.map(diet => {
            const dietFoods = diet.recommendedFoods.map(id => foodsMap.get(id)).filter((f): f is Food => Boolean(f));
            
            return (
              <div key={diet.id} className="border border-green-200 bg-green-50 rounded-lg p-5 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-xl text-green-900">{diet.name}</h3>
                  <span className="inline-block bg-green-200 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">
                    {diet.goal}
                  </span>
                </div>
                <p className="text-gray-700 mb-4">{diet.description}</p>
                
                <h4 className="font-semibold text-sm text-gray-800 mb-2 uppercase tracking-wide">Alimentos Recomendados:</h4>
                {dietFoods.length === 0 ? (
                  <div className="text-sm text-gray-500 italic">Nenhum alimento resolvido para esta dieta.</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {dietFoods.map(food => (
                      <span key={food.id} className="bg-white border border-green-300 text-green-800 text-sm px-3 py-1 rounded shadow-sm">
                        {food.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
