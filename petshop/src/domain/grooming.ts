import type { PetSize, CoatType } from '../types'
import { getServiceById } from '../data/catalog'

export type OptionalAddon = 'hidratacao' | 'corte-unhas' | 'leva-e-traz'

export interface GroomingSessionInput {
  serviceIds: string[]
  size: PetSize
  coat: CoatType
  addons: OptionalAddon[]
  isClubMember: boolean
  coupon?: string
}

export interface GroomingQuote {
  subtotalServices: number
  subtotalAddons: number
  discountClub: number
  discountCoupon: number
  total: number
  protocol?: string
}

const ADDON_PRICES: Record<OptionalAddon, number> = {
  hidratacao: 30,
  'corte-unhas': 15,
  'leva-e-traz': 25
}

export function quoteGroomingSession(input: GroomingSessionInput): GroomingQuote {
  let subtotalServices = 0
  
  for (const id of input.serviceIds) {
    const service = getServiceById(id)
    if (service) {
      let price = service.priceBySize[input.size]
      if (input.coat === 'longa') {
        price *= 1.2
      }
      subtotalServices += price
    }
  }

  let subtotalAddons = 0
  for (const addon of input.addons) {
    subtotalAddons += ADDON_PRICES[addon]
  }

  let discountClub = 0
  if (input.isClubMember) {
    discountClub = subtotalServices * 0.15
  }

  const subtotalWithClub = subtotalServices - discountClub + subtotalAddons
  let discountCoupon = 0
  let protocol: string | undefined

  if (input.coupon === 'DANPET10') {
    // 10% on single closing? (total after club discount? or total without club? Let's apply on the remaining subtotal)
    discountCoupon = subtotalWithClub * 0.1
    protocol = `PET-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
  }

  const total = subtotalWithClub - discountCoupon

  return {
    subtotalServices,
    subtotalAddons,
    discountClub,
    discountCoupon,
    total,
    protocol
  }
}
