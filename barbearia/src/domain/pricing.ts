import type { Service } from '../types'

export const COMBO_DISCOUNT_PERCENT = 15
export const VIP_DISCOUNT_PERCENT = 20
export const COUPON_DISCOUNT_PERCENT = 10

/** Supported coupon codes mapped to their discount percentage. */
export const COUPONS: Record<string, number> = {
  DANBARBER10: COUPON_DISCOUNT_PERCENT
}

export interface PricingInput {
  services: Pick<Service, 'category' | 'priceCents'>[]
  isVip?: boolean
  coupon?: string
}

export type DiscountType = 'combo' | 'vip' | 'coupon'

export interface AppliedDiscount {
  type: DiscountType
  percent: number
  amountCents: number
}

export interface PricingResult {
  subtotalCents: number
  discounts: AppliedDiscount[]
  discountCents: number
  totalCents: number
}

const normalizeCoupon = (code?: string): string => (code ?? '').trim().toUpperCase()

/**
 * Computes the price for a set of selected services.
 * Discounts are applied sequentially (combo, then VIP, then coupon), each over the
 * remaining amount, with every discount rounded to whole cents.
 */
export const calculateBarberPricing = ({
  services,
  isVip = false,
  coupon
}: PricingInput): PricingResult => {
  const subtotalCents = services.reduce((sum, s) => sum + s.priceCents, 0)
  const discounts: AppliedDiscount[] = []
  let remaining = subtotalCents

  const apply = (type: DiscountType, percent: number) => {
    const amountCents = Math.round((remaining * percent) / 100)
    remaining -= amountCents
    discounts.push({ type, percent, amountCents })
  }

  if (subtotalCents > 0) {
    const hasHair = services.some((s) => s.category === 'cabelo')
    const hasBeard = services.some((s) => s.category === 'barba')
    if (hasHair && hasBeard) apply('combo', COMBO_DISCOUNT_PERCENT)
    if (isVip) apply('vip', VIP_DISCOUNT_PERCENT)
    const couponPercent = COUPONS[normalizeCoupon(coupon)]
    if (couponPercent) apply('coupon', couponPercent)
  }

  return {
    subtotalCents,
    discounts,
    discountCents: subtotalCents - remaining,
    totalCents: remaining
  }
}
