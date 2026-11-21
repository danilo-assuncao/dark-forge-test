import type { Drink } from '../types'

interface DrinkCardProps {
  drink: Drink
}

export function DrinkCard({ drink }: DrinkCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      <img
        src={drink.imageUrl}
        alt={drink.name}
        className="w-full h-48 object-cover"
      />
      <div className="p-5">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-lg font-bold text-gray-900">{drink.name}</h3>
          <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">
            {drink.category}
          </span>
        </div>
        <p className="text-gray-600 text-sm mb-4 min-h-[40px]">
          {drink.description}
        </p>
        <div className="flex justify-between items-center">
          <span className="text-xl font-bold text-gray-900">
            R$ {drink.price.toFixed(2).replace('.', ',')}
          </span>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
