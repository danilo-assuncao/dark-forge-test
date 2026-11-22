import { describe, it, expect } from 'vitest'
import { buildTravelPackageQuote } from './packages'

describe('buildTravelPackageQuote', () => {
  it('should calculate quote for 1 traveler in economica', () => {
    // Rio de Janeiro has id '1', price 1500, available: ['economica', 'executiva'], excursions: [{ id: 'e1', price: 150 }]
    const quote = buildTravelPackageQuote({
      destinationId: '1',
      travelers: 1,
      cabinClass: 'economica',
      hotelDays: 3,
      hotelDailyRate: 300,
      extraBaggageCount: 1,
      extraBaggageUnitRate: 100,
      selectedExcursionIds: ['e1']
    })

    expect(quote).toEqual({
      destinationId: '1',
      travelers: 1,
      airfareTotal: 1500 * 1 * 1, // 1500
      hotelTotal: 3 * 300, // 900
      baggageTotal: 1 * 100, // 100
      excursionsTotal: 150 * 1, // 150
      subtotal: 1500 + 900 + 100 + 150, // 2650
      discount: 0,
      total: 2650
    })
  })

  it('should calculate quote for 2 travelers in executiva', () => {
    const quote = buildTravelPackageQuote({
      destinationId: '2', // Paris: 5000 base, excursions: e2 (300)
      travelers: 2,
      cabinClass: 'executiva',
      hotelDays: 5,
      hotelDailyRate: 800,
      extraBaggageCount: 2,
      extraBaggageUnitRate: 250,
      selectedExcursionIds: ['e2']
    })

    const airfareTotal = 5000 * 2.2 * 2 // 22000
    const hotelTotal = 5 * 800 // 4000
    const baggageTotal = 2 * 250 // 500
    const excursionsTotal = 300 * 2 // 600
    const subtotal = airfareTotal + hotelTotal + baggageTotal + excursionsTotal // 27100

    expect(quote).toEqual({
      destinationId: '2',
      travelers: 2,
      airfareTotal,
      hotelTotal,
      baggageTotal,
      excursionsTotal,
      subtotal,
      discount: 0,
      total: subtotal
    })
  })

  it('should apply 8% discount for 4 or more travelers', () => {
    const quote = buildTravelPackageQuote({
      destinationId: '1',
      travelers: 4,
      cabinClass: 'economica',
      hotelDays: 4,
      hotelDailyRate: 200,
      extraBaggageCount: 0,
      extraBaggageUnitRate: 0,
      selectedExcursionIds: []
    })

    const airfareTotal = 1500 * 4 // 6000
    const hotelTotal = 4 * 200 // 800
    const baggageTotal = 0
    const excursionsTotal = 0
    const subtotal = airfareTotal + hotelTotal + baggageTotal + excursionsTotal // 6800
    const discount = subtotal * 0.08 // 544
    const total = subtotal - discount // 6256

    expect(quote).toEqual({
      destinationId: '1',
      travelers: 4,
      airfareTotal,
      hotelTotal,
      baggageTotal,
      excursionsTotal,
      subtotal,
      discount,
      total
    })
  })

  it('should apply 8% discount for 5 travelers', () => {
    const quote = buildTravelPackageQuote({
      destinationId: '1',
      travelers: 5,
      cabinClass: 'economica',
      hotelDays: 2,
      hotelDailyRate: 200,
      extraBaggageCount: 0,
      extraBaggageUnitRate: 0,
      selectedExcursionIds: []
    })

    const subtotal = 1500 * 5 + 2 * 200 // 7900
    const discount = 7900 * 0.08 // 632

    expect(quote.discount).toBe(discount)
    expect(quote.total).toBe(subtotal - discount)
  })

  it('should throw an error if travelers < 1', () => {
    expect(() => {
      buildTravelPackageQuote({
        destinationId: '1',
        travelers: 0,
        cabinClass: 'economica',
        hotelDays: 1,
        hotelDailyRate: 100,
        extraBaggageCount: 0,
        extraBaggageUnitRate: 0,
        selectedExcursionIds: []
      })
    }).toThrow('Number of travelers must be at least 1')
  })

  it('should throw an error if destination is not found', () => {
    expect(() => {
      buildTravelPackageQuote({
        destinationId: '999',
        travelers: 1,
        cabinClass: 'economica',
        hotelDays: 1,
        hotelDailyRate: 100,
        extraBaggageCount: 0,
        extraBaggageUnitRate: 0,
        selectedExcursionIds: []
      })
    }).toThrow('Destination with id 999 not found')
  })

  it('should throw an error if excursion is not found', () => {
    expect(() => {
      buildTravelPackageQuote({
        destinationId: '1',
        travelers: 1,
        cabinClass: 'economica',
        hotelDays: 1,
        hotelDailyRate: 100,
        extraBaggageCount: 0,
        extraBaggageUnitRate: 0,
        selectedExcursionIds: ['e999']
      })
    }).toThrow('Excursion with id e999 not found in destination 1')
  })
})
