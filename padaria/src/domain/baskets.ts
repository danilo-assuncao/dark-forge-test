import type { BasketLine } from '../types'
import { getBakeById } from '../data/bakes'

/** Minimum number of units in the basket to unlock the Cesta Matinal discount. */
export const BASKET_MIN_UNITS = 6
export const BASKET_DISCOUNT_PERCENT = 12
export const SUBSCRIBER_DISCOUNT_PERCENT = 15
export const COUPON_DISCOUNT_PERCENT = 10

/** Supported coupon codes mapped to their discount percentage. */
export const COUPONS: Record<string, number> = {
  DANBAKERY10: COUPON_DISCOUNT_PERCENT
}

export interface BasketInput {
  lines: BasketLine[]
  /** Whether the customer subscribes to the Pão Quente club. */
  isSubscriber?: boolean
  coupon?: string
}

export type DiscountType = 'basket' | 'subscription' | 'coupon'

export interface AppliedDiscount {
  type: DiscountType
  percent: number
  amountCents: number
}

export interface BasketResult {
  subtotalCents: number
  totalUnits: number
  discounts: AppliedDiscount[]
  discountCents: number
  totalCents: number
}

const normalizeCoupon = (code?: string): string => (code ?? '').trim().toUpperCase()

const isValidQuantity = (quantity: number): boolean => Number.isInteger(quantity) && quantity > 0

/**
 * Computes the price of a morning basket.
 * Lines referencing unknown items or with a non-positive / fractional quantity are ignored.
 * Discounts are applied sequentially (Cesta Matinal, then Pão Quente subscription, then coupon),
 * each over the remaining amount, with every discount rounded to whole cents.
 */
export const calculateBakeryBasket = ({
  lines,
  isSubscriber = false,
  coupon
}: BasketInput): BasketResult => {
  const priced = lines.flatMap((line) => {
    const item = getBakeById(line.itemId)
    return item && isValidQuantity(line.quantity)
      ? [{ priceCents: item.priceCents, quantity: line.quantity }]
      : []
  })

  const subtotalCents = priced.reduce((sum, l) => sum + l.priceCents * l.quantity, 0)
  const totalUnits = priced.reduce((sum, l) => sum + l.quantity, 0)
  const discounts: AppliedDiscount[] = []
  let remaining = subtotalCents

  const apply = (type: DiscountType, percent: number) => {
    const amountCents = Math.round((remaining * percent) / 100)
    remaining -= amountCents
    discounts.push({ type, percent, amountCents })
  }

  if (subtotalCents > 0) {
    if (totalUnits >= BASKET_MIN_UNITS) apply('basket', BASKET_DISCOUNT_PERCENT)
    if (isSubscriber) apply('subscription', SUBSCRIBER_DISCOUNT_PERCENT)
    const couponPercent = COUPONS[normalizeCoupon(coupon)]
    if (couponPercent) apply('coupon', couponPercent)
  }

  return {
    subtotalCents,
    totalUnits,
    discounts,
    discountCents: subtotalCents - remaining,
    totalCents: remaining
  }
}
