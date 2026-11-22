import { useState } from 'react'
import { filterProperties } from './data/properties'
import type { FilterOptions } from './data/properties'
import type { PropertyListing, PropertyType } from './types'
import { PropertyCard } from './components/PropertyCard'
import { MortgageSimulator } from './components/MortgageSimulator'
import { ScheduleVisit } from './components/ScheduleVisit'
import { PurchaseOffer } from './components/PurchaseOffer'
import './App.css'

function App() {
  const [filters, setFilters] = useState<FilterOptions>({})
  const properties = filterProperties(filters)

  const [selectedPropertyForSim, setSelectedPropertyForSim] = useState<PropertyListing | null>(null)
  const [selectedPropertyForVisit, setSelectedPropertyForVisit] = useState<PropertyListing | null>(null)
  const [selectedPropertyForOffer, setSelectedPropertyForOffer] = useState<PropertyListing | null>(null)

  return (
    <div className="app-container">
      <header className="header">
        <h1>Dan Home</h1>
        <p>Encontre o imóvel dos seus sonhos</p>
      </header>

      <main className="main-content">
        <section className="filters-section">
          <h2>Filtros</h2>
          <div className="filters">
            <label>
              Tipo:
              <select
                value={filters.type || ''}
                onChange={e => setFilters({ ...filters, type: e.target.value ? (e.target.value as PropertyType) : undefined })}
              >
                <option value="">Todos</option>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="studio">Studio</option>
                <option value="cobertura">Cobertura</option>
              </select>
            </label>

            <label>
              Mín. Quartos:
              <input
                type="number"
                min="0"
                value={filters.minBedrooms ?? ''}
                onChange={e => setFilters({ ...filters, minBedrooms: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>

            <label>
              Máx. Preço (R$):
              <input
                type="number"
                min="0"
                step="10000"
                value={filters.maxPriceBrl ?? ''}
                onChange={e => setFilters({ ...filters, maxPriceBrl: e.target.value ? Number(e.target.value) : undefined })}
              />
            </label>
          </div>
        </section>

        <section className="properties-grid">
          {properties.length === 0 ? (
            <p>Nenhum imóvel encontrado.</p>
          ) : (
            properties.map(p => (
              <PropertyCard
                key={p.id}
                property={p}
                onSimulate={() => setSelectedPropertyForSim(p)}
                onVisit={() => setSelectedPropertyForVisit(p)}
                onOffer={() => setSelectedPropertyForOffer(p)}
              />
            ))
          )}
        </section>
      </main>

      {selectedPropertyForSim && (
        <MortgageSimulator
          property={selectedPropertyForSim}
          onClose={() => setSelectedPropertyForSim(null)}
        />
      )}

      {selectedPropertyForVisit && (
        <ScheduleVisit
          property={selectedPropertyForVisit}
          onClose={() => setSelectedPropertyForVisit(null)}
        />
      )}

      {selectedPropertyForOffer && (
        <PurchaseOffer
          property={selectedPropertyForOffer}
          onClose={() => setSelectedPropertyForOffer(null)}
        />
      )}
    </div>
  )
}

export default App
