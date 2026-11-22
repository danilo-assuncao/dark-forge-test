import { describe, it, expect, vi, afterEach } from 'vitest'
import { finalizeBookingSummary } from './loyalty'
import type { SuiteItem, ConciergeAddon } from '../types'

describe('loyalty domain', () => {
  const mockSuite: SuiteItem = {
    id: 's1',
    name: 'Quarto Standard',
    tier: 'standard',
    maxGuests: 2,
    price: 100
  }

  const mockAddon: ConciergeAddon = {
    id: 'a1',
    name: 'Café da manhã',
    price: 50,
    pricing: 'per-stay'
  }

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should process bronze tier with no coupon (0% discount)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'bronze',
      suite: mockSuite,
      nights: 2,
      addons: [mockAddon]
    })

    expect(summary.subtotal).toBe(250) // 2*100 + 50
    expect(summary.discount).toBe(0)
    expect(summary.total).toBe(250)
    expect(summary.benefits).toEqual([])
    expect(summary.voucher).toMatch(/^HTL-[A-Z0-9]{4}$/)
  })

  it('should process bronze tier with empty-string or whitespace coupon (0% discount)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'bronze',
      suite: mockSuite,
      nights: 2,
      addons: [mockAddon],
      couponCode: '   '
    })

    expect(summary.discount).toBe(0)
    expect(summary.total).toBe(250)
  })

  it('should process bronze tier with DANSTAY15 coupon (15% discount on room)', () => {
    const spy = vi.spyOn(Math, 'random')
    spy.mockReturnValueOnce(0).mockReturnValueOnce(0).mockReturnValueOnce(0.999).mockReturnValueOnce(0.999)

    const summary = finalizeBookingSummary({
      loyaltyTier: 'bronze',
      suite: mockSuite,
      nights: 2,
      addons: [mockAddon],
      couponCode: 'DANSTAY15'
    })

    expect(summary.subtotal).toBe(250) // 2*100 + 50
    expect(summary.discount).toBe(30) // 15% of 200
    expect(summary.total).toBe(220)
    expect(summary.benefits).toEqual([])
    expect(summary.voucher).toBe('HTL-AA99')
  })

  it('should process ouro tier (8% discount + late check-out)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'ouro',
      suite: { ...mockSuite, price: 99.99 },
      nights: 3,
      addons: [mockAddon],
      couponCode: 'DANSTAY15' // Coupon should be ignored for non-bronze
    })

    // Exact assertions using toBe
    expect(summary.subtotal).toBe(349.97)
    expect(summary.discount).toBe(24.00) // 299.97 * 0.08 = 23.9976 -> 24.00
    expect(summary.total).toBe(325.97)
    expect(summary.benefits).toContain('late check-out cortesia')
  })

  it('should process diamante tier (15% discount + upgrade)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'diamante',
      suite: { ...mockSuite, price: 99.99 },
      nights: 2,
      addons: []
    })

    expect(summary.subtotal).toBe(199.98)
    expect(summary.discount).toBe(30.00) // 199.98 * 0.15 = 29.997 -> 30.00
    expect(summary.total).toBe(169.98)
    expect(summary.benefits).toContain('upgrade de categoria elegível')
  })

  it('should process diamante tier with coupon (coupon ignored)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'diamante',
      suite: { ...mockSuite, price: 100 },
      nights: 2,
      addons: [],
      couponCode: 'DANSTAY15'
    })

    expect(summary.subtotal).toBe(200)
    expect(summary.discount).toBe(30) // 200 * 0.15 = 30
    expect(summary.total).toBe(170)
  })

  it('should correctly handle rounding edge cases ensuring total = subtotal - discount', () => {
    // subtotal float error test
    // 3 * 99.99 = 299.97
    // let's use 10.005
    const summary = finalizeBookingSummary({
      loyaltyTier: 'diamante',
      suite: { ...mockSuite, price: 10.005 },
      nights: 1, // roomTotal = 10.005
      addons: [] // addonsTotal = 0
    })

    // subtotal = round(10.005) = 10.01
    // discount = round(10.005 * 0.15) = round(1.50075) = 1.50
    // total = 10.01 - 1.50 = 8.51
    expect(summary.subtotal).toBe(10.01)
    expect(summary.discount).toBe(1.50)
    expect(summary.total).toBe(8.51)
  })

  it('should handle zero price suite properly, discount applies only to room', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'diamante',
      suite: { ...mockSuite, price: 0 },
      nights: 2,
      addons: [mockAddon] // 50
    })

    expect(summary.subtotal).toBe(50)
    expect(summary.discount).toBe(0)
    expect(summary.total).toBe(50)
  })

  it('should handle free suite and free addons successfully', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'bronze',
      suite: { ...mockSuite, price: 0 },
      nights: 2,
      addons: [{ ...mockAddon, price: 0 }]
    })

    expect(summary.subtotal).toBe(0)
    expect(summary.discount).toBe(0)
    expect(summary.total).toBe(0)
  })

  describe('input validation errors', () => {
    it.each([
      [0], [-1], [1.5], [NaN], [Infinity], [-Infinity]
    ])('should throw RangeError for invalid nights: %s', (invalidNights) => {
      expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: mockSuite, nights: invalidNights }))
        .toThrowError(/Nights must be a positive integer/)
    })

    it.each([
      [-100], [NaN], [Infinity], [-Infinity]
    ])('should throw RangeError for invalid suite price: %s', (invalidPrice) => {
      expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: { ...mockSuite, price: invalidPrice }, nights: 2 }))
        .toThrowError(/Suite price must be a non-negative finite number/)
    })

    it.each([
      [-50], [NaN], [Infinity], [-Infinity]
    ])('should throw RangeError for invalid addon price: %s', (invalidPrice) => {
      expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: mockSuite, addons: [{ ...mockAddon, price: invalidPrice }], nights: 2 }))
        .toThrowError(/Addon price must be a non-negative finite number/)
    })

    it('should throw TypeError if addon is invalid object', () => {
      expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: mockSuite, addons: [null as any], nights: 2 }))
        .toThrowError(TypeError)
      
      expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: mockSuite, addons: [undefined as any], nights: 2 }))
        .toThrowError(TypeError)
    })

    it('should throw RangeError for subtotal overflow (e.g. 1e308)', () => {
      expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: { ...mockSuite, price: 1e308 }, nights: 2 }))
        .toThrowError(/Calculated subtotal is not finite \(overflow\)/)
    })

    it('should throw an error for unknown tier', () => {
      expect(() => finalizeBookingSummary({ loyaltyTier: 'unknown' as any, suite: mockSuite, nights: 2 }))
        .toThrowError(/Unknown loyalty tier: unknown/)
    })
  })
})
