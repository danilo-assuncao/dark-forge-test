import { describe, it, expect } from 'vitest'
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
    expect(summary.voucher).toMatch(/^HTL-[A-Z0-9]{4}$/)
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
      suite: mockSuite,
      nights: 2,
      addons: [mockAddon],
      couponCode: 'DANSTAY15' // Coupon should be ignored for non-bronze
    })

    expect(summary.subtotal).toBe(250)
    expect(summary.discount).toBe(16) // 8% of 200
    expect(summary.total).toBe(234)
    expect(summary.benefits).toContain('late check-out cortesia')
    expect(summary.voucher).toMatch(/^HTL-[A-Z0-9]{4}$/)
  })

  it('should process diamante tier (15% discount + upgrade)', () => {
    const summary = finalizeBookingSummary({
      loyaltyTier: 'diamante',
      suite: mockSuite,
      nights: 2,
      addons: []
    })

    expect(summary.subtotal).toBe(200)
    expect(summary.discount).toBe(30) // 15% of 200
    expect(summary.total).toBe(170)
    expect(summary.benefits).toContain('upgrade de categoria elegível')
    expect(summary.voucher).toMatch(/^HTL-[A-Z0-9]{4}$/)
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
})
