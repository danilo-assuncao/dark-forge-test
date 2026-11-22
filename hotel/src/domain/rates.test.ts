import { describe, it, expect } from 'vitest'
import { calculateStayRates } from './rates'

describe('calculateStayRates', () => {
  it('calculates 1 night in baixa season for 2 guests without discount', () => {
    const result = calculateStayRates({
      suiteId: 's1', // price 100, max 2
      checkInIso: '2027-04-10T12:00:00Z',
      checkOutIso: '2027-04-11T12:00:00Z',
      guests: 2,
      season: 'baixa'
    })

    expect(result).toEqual({
      nights: 1,
      baseTotal: 100,
      extraGuestTotal: 0,
      subtotal: 100,
      discountTotal: 0,
      finalTotal: 100
    })
  })

  it('applies +20% multiplier in alta season', () => {
    const result = calculateStayRates({
      suiteId: 's1', // price 100, alta -> 120
      checkInIso: '2027-01-10T12:00:00Z',
      checkOutIso: '2027-01-12T12:00:00Z', // 2 nights -> 240
      guests: 2,
      season: 'alta'
    })

    expect(result).toEqual({
      nights: 2,
      baseTotal: 240,
      extraGuestTotal: 0,
      subtotal: 240,
      discountTotal: 0,
      finalTotal: 240
    })
  })

  it('calculates extra guest fee', () => {
    const result = calculateStayRates({
      suiteId: 's2', // price 250, max 4. 3 guests means 1 extra (base occupancy = 2)
      checkInIso: '2027-04-10T12:00:00Z',
      checkOutIso: '2027-04-12T12:00:00Z', // 2 nights
      guests: 3,
      season: 'baixa'
    })

    // base: 250 * 2 = 500
    // extra: 1 guest * 50 * 2 = 100
    expect(result).toEqual({
      nights: 2,
      baseTotal: 500,
      extraGuestTotal: 100,
      subtotal: 600,
      discountTotal: 0,
      finalTotal: 600
    })
  })

  it('applies 12% discount for stays of 5 or more nights', () => {
    const result = calculateStayRates({
      suiteId: 's2', // price 250
      checkInIso: '2027-05-01T12:00:00Z',
      checkOutIso: '2027-05-06T12:00:00Z', // 5 nights
      guests: 2,
      season: 'baixa'
    })

    // base: 250 * 5 = 1250
    // discount: 1250 * 0.12 = 150
    expect(result).toEqual({
      nights: 5,
      baseTotal: 1250,
      extraGuestTotal: 0,
      subtotal: 1250,
      discountTotal: 150,
      finalTotal: 1100
    })
  })

  it('handles combination of alta season, extra guests, and long stay discount', () => {
    const result = calculateStayRates({
      suiteId: 's3', // price 1000, max 6
      checkInIso: '2027-12-20T12:00:00Z',
      checkOutIso: '2027-12-30T12:00:00Z', // 10 nights
      guests: 5, // 3 extra guests
      season: 'alta'
    })

    // base nightly = 1000 * 1.2 = 1200
    // base total = 1200 * 10 = 12000
    // extra guest nightly = 3 * 50 = 150
    // extra guest total = 150 * 10 = 1500
    // subtotal = 13500
    // discount = 13500 * 0.12 = 1620
    // final = 13500 - 1620 = 11880
    expect(result).toEqual({
      nights: 10,
      baseTotal: 12000,
      extraGuestTotal: 1500,
      subtotal: 13500,
      discountTotal: 1620,
      finalTotal: 11880
    })
  })

  it('enforces minimum 1 night even if checkout is same as checkin', () => {
    const result = calculateStayRates({
      suiteId: 's1',
      checkInIso: '2027-04-10T12:00:00Z',
      checkOutIso: '2027-04-10T12:00:00Z',
      guests: 2,
      season: 'baixa'
    })

    expect(result.nights).toBe(1)
  })

  it('throws an error if suite is not found', () => {
    expect(() => {
      calculateStayRates({
        suiteId: 'unknown',
        checkInIso: '2027-04-10T12:00:00Z',
        checkOutIso: '2027-04-11T12:00:00Z',
        guests: 2,
        season: 'baixa'
      })
    }).toThrow('Suite not found: unknown')
  })

  it('throws an error if guests exceed max capacity', () => {
    expect(() => {
      calculateStayRates({
        suiteId: 's1', // max 2
        checkInIso: '2027-04-10T12:00:00Z',
        checkOutIso: '2027-04-11T12:00:00Z',
        guests: 3,
        season: 'baixa'
      })
    }).toThrow(/exceeds maximum capacity/)
  })

  it('throws an error if guests is less than 1', () => {
    expect(() => {
      calculateStayRates({
        suiteId: 's1',
        checkInIso: '2027-04-10T12:00:00Z',
        checkOutIso: '2027-04-11T12:00:00Z',
        guests: 0,
        season: 'baixa'
      })
    }).toThrow('Number of guests must be at least 1')
  })

  it('throws an error on invalid date', () => {
    expect(() => {
      calculateStayRates({
        suiteId: 's1',
        checkInIso: 'invalid',
        checkOutIso: '2027-04-11T12:00:00Z',
        guests: 1,
        season: 'baixa'
      })
    }).toThrow('Invalid date format')
  })
})
