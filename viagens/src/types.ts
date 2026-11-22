export type RegionScope = 'nacional' | 'internacional'

export type CabinClass = 'economica' | 'executiva'

export interface ExcursionItem {
  id: string
  name: string
  description?: string
  price: number
}

export interface TravelDestination {
  id: string
  name: string
  scope: RegionScope
  description: string
  price: number
  availableCabins: CabinClass[]
  excursions: ExcursionItem[]
}
