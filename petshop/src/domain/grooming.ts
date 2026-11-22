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

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100
}

export function quoteGroomingSession(input: GroomingSessionInput): GroomingQuote {
  let subtotalServices = 0

  for (const id of input.serviceIds) {
    const service = getServiceById(id)
    if (!service) {
      throw new Error(`Service not found: ${id}`)
    }
    let price = service.priceBySize[input.size]
    if (input.coat === 'longa') {
      price *= 1.2
    }
    subtotalServices += price
  }

  let subtotalAddons = 0
  for (const addon of input.addons) {
    const addonPrice = ADDON_PRICES[addon]
    if (addonPrice === undefined) {
      throw new Error(`Invalid addon: ${addon}`)
    }
    subtotalAddons += addonPrice
  }

  let discountClub = 0
  if (input.isClubMember) {
    discountClub = subtotalServices * 0.15
  }

  const subtotalWithClub = subtotalServices - discountClub + subtotalAddons
  let discountCoupon = 0
  let protocol: string | undefined

  if (input.coupon) {
    const normalizedCoupon = input.coupon.trim().toUpperCase()
    if (normalizedCoupon === 'DANPET10') {
      discountCoupon = subtotalWithClub * 0.1
      protocol = `PET-${crypto.randomUUID().split('-')[0].substring(0, 4).toUpperCase()}`
    } else {
      throw new Error('Invalid coupon')
    }
  }

  return {
    subtotalServices: roundToCents(subtotalServices),
    subtotalAddons: roundToCents(subtotalAddons),
    discountClub: roundToCents(discountClub),
    discountCoupon: roundToCents(discountCoupon),
    total: roundToCents(subtotalWithClub - discountCoupon),
    protocol
  }
}
