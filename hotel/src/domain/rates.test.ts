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

  it('does not apply discount for stays of 4 nights', () => {
    const result = calculateStayRates({
      suiteId: 's2', // price 250
      checkInIso: '2027-05-01T12:00:00Z',
      checkOutIso: '2027-05-05T12:00:00Z', // 4 nights
      guests: 2,
      season: 'baixa'
    })

    // base: 250 * 4 = 1000
    expect(result).toEqual({
      nights: 4,
      baseTotal: 1000,
      extraGuestTotal: 0,
      subtotal: 1000,
      discountTotal: 0,
      finalTotal: 1000
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

  it('handles combination of alta season, extra guests, and long stay discount with fractional monetary handling', () => {
    const result = calculateStayRates({
      suiteId: 's2', // price 250
      checkInIso: '2027-12-20T12:00:00Z',
      checkOutIso: '2027-12-25T12:00:00Z', // 5 nights
      guests: 3, // 1 extra guest
      season: 'alta'
    })

    // price 250 * 1.2 = 300
    // base total = 300 * 5 = 1500
    // extra guest nightly = 1 * 50 = 50
    // extra guest total = 50 * 5 = 250
    // subtotal = 1750
    // discount = 1750 * 0.12 = 210
    // final = 1750 - 210 = 1540
    expect(result).toEqual({
      nights: 5,
      baseTotal: 1500,
      extraGuestTotal: 250,
      subtotal: 1750,
      discountTotal: 210,
      finalTotal: 1540
    })
  })

  it('throws an error if check-out is before or equal to check-in', () => {
    expect(() => {
      calculateStayRates({
        suiteId: 's1',
        checkInIso: '2027-04-10T12:00:00Z',
        checkOutIso: '2027-04-10T12:00:00Z',
        guests: 2,
        season: 'baixa'
      })
    }).toThrow('Check-out date must be after check-in date')

    expect(() => {
      calculateStayRates({
        suiteId: 's1',
        checkInIso: '2027-04-11T12:00:00Z',
        checkOutIso: '2027-04-10T12:00:00Z',
        guests: 2,
        season: 'baixa'
      })
    }).toThrow('Check-out date must be after check-in date')
  })

  it('correctly rounds partial day differences (DST or time shifts) to calendar days', () => {
    const result = calculateStayRates({
      suiteId: 's1',
      checkInIso: '2027-04-10T22:00:00Z',
      checkOutIso: '2027-04-12T02:00:00Z', // 2 calendar days, 28 hours diff
      guests: 2,
      season: 'baixa'
    })
    expect(result.nights).toBe(2)
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
    }).toThrow('Suite not found')
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
    }).toThrow('exceeds maximum capacity')
  })

  it('throws an error if guests is less than 1, NaN, or non-integer', () => {
    expect(() => {
      calculateStayRates({ suiteId: 's1', checkInIso: '2027-04-10T12:00:00Z', checkOutIso: '2027-04-11T12:00:00Z', guests: 0, season: 'baixa' })
    }).toThrow('must be an integer')

    expect(() => {
      calculateStayRates({ suiteId: 's1', checkInIso: '2027-04-10T12:00:00Z', checkOutIso: '2027-04-11T12:00:00Z', guests: -1, season: 'baixa' })
    }).toThrow('must be an integer')

    expect(() => {
      calculateStayRates({ suiteId: 's1', checkInIso: '2027-04-10T12:00:00Z', checkOutIso: '2027-04-11T12:00:00Z', guests: NaN, season: 'baixa' })
    }).toThrow('must be an integer')

    expect(() => {
      calculateStayRates({ suiteId: 's1', checkInIso: '2027-04-10T12:00:00Z', checkOutIso: '2027-04-11T12:00:00Z', guests: 1.5, season: 'baixa' })
    }).toThrow('must be an integer')
  })

  it('throws an error on invalid season', () => {
    expect(() => {
      calculateStayRates({
        suiteId: 's1',
        checkInIso: '2027-04-10T12:00:00Z',
        checkOutIso: '2027-04-11T12:00:00Z',
        guests: 2,
        season: 'invalid' as any
      })
    }).toThrow('Invalid season')
  })

  it('throws an error on invalid date in checkIn or checkOut', () => {
    expect(() => {
      calculateStayRates({ suiteId: 's1', checkInIso: 'invalid', checkOutIso: '2027-04-11T12:00:00Z', guests: 1, season: 'baixa' })
    }).toThrow('Invalid date format')

    expect(() => {
      calculateStayRates({ suiteId: 's1', checkInIso: '2027-04-10T12:00:00Z', checkOutIso: 'invalid', guests: 1, season: 'baixa' })
    }).toThrow('Invalid date format')
  })
})
