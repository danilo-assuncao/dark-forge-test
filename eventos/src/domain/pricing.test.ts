import { describe, it, expect } from 'vitest'
import { calculateTicketsOrder } from './pricing'
import type { SectorTier, BatchNumber, TicketBenefitType } from '../types'

describe('calculateTicketsOrder', () => {
  it('calculates properly for "pista", "lote 1", "inteira" (baseline event 1)', () => {
    const result = calculateTicketsOrder({
      items: [{ eventId: '1', quantity: 2 }],
      deliveryMethod: 'bilheteria'
    })
    
    expect(result.subtotal).toBe(600)
    expect(result.discount).toBe(0)
    expect(result.fee).toBe(0)
    expect(result.total).toBe(600)
  })

  it('calculates properly for "vip", "lote 2", "estudante" (meia) (baseline event 2)', () => {
    const result = calculateTicketsOrder({
      items: [{ eventId: '2', quantity: 1 }],
      deliveryMethod: 'digital'
    })
    
    expect(result.subtotal).toBe(414)
    expect(result.discount).toBe(0)
    expect(result.fee).toBe(41.4)
    expect(result.total).toBe(455.4)
  })

  it('calculates properly for "camarote", "lote 3", "inteira" (baseline event 3)', () => {
    const result = calculateTicketsOrder({
      items: [{ eventId: '3', quantity: 1 }],
      deliveryMethod: 'bilheteria',
      coupon: 'DANSHOW10'
    })
    
    expect(result.subtotal).toBe(1950)
    expect(result.discount).toBe(195)
    expect(result.fee).toBe(0)
    expect(result.total).toBe(1755)
  })

  it('allows overriding parameters for an event', () => {
    const result = calculateTicketsOrder({
      items: [{
        eventId: '1',
        quantity: 2,
        sector: 'vip',
        batch: 2,
        benefit: 'estudante'
      }],
      deliveryMethod: 'digital',
      coupon: 'DANSHOW10'
    })
    
    expect(result.subtotal).toBe(552)
    expect(result.discount).toBe(55.2)
    expect(result.fee).toBe(49.68)
    expect(result.total).toBe(546.48)
  })

  it('handles other "meia-entrada" benefits individually', () => {
    const result = calculateTicketsOrder({
      items: [
        { eventId: '1', quantity: 1, benefit: 'idoso' },
        { eventId: '1', quantity: 1, benefit: 'social' }
      ],
      deliveryMethod: 'bilheteria'
    })
    expect(result.subtotal).toBe(300)
    expect(result.total).toBe(300)
  })

  it('throws an error if event is not found', () => {
    expect(() => calculateTicketsOrder({
      items: [{ eventId: '999', quantity: 1 }],
      deliveryMethod: 'bilheteria'
    })).toThrowError('Event not found: 999')
  })

  it('throws an error for zero or negative quantity', () => {
    expect(() => calculateTicketsOrder({
      items: [{ eventId: '1', quantity: 0 }],
      deliveryMethod: 'bilheteria'
    })).toThrowError('Invalid quantity: 0')

    expect(() => calculateTicketsOrder({
      items: [{ eventId: '1', quantity: -1 }],
      deliveryMethod: 'bilheteria'
    })).toThrowError('Invalid quantity: -1')
  })
  
  it('throws an error if items array is empty', () => {
    expect(() => calculateTicketsOrder({
      items: [],
      deliveryMethod: 'bilheteria'
    })).toThrowError('Order must contain at least one item')
  })

  it('applies no discount for an unknown or invalid coupon', () => {
    const result = calculateTicketsOrder({
      items: [{ eventId: '1', quantity: 1 }],
      deliveryMethod: 'bilheteria',
      coupon: 'INVALIDCOUPON'
    })
    expect(result.discount).toBe(0)
    expect(result.subtotal).toBe(300)
    expect(result.total).toBe(300)
  })

  it('throws an error if sector, batch, or benefit overrides are invalid', () => {
    expect(() => calculateTicketsOrder({
      items: [{ eventId: '1', quantity: 1, sector: 'invalid_sector' as SectorTier }],
      deliveryMethod: 'bilheteria'
    })).toThrowError('Invalid sector: invalid_sector')

    expect(() => calculateTicketsOrder({
      items: [{ eventId: '1', quantity: 1, batch: 9 as BatchNumber }],
      deliveryMethod: 'bilheteria'
    })).toThrowError('Invalid batch: 9')

    expect(() => calculateTicketsOrder({
      items: [{ eventId: '1', quantity: 1, benefit: 'invalid_benefit' as TicketBenefitType }],
      deliveryMethod: 'bilheteria'
    })).toThrowError('Invalid benefit: invalid_benefit')
  })
})
