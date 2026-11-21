import { useState, useMemo } from 'react'
import { DrinkCard } from './DrinkCard'
import { mockDrinks } from '../data'

const categories = ['Todos', 'Cerveja', 'Vinho', 'Destilado', 'Sem Álcool']

export function Catalog({ onAddToCart }: { onAddToCart?: () => void }) {
  const [selectedCategory, setSelectedCategory] = useState('Todos')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredDrinks = useMemo(() => {
    const normalizeString = (str: string) =>
      str
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()

    return mockDrinks.filter((drink) => {
      const matchCategory =
        selectedCategory === 'Todos' || drink.category === selectedCategory
      const matchSearch = normalizeString(drink.name).includes(
        normalizeString(searchQuery),
      )
      return matchCategory && matchSearch
    })
  }, [selectedCategory, searchQuery])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 mb-6">
          Catálogo de Bebidas
        </h2>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar bebidas..."
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {filteredDrinks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredDrinks.map((drink) => (
            <DrinkCard key={drink.id} drink={drink} onAddToCart={onAddToCart} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            Nenhuma bebida encontrada com os filtros atuais.
          </p>
        </div>
      )}
    </div>
  )
}
