import { describe, it, expect } from 'vitest'
import { quoteGroomingSession } from './grooming'

describe('quoteGroomingSession', () => {
  it('should calculate base price correctly for pequeno and curta', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1'], // Banho Simples: pequeno 30
      size: 'pequeno',
      coat: 'curta',
      addons: [],
      isClubMember: false
    })
    expect(quote.total).toBe(30)
  })

  it('should add 20% for longa coat', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1'], // pequeno: 30 + 20% = 36
      size: 'pequeno',
      coat: 'longa',
      addons: [],
      isClubMember: false
    })
    expect(quote.total).toBe(36)
  })

  it('should add fixed value for addons', () => {
    const quote = quoteGroomingSession({
      serviceIds: [],
      size: 'medio',
      coat: 'curta',
      addons: ['hidratacao', 'corte-unhas', 'leva-e-traz'],
      isClubMember: false
    })
    // 30 + 15 + 25 = 70
    expect(quote.total).toBe(70)
  })

  it('should apply 15% discount for club members on services', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1'], // medio: 45
      size: 'medio',
      coat: 'curta',
      addons: ['corte-unhas'], // 15
      isClubMember: true
    })
    // services: 45 - 15% (6.75) = 38.25
    // addons: 15
    // total: 53.25
    expect(quote.total).toBe(53.25)
  })

  it('should apply 10% coupon discount on total and generate protocol', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1'], // grande: 60
      size: 'grande',
      coat: 'curta',
      addons: [],
      isClubMember: false,
      coupon: 'DANPET10'
    })
    // total before: 60
    // 10% discount: 6
    // total: 54
    expect(quote.total).toBe(54)
    expect(quote.protocol).toMatch(/^PET-[A-Z0-9]{4}$/)
  })

  it('should combine club and coupon discounts correctly', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1'], // pequeno: 30
      size: 'pequeno',
      coat: 'curta',
      addons: ['leva-e-traz'], // 25
      isClubMember: true,
      coupon: 'DANPET10'
    })
    // service: 30 -> club -15% = 25.5
    // addons: 25
    // subtotal: 50.5
    // coupon: -10% of 50.5 = 5.05
    // total: 45.45
    expect(quote.total).toBe(45.45)
  })
})
