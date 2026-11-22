import React from 'react'
import type { PropertyListing } from '../types'

interface Props {
  property: PropertyListing
  onSimulate: () => void
  onVisit: () => void
  onOffer: () => void
}

const formatPrice = (value: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export const PropertyCard: React.FC<Props> = ({ property, onSimulate, onVisit, onOffer }) => {
  return (
    <div className="property-card">
      <h3>{property.title}</h3>
      <div className="property-details">
        <p><strong>Tipo:</strong> {property.type}</p>
        <p><strong>Quartos:</strong> {property.bedrooms}</p>
        <p><strong>Área:</strong> {property.areaSqMeters} m²</p>
        <p className="price"><strong>Preço:</strong> {formatPrice(property.priceBrl)}</p>
      </div>
      <div className="property-actions">
        <button onClick={onSimulate}>Simular Financiamento</button>
        <button onClick={onVisit}>Agendar Visita</button>
        <button onClick={onOffer}>Fazer Proposta</button>
      </div>
    </div>
  )
}
