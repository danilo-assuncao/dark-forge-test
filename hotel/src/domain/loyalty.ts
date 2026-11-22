import { LoyaltyTier, SuiteItem, ConciergeAddon } from '../types'

export interface BookingInput {
  loyaltyTier: LoyaltyTier
  suite: SuiteItem
  nights: number
  addons?: ConciergeAddon[]
  couponCode?: string
}

export interface BookingSummary {
  subtotal: number
  discount: number
  total: number
  benefits: string[]
  voucher: string
}

function generateVoucher(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'HTL-'
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100
}

export function finalizeBookingSummary(input: BookingInput): BookingSummary {
  if (!Number.isSafeInteger(input.nights) || input.nights <= 0) {
    throw new RangeError('Nights must be a positive integer')
  }
  if (!Number.isFinite(input.suite.price) || input.suite.price < 0) {
    throw new RangeError('Suite price must be a non-negative finite number')
  }
  if (input.addons) {
    for (const addon of input.addons) {
      if (!addon || typeof addon !== 'object') {
        throw new TypeError('Addon must be an object')
      }
      if (!Number.isFinite(addon.price) || addon.price < 0) {
        throw new RangeError('Addon price must be a non-negative finite number')
      }
    }
  }

  const roomTotal = input.suite.price * input.nights
  const addonsTotal = input.addons?.reduce((sum, addon) => sum + addon.price, 0) ?? 0
  const rawSubtotal = roomTotal + addonsTotal

  if (!Number.isFinite(rawSubtotal)) {
    throw new RangeError('Calculated subtotal is not finite (overflow)')
  }

  const subtotal = roundToCents(rawSubtotal)

  let discountPercent = 0
  const benefits: string[] = []

  switch (input.loyaltyTier) {
    case 'bronze':
      if (input.couponCode?.trim().toUpperCase() === 'DANSTAY15') {
        discountPercent = 0.15
      }
      break
    case 'ouro':
      discountPercent = 0.08
      benefits.push('late check-out cortesia')
      break
    case 'diamante':
      discountPercent = 0.15
      benefits.push('upgrade de categoria elegível')
      break
    default:
      throw new Error(`Unknown loyalty tier: ${input.loyaltyTier}`)
  }

  const rawDiscount = roomTotal * discountPercent
  const discount = roundToCents(rawDiscount)
  const total = roundToCents(subtotal - discount)

  return {
    subtotal,
    discount,
    total,
    benefits,
    voucher: generateVoucher()
  }
}
