import { describe, it, expect, vi, afterEach } from 'vitest'
import { finalizeBookingSummary } from './loyalty'
import { SuiteItem, ConciergeAddon } from '../types'

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
    price: 50
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

  it('should process bronze tier with DANSTAY15 coupon (15% discount on room)', () => {
    // Math.random will return 0 for first 2 chars, 0.99 for last 2 chars
    // 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' has length 36
    // 0 * 36 = 0 ('A'), 0.999 * 36 = 35 ('9')
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

  it('should process bronze tier with coupon variant and empty addons', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'bronze',
      suite: mockSuite,
      nights: 2,
      addons: [],
      couponCode: ' danstay15 ' // Testing trim and uppercase
    })

    expect(summary.subtotal).toBe(200)
    expect(summary.discount).toBe(30)
    expect(summary.total).toBe(170)
  })

  it('should process bronze tier with invalid coupon (0% discount)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'bronze',
      suite: mockSuite,
      nights: 2,
      couponCode: 'INVALID'
    })

    expect(summary.discount).toBe(0)
  })

  it('should process ouro tier (8% discount + late check-out)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'ouro',
      suite: { ...mockSuite, price: 99.99 },
      nights: 3,
      addons: [mockAddon],
      couponCode: 'DANSTAY15' // Coupon should be ignored for non-bronze
    })

    // subtotal = 3 * 99.99 + 50 = 299.97 + 50 = 349.97
    // discount = 299.97 * 0.08 = 23.9976
    // roundToCents(discount) = 24.00
    // total = 349.97 - 24.00 = 325.97
    expect(summary.subtotal).toBeCloseTo(349.97, 2)
    expect(summary.discount).toBeCloseTo(24.00, 2)
    expect(summary.total).toBeCloseTo(325.97, 2)
    expect(summary.benefits).toContain('late check-out cortesia')
  })

  it('should process diamante tier (15% discount + upgrade)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'diamante',
      suite: { ...mockSuite, price: 99.99 },
      nights: 2,
      addons: []
    })

    // subtotal = 2 * 99.99 = 199.98
    // discount = 199.98 * 0.15 = 29.997
    // roundToCents(discount) = 30.00
    // total = 199.98 - 30.00 = 169.98
    expect(summary.subtotal).toBeCloseTo(199.98, 2)
    expect(summary.discount).toBeCloseTo(30.00, 2)
    expect(summary.total).toBeCloseTo(169.98, 2)
    expect(summary.benefits).toContain('upgrade de categoria elegível')
  })

  it('should process without addons correctly', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'bronze',
      suite: mockSuite,
      nights: 1
    })

    expect(summary.subtotal).toBe(100)
    expect(summary.discount).toBe(0)
    expect(summary.total).toBe(100)
  })

  it('should throw an error if nights is less than or equal to 0 or not an integer', () => {
    expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: mockSuite, nights: 0 }))
      .toThrow(RangeError)
    expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: mockSuite, nights: -1 }))
      .toThrow(RangeError)
    expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: mockSuite, nights: 1.5 }))
      .toThrow(RangeError)
  })

  it('should throw an error if prices are invalid', () => {
    expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: { ...mockSuite, price: -100 }, nights: 2 }))
      .toThrow(RangeError)
    expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: { ...mockSuite, price: NaN }, nights: 2 }))
      .toThrow(RangeError)
    expect(() => finalizeBookingSummary({ loyaltyTier: 'bronze', suite: mockSuite, addons: [{ ...mockAddon, price: -50 }], nights: 2 }))
      .toThrow(RangeError)
  })

  it('should throw an error for unknown tier', () => {
    expect(() => finalizeBookingSummary({ loyaltyTier: 'unknown' as any, suite: mockSuite, nights: 2 }))
      .toThrow(Error)
  })
})
