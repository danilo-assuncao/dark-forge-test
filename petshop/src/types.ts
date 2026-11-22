export type PetSize = 'pequeno' | 'medio' | 'grande'
export type CoatType = 'curta' | 'longa'

export interface GroomingAddon {
  id: string
  name: string
  price: number
}

export interface VaccineRecord {
  id: string
  name: string
  date: string
  veterinarian: string
}

export interface PetServiceItem {
  id: string
  name: string
  description: string
  basePrice: number
  priceBySize: Record<PetSize, number>
}
