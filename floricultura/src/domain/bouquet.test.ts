import {
  GLASS_VASE_PRICE_CENTS,
  LUXURY_DISCOUNT_PERCENT,
  LUXURY_MIN_STEMS,
  calculateBouquetPricing
} from './bouquet'
import type { BouquetInput } from './bouquet'

describe('calculateBouquetPricing', () => {
  it('exposes the luxury arrangement rules', () => {
    expect(LUXURY_MIN_STEMS).toBe(12)
    expect(LUXURY_DISCOUNT_PERCENT).toBe(15)
  })

  it('sums stems and subtotal without discount below 12 stems', () => {
    const pricing = calculateBouquetPricing({
      stems: [
        { stemId: 'rosa-vermelha', quantity: 3 },
        { stemId: 'girassol', quantity: 2 }
      ]
    })
    expect(pricing).toEqual({
      totalStems: 5,
      subtotalCents: 3 * 890 + 2 * 1100,
      discountCents: 0,
      vaseCents: 0,
      totalCents: 3 * 890 + 2 * 1100,
      isLuxury: false
    })
  })

  it('does not apply the discount at 11 stems', () => {
    const pricing = calculateBouquetPricing({
      stems: [{ stemId: 'rosa-vermelha', quantity: 11 }]
    })
    expect(pricing.isLuxury).toBe(false)
    expect(pricing.discountCents).toBe(0)
    expect(pricing.totalCents).toBe(11 * 890)
  })

  it('applies 15% off at exactly 12 stems', () => {
    const pricing = calculateBouquetPricing({
      stems: [{ stemId: 'rosa-vermelha', quantity: 12 }]
    })
    expect(pricing).toEqual({
      totalStems: 12,
      subtotalCents: 10680,
      discountCents: 1602,
      vaseCents: 0,
      totalCents: 9078,
      isLuxury: true
    })
  })

  it('counts stems across different lines towards the luxury threshold', () => {
    const pricing = calculateBouquetPricing({
      stems: [
        { stemId: 'rosa-branca', quantity: 6 },
        { stemId: 'tulipa-amarela', quantity: 6 }
      ]
    })
    const subtotal = 6 * 850 + 6 * 1290
    expect(pricing.totalStems).toBe(12)
    expect(pricing.isLuxury).toBe(true)
    expect(pricing.subtotalCents).toBe(subtotal)
    expect(pricing.discountCents).toBe(Math.round(subtotal * 0.15))
    expect(pricing.totalCents).toBe(subtotal - Math.round(subtotal * 0.15))
  })

  it('merges repeated stem ids', () => {
    const pricing = calculateBouquetPricing({
      stems: [
        { stemId: 'girassol', quantity: 5 },
        { stemId: 'girassol', quantity: 7 }
      ]
    })
    expect(pricing.totalStems).toBe(12)
    expect(pricing.subtotalCents).toBe(12 * 1100)
    expect(pricing.isLuxury).toBe(true)
  })

  it('rounds the discount to whole cents', () => {
    const pricing = calculateBouquetPricing({
      stems: [
        { stemId: 'rosa-vermelha', quantity: 11 },
        { stemId: 'lirio-branco', quantity: 1 }
      ]
    })
    const subtotal = 11 * 890 + 1590
    expect(pricing.discountCents).toBe(Math.round((subtotal * 15) / 100))
    expect(Number.isInteger(pricing.discountCents)).toBe(true)
    expect(Number.isInteger(pricing.totalCents)).toBe(true)
  })

  describe('glass vase upgrade', () => {
    it('charges nothing for the vase when omitted or false', () => {
      const stems = [{ stemId: 'girassol', quantity: 1 }]
      expect(calculateBouquetPricing({ stems }).vaseCents).toBe(0)
      expect(
        calculateBouquetPricing({ stems, glassVase: false }).vaseCents
      ).toBe(0)
    })

    it('adds the vase price to a regular bouquet', () => {
      const pricing = calculateBouquetPricing({
        stems: [{ stemId: 'girassol', quantity: 2 }],
        glassVase: true
      })
      expect(pricing.vaseCents).toBe(GLASS_VASE_PRICE_CENTS)
      expect(pricing.totalCents).toBe(2 * 1100 + GLASS_VASE_PRICE_CENTS)
    })

    it('keeps the vase out of the luxury discount base', () => {
      const pricing = calculateBouquetPricing({
        stems: [{ stemId: 'rosa-vermelha', quantity: 12 }],
        glassVase: true
      })
      expect(pricing.discountCents).toBe(1602)
      expect(pricing.totalCents).toBe(9078 + GLASS_VASE_PRICE_CENTS)
    })

    it('charges only the vase for an empty bouquet', () => {
      const pricing = calculateBouquetPricing({ stems: [], glassVase: true })
      expect(pricing).toEqual({
        totalStems: 0,
        subtotalCents: 0,
        discountCents: 0,
        vaseCents: GLASS_VASE_PRICE_CENTS,
        totalCents: GLASS_VASE_PRICE_CENTS,
        isLuxury: false
      })
    })
  })

  it('returns zero for an empty bouquet without vase', () => {
    expect(calculateBouquetPricing({ stems: [] }).totalCents).toBe(0)
  })

  describe('validation', () => {
    it('rejects unknown stem ids', () => {
      expect(() =>
        calculateBouquetPricing({
          stems: [{ stemId: 'cacto', quantity: 1 }]
        })
      ).toThrow('Unknown flower stem: cacto')
    })

    it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects invalid quantity %s',
      (quantity) => {
        expect(() =>
          calculateBouquetPricing({
            stems: [{ stemId: 'girassol', quantity }]
          })
        ).toThrow('Invalid quantity for girassol')
      }
    )

    it('rejects quantities above available stock', () => {
      expect(() =>
        calculateBouquetPricing({
          stems: [{ stemId: 'orquidea-phalaenopsis', quantity: 13 }]
        })
      ).toThrow('Insufficient stock for orquidea-phalaenopsis')
    })

    it('rejects out-of-stock flowers', () => {
      expect(() =>
        calculateBouquetPricing({
          stems: [{ stemId: 'margarida', quantity: 1 }]
        })
      ).toThrow('Insufficient stock for margarida')
    })

    it('checks stock against the merged quantity of repeated lines', () => {
      expect(() =>
        calculateBouquetPricing({
          stems: [
            { stemId: 'orquidea-phalaenopsis', quantity: 7 },
            { stemId: 'orquidea-phalaenopsis', quantity: 6 }
          ]
        })
      ).toThrow('Insufficient stock for orquidea-phalaenopsis')
    })
  })

  it('does not mutate the input', () => {
    const input: BouquetInput = {
      stems: [{ stemId: 'rosa-vermelha', quantity: 12 }],
      glassVase: true
    }
    const snapshot = structuredClone(input)
    calculateBouquetPricing(input)
    expect(input).toEqual(snapshot)
  })
})
