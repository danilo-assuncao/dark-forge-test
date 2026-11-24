import { describe, expect, it } from 'vitest'
import { calculateBarberPricing } from './pricing'

const corte = { category: 'cabelo' as const, priceCents: 4500 }
const barba = { category: 'barba' as const, priceCents: 3500 }

describe('calculateBarberPricing', () => {
  it('returns zeros for empty selection', () => {
    expect(calculateBarberPricing({ services: [], isVip: true, coupon: 'DANBARBER10' })).toEqual({
      subtotalCents: 0,
      discounts: [],
      discountCents: 0,
      totalCents: 0
    })
  })

  it('charges full price for a single service', () => {
    const r = calculateBarberPricing({ services: [corte] })
    expect(r.totalCents).toBe(4500)
    expect(r.discounts).toEqual([])
  })

  it('applies 15% combo off for hair + beard', () => {
    const r = calculateBarberPricing({ services: [corte, barba] })
    expect(r.subtotalCents).toBe(8000)
    expect(r.discounts).toEqual([{ type: 'combo', percent: 15, amountCents: 1200 }])
    expect(r.totalCents).toBe(6800)
  })

  it('does not apply combo for two hair services', () => {
    expect(calculateBarberPricing({ services: [corte, corte] }).totalCents).toBe(9000)
  })

  it('applies 20% VIP off', () => {
    const r = calculateBarberPricing({ services: [corte], isVip: true })
    expect(r.totalCents).toBe(3600)
    expect(r.discountCents).toBe(900)
  })

  it('applies 10% off with DANBARBER10 (case/space insensitive)', () => {
    expect(calculateBarberPricing({ services: [corte], coupon: ' danbarber10 ' }).totalCents).toBe(4050)
  })

  it('ignores unknown coupons', () => {
    expect(calculateBarberPricing({ services: [corte], coupon: 'FOO' }).totalCents).toBe(4500)
  })

  it('stacks combo, VIP and coupon sequentially', () => {
    const r = calculateBarberPricing({ services: [corte, barba], isVip: true, coupon: 'DANBARBER10' })
    // 8000 -> 6800 -> 5440 -> 4896
    expect(r.discounts.map((d) => d.type)).toEqual(['combo', 'vip', 'coupon'])
    expect(r.totalCents).toBe(4896)
    expect(r.discountCents).toBe(3104)
  })

  it('rounds discounts to whole cents', () => {
    const r = calculateBarberPricing({ services: [{ category: 'cabelo', priceCents: 1001 }], coupon: 'DANBARBER10' })
    expect(r.discountCents).toBe(100)
    expect(Number.isInteger(r.totalCents)).toBe(true)
  })
})
