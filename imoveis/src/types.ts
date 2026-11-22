export type PropertyType = 'apartamento' | 'casa' | 'studio' | 'cobertura'

export type AmortizationSystem = 'SAC' | 'PRICE'

export interface PropertyListing {
  id: string
  title: string
  type: PropertyType
  bedrooms: number
  priceBrl: number
  areaSqMeters: number
  description?: string
}

export interface VisitBooking {
  propertyId: string
  visitorName: string
  date: string
}
