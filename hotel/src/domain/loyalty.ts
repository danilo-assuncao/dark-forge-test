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

export function finalizeBookingSummary(input: BookingInput): BookingSummary {
  const roomTotal = input.suite.price * input.nights
  const addonsTotal = input.addons?.reduce((sum, addon) => sum + addon.price, 0) ?? 0
  const subtotal = roomTotal + addonsTotal

  let discountPercent = 0
  const benefits: string[] = []

  switch (input.loyaltyTier) {
    case 'bronze':
      if (input.couponCode === 'DANSTAY15') {
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
  }

  const discount = roomTotal * discountPercent
  const total = subtotal - discount

  return {
    subtotal,
    discount,
    total,
    benefits,
    voucher: generateVoucher()
  }
}
