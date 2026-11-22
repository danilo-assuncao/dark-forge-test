import { describe, it, expect, vi, afterEach } from 'vitest'
import { quoteGroomingSession } from './grooming'

describe('quoteGroomingSession', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should calculate base price correctly for pequeno and curta', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1'],
      size: 'pequeno',
      coat: 'curta',
      addons: [],
      isClubMember: false
    })
    expect(quote.total).toBe(30)
    expect(quote.protocol).toBeUndefined()
  })

  it('should add 20% for longa coat and round to cents properly', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s2'], // Tosa Higiênica: grande = 35. 35 * 1.2 = 42
      size: 'grande',
      coat: 'longa',
      addons: [],
      isClubMember: false
    })
    expect(quote.total).toBe(42)
  })

  it('should add fixed value for addons', () => {
    const quote = quoteGroomingSession({
      serviceIds: [],
      size: 'medio',
      coat: 'curta',
      addons: ['hidratacao', 'corte-unhas', 'leva-e-traz'],
      isClubMember: false
    })
    expect(quote.total).toBe(70)
  })

  it('should apply 15% discount for club members on services', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1'],
      size: 'medio',
      coat: 'curta',
      addons: ['corte-unhas'],
      isClubMember: true
    })
    // service s1 medio = 45. club discount 45 * 0.15 = 6.75
    // 45 - 6.75 = 38.25. + 15 = 53.25
    expect(quote.discountClub).toBe(6.75)
    expect(quote.total).toBe(53.25)
  })

  it('should apply 10% coupon discount on total and generate protocol deterministically', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('1234abcd-0000-0000-0000-000000000000' as `${string}-${string}-${string}-${string}-${string}`)

    const quote = quoteGroomingSession({
      serviceIds: ['s1'], // grande = 60
      size: 'grande',
      coat: 'curta',
      addons: [],
      isClubMember: false,
      coupon: ' DANPET10 ' // testing trim & uppercase normalization
    })
    expect(quote.discountCoupon).toBe(6)
    expect(quote.total).toBe(54)
    expect(quote.protocol).toBe('PET-1234')
  })

  it('should combine club, coupon discounts and multiple services correctly (including floats)', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1', 's2'], // s1 pequeno 30, s2 pequeno 20. Total = 50
      size: 'pequeno',
      coat: 'curta',
      addons: ['leva-e-traz'], // 25
      isClubMember: true,
      coupon: 'danpet10' // case sensitivity handled
    })
    // Services: 50
    // Club discount: 50 * 0.15 = 7.5
    // Subtotal with addons: 50 - 7.5 + 25 = 67.5
    // Coupon discount: 67.5 * 0.10 = 6.75
    // Total = 67.5 - 6.75 = 60.75
    expect(quote.subtotalServices).toBe(50)
    expect(quote.discountClub).toBe(7.5)
    expect(quote.subtotalAddons).toBe(25)
    expect(quote.discountCoupon).toBe(6.75)
    expect(quote.total).toBe(60.75)
  })

  it('should throw an error for unknown service ID', () => {
    expect(() => quoteGroomingSession({
      serviceIds: ['invalid-id'],
      size: 'pequeno',
      coat: 'curta',
      addons: [],
      isClubMember: false
    })).toThrowError('Service not found: invalid-id')
  })

  it('should throw an error for unknown addon', () => {
    expect(() => quoteGroomingSession({
      serviceIds: ['s1'],
      size: 'pequeno',
      coat: 'curta',
      addons: ['invalid-addon' as any],
      isClubMember: false
    })).toThrowError('Invalid addon: invalid-addon')
  })

  it('should throw an error for invalid coupon', () => {
    expect(() => quoteGroomingSession({
      serviceIds: ['s1'],
      size: 'pequeno',
      coat: 'curta',
      addons: [],
      isClubMember: false,
      coupon: 'INVALID'
    })).toThrowError('Invalid coupon')
  })

  it('should handle longa coat with club member and coupon, rounding correctly', () => {
    const quote = quoteGroomingSession({
      serviceIds: ['s1'], // medio = 45. longa +20% = 54
      size: 'medio',
      coat: 'longa',
      addons: [],
      isClubMember: true,
      coupon: 'DANPET10'
    })
    // subServices = 54
    // club discount = 54 * 0.15 = 8.1
    // subtotal = 45.9
    // coupon = 45.9 * 0.1 = 4.59
    // total = 45.9 - 4.59 = 41.31
    expect(quote.subtotalServices).toBe(54)
    expect(quote.discountClub).toBe(8.1)
    expect(quote.discountCoupon).toBe(4.59)
    expect(quote.total).toBe(41.31)
  })
})
