export type PetSize = 'pequeno' | 'medio' | 'grande'
export type CoatType = 'curta' | 'longa'

export interface GroomingAddon {
  readonly id: string
  readonly name: string
  readonly price: number
}

export interface VaccineRecord {
  readonly id: string
  readonly name: string
  readonly date: string
  readonly veterinarian: string
}

export interface PetServiceItem {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly basePrice: number
  readonly priceBySize: Readonly<Record<PetSize, number>>
}
