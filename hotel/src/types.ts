export type SuiteTier = 'standard' | 'vista-mar' | 'presidencial'
export type LoyaltyTier = 'bronze' | 'ouro' | 'diamante'

export interface SuiteItem {
  id: string
  name: string
  tier: SuiteTier
  maxGuests: number
  price: number
}

export interface ConciergeAddon {
  id: string
  name: string
  price: number
  pricing: 'per-guest-night' | 'per-stay'
}
