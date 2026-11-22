import type { PropertyListing, PropertyType } from '../types'

const properties: PropertyListing[] = [
  {
    id: '1',
    title: 'Lindo apartamento no centro',
    type: 'apartamento',
    bedrooms: 2,
    priceBrl: 450000,
    areaSqMeters: 65,
  },
  {
    id: '2',
    title: 'Casa com quintal',
    type: 'casa',
    bedrooms: 3,
    priceBrl: 850000,
    areaSqMeters: 120,
  },
  {
    id: '3',
    title: 'Studio moderno',
    type: 'studio',
    bedrooms: 1,
    priceBrl: 320000,
    areaSqMeters: 35,
  },
  {
    id: '4',
    title: 'Cobertura duplex',
    type: 'cobertura',
    bedrooms: 4,
    priceBrl: 2100000,
    areaSqMeters: 180,
  }
]

export const listProperties = (): PropertyListing[] => {
  return [...properties]
}

export interface FilterOptions {
  type?: PropertyType
  minBedrooms?: number
  maxPriceBrl?: number
}

export const filterProperties = (filters: FilterOptions): PropertyListing[] => {
  return properties.filter(p => {
    if (filters.type && p.type !== filters.type) return false
    if (filters.minBedrooms !== undefined && p.bedrooms < filters.minBedrooms) return false
    if (filters.maxPriceBrl !== undefined && p.priceBrl > filters.maxPriceBrl) return false
    return true
  })
}

export const getPropertyById = (id: string): PropertyListing | undefined => {
  return properties.find(p => p.id === id)
}
