import { describe, expect, it } from 'vitest'
import type { BasketLine } from '../types'
import { calculateBakeryBasket } from './baskets'

const line = (itemId: string, quantity: number): BasketLine => ({ itemId, quantity })

describe('calculateBakeryBasket', () => {
  it('returns zeros for an empty basket even with subscription and coupon', () => {
    expect(calculateBakeryBasket({ lines: [], isSubscriber: true, coupon: 'DANBAKERY10' })).toEqual({
      subtotalCents: 0,
      totalUnits: 0,
      discounts: [],
      discountCents: 0,
      totalCents: 0
    })
  })

  it('charges full price for 5 units', () => {
    const r = calculateBakeryBasket({ lines: [line('pao-frances', 5)] })
    expect(r.subtotalCents).toBe(500)
    expect(r.totalUnits).toBe(5)
    expect(r.discounts).toEqual([])
    expect(r.totalCents).toBe(500)
  })

  it('applies 12% Cesta Matinal off for 6 units in a single line', () => {
    const r = calculateBakeryBasket({ lines: [line('pao-frances', 6)] })
    expect(r.subtotalCents).toBe(600)
    expect(r.discounts).toEqual([{ type: 'basket', percent: 12, amountCents: 72 }])
    expect(r.discountCents).toBe(72)
    expect(r.totalCents).toBe(528)
  })

  it('counts units across multiple lines', () => {
    const r = calculateBakeryBasket({ lines: [line('pao-frances', 3), line('pao-de-queijo', 3)] })
    expect(r.subtotalCents).toBe(1650)
    expect(r.totalUnits).toBe(6)
    expect(r.discounts).toEqual([{ type: 'basket', percent: 12, amountCents: 198 }])
    expect(r.totalCents).toBe(1452)
  })

  it('stacks 15% Pão Quente off after the basket discount for subscribers', () => {
    const r = calculateBakeryBasket({ lines: [line('pao-de-queijo', 6)], isSubscriber: true })
    expect(r.subtotalCents).toBe(2700)
    expect(r.discounts).toEqual([
      { type: 'basket', percent: 12, amountCents: 324 },
      { type: 'subscription', percent: 15, amountCents: 356 }
    ])
    expect(r.discountCents).toBe(680)
    expect(r.totalCents).toBe(2020)
  })

  it('applies the subscription discount even below 6 units', () => {
    const r = calculateBakeryBasket({ lines: [line('bolo-fuba', 1)], isSubscriber: true })
    expect(r.discounts).toEqual([{ type: 'subscription', percent: 15, amountCents: 375 }])
    expect(r.totalCents).toBe(2125)
  })

  it('applies 10% off with coupon DANBAKERY10', () => {
    const r = calculateBakeryBasket({ lines: [line('bolo-fuba', 1)], coupon: 'DANBAKERY10' })
    expect(r.discounts).toEqual([{ type: 'coupon', percent: 10, amountCents: 250 }])
    expect(r.totalCents).toBe(2250)
  })

  it('accepts the coupon case-insensitively and with surrounding spaces', () => {
    const r = calculateBakeryBasket({ lines: [line('bolo-fuba', 1)], coupon: '  danbakery10 ' })
    expect(r.totalCents).toBe(2250)
  })

  it('ignores unknown or empty coupons', () => {
    expect(calculateBakeryBasket({ lines: [line('bolo-fuba', 1)], coupon: 'DANBARBER10' }).discounts).toEqual([])
    expect(calculateBakeryBasket({ lines: [line('bolo-fuba', 1)], coupon: '' }).discounts).toEqual([])
  })

  it('applies basket, subscription and coupon sequentially in that order', () => {
    const r = calculateBakeryBasket({
      lines: [line('pao-de-queijo', 6), line('bolo-fuba', 1)],
      isSubscriber: true,
      coupon: 'DANBAKERY10'
    })
    expect(r.subtotalCents).toBe(5200)
    expect(r.totalUnits).toBe(7)
    expect(r.discounts).toEqual([
      { type: 'basket', percent: 12, amountCents: 624 },
      { type: 'subscription', percent: 15, amountCents: 686 },
      { type: 'coupon', percent: 10, amountCents: 389 }
    ])
    expect(r.discountCents).toBe(1699)
    expect(r.totalCents).toBe(3501)
  })

  it('rounds each discount to whole cents', () => {
    const r = calculateBakeryBasket({ lines: [line('sonho', 1)], isSubscriber: true })
    expect(r.discounts).toEqual([{ type: 'subscription', percent: 15, amountCents: 98 }])
    expect(r.totalCents).toBe(552)
  })

  it('ignores unknown items and non-positive or fractional quantities', () => {
    const r = calculateBakeryBasket({
      lines: [
        line('croissant', 1),
        line('nao-existe', 10),
        line('pao-frances', 0),
        line('pao-frances', -3),
        line('baguete', 1.5)
      ]
    })
    expect(r.subtotalCents).toBe(800)
    expect(r.totalUnits).toBe(1)
    expect(r.discounts).toEqual([])
    expect(r.totalCents).toBe(800)
  })

  it('does not count invalid lines toward the 6-unit threshold', () => {
    const r = calculateBakeryBasket({ lines: [line('pao-frances', 5), line('nao-existe', 1)] })
    expect(r.totalUnits).toBe(5)
    expect(r.discounts).toEqual([])
  })

  it('does not mutate the input lines', () => {
    const lines = [line('pao-frances', 6)]
    const snapshot = structuredClone(lines)
    calculateBakeryBasket({ lines, isSubscriber: true })
    expect(lines).toEqual(snapshot)
  })
})
