import { describe, it, expect } from 'vitest'
import { calculateTicketsOrder } from './pricing'

describe('calculateTicketsOrder', () => {
  it('calculates properly for "pista", "lote 1", "inteira" (baseline event 1)', () => {
    // Event 1 base: price 300, pista (1x), batch 1 (1x), inteira (1x) => 300
    const result = calculateTicketsOrder({
      items: [{ eventId: '1', quantity: 2 }],
      deliveryMethod: 'bilheteria'
    })
    
    // 300 * 2 = 600
    expect(result.subtotal).toBe(600)
    expect(result.discount).toBe(0)
    expect(result.fee).toBe(0) // bilheteria isenta
    expect(result.total).toBe(600)
  })

  it('calculates properly for "vip", "lote 2", "estudante" (meia) (baseline event 2)', () => {
    // Event 2 base: price 450, vip (1.6x), batch 2 (1.15x), estudante (0.5x) => 450 * 1.6 * 1.15 * 0.5 = 414
    const result = calculateTicketsOrder({
      items: [{ eventId: '2', quantity: 1 }],
      deliveryMethod: 'digital'
    })
    
    expect(result.subtotal).toBeCloseTo(414)
    expect(result.discount).toBe(0)
    expect(result.fee).toBeCloseTo(41.4) // 10% fee
    expect(result.total).toBeCloseTo(455.4)
  })

  it('calculates properly for "camarote", "lote 3", "inteira" (baseline event 3)', () => {
    // Event 3 base: price 600, camarote (2.5x), batch 3 (1.30x), inteira (1x) => 600 * 2.5 * 1.3 = 1950
    const result = calculateTicketsOrder({
      items: [{ eventId: '3', quantity: 1 }],
      deliveryMethod: 'bilheteria',
      coupon: 'DANSHOW10'
    })
    
    expect(result.subtotal).toBe(1950)
    expect(result.discount).toBe(195) // 10% de 1950
    expect(result.fee).toBe(0)
    expect(result.total).toBe(1755)
  })

  it('allows overriding parameters for an event', () => {
    // Event 1 base price is 300. Let's override to: vip, lote 2, estudante
    // Face value = 300 * 1.6 (vip) * 1.15 (batch 2) = 552
    // Estudante (meia) = 552 * 0.5 = 276
    const result = calculateTicketsOrder({
      items: [{
        eventId: '1',
        quantity: 2, // 276 * 2 = 552
        sector: 'vip',
        batch: 2,
        benefit: 'estudante'
      }],
      deliveryMethod: 'digital', // taxa 10% on discounted amount
      coupon: 'DANSHOW10' // 10% discount -> 552 * 0.1 = 55.2
    })
    
    expect(result.subtotal).toBe(552)
    expect(result.discount).toBe(55.2)
    // 552 - 55.2 = 496.8
    expect(result.fee).toBeCloseTo(49.68)
    expect(result.total).toBeCloseTo(546.48)
  })

  it('handles other "meia-entrada" benefits', () => {
    const result = calculateTicketsOrder({
      items: [
        { eventId: '1', quantity: 1, benefit: 'idoso' },
        { eventId: '1', quantity: 1, benefit: 'social' }
      ],
      deliveryMethod: 'bilheteria'
    })
    // Base 300, pista (1), batch 1 (1). Face = 300.
    // idoso (0.5) = 150
    // social (0.5) = 150
    // subtotal = 300
    expect(result.subtotal).toBe(300)
    expect(result.total).toBe(300)
  })

  it('throws an error if event is not found', () => {
    expect(() => calculateTicketsOrder({
      items: [{ eventId: '999', quantity: 1 }],
      deliveryMethod: 'bilheteria'
    })).toThrowError('Event not found: 999')
  })
})
