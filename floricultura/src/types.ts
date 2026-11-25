export type FlowerSpecies =
  'rosa' | 'tulipa' | 'girassol' | 'orquidea' | 'lirio' | 'margarida'

export type DeliveryWindow = 'manha' | 'tarde' | 'noite'

export interface FlowerStem {
  id: string
  name: string
  species: FlowerSpecies
  color: string
  priceCents: number
  stockStems: number
  description?: string
}

export interface GiftAddon {
  id: string
  name: string
  priceCents: number
}

export interface BouquetSelection {
  stemId: string
  quantity: number
  addonIds: string[]
  deliveryWindow: DeliveryWindow
}
