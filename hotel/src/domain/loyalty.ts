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
  if (!Number.isInteger(input.nights) || input.nights <= 0) {
    throw new RangeError('Nights must be a positive integer')
  }
  if (!Number.isFinite(input.suite.price) || input.suite.price < 0) {
    throw new RangeError('Suite price must be a non-negative finite number')
  }
  if (input.addons) {
    for (const addon of input.addons) {
      if (!Number.isFinite(addon.price) || addon.price < 0) {
        throw new RangeError('Addon price must be a non-negative finite number')
      }
    }
  }

  const roomTotal = input.suite.price * input.nights
  const addonsTotal = input.addons?.reduce((sum, addon) => sum + addon.price, 0) ?? 0
  const subtotal = roomTotal + addonsTotal

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

  const discount = roomTotal * discountPercent
  const total = Math.max(0, subtotal - discount)

  return {
    subtotal: roundToCents(subtotal),
    discount: roundToCents(discount),
    total: roundToCents(total),
    benefits,
    voucher: generateVoucher()
  }
}
