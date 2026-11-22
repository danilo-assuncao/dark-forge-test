import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { schedulePropertyVisit, evaluatePurchaseOffer } from './visits'
import type { ScheduleVisitInput, PurchaseOfferInput, VisitType } from './visits'

describe('visits domain', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-20T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('schedulePropertyVisit', () => {
    it('should successfully schedule a presencial visit and return a protocol', () => {
      const input: ScheduleVisitInput = {
        propertyId: '1',
        visitorName: 'John Doe',
        date: '2026-11-25T10:00:00Z',
        visitType: 'presencial'
      }
      
      const result = schedulePropertyVisit(input)
      
      expect(result.success).toBe(true)
      expect(result.protocol).toMatch(/^IMV-\d{4}$/)
      expect(result.message).toBe('Visit scheduled successfully')
    })

    it('should successfully schedule a videochamada visit and return a protocol', () => {
      const input: ScheduleVisitInput = {
        propertyId: '2',
        visitorName: 'Jane Doe',
        date: '2026-11-26T14:30:00Z',
        visitType: 'videochamada'
      }
      
      const result = schedulePropertyVisit(input)
      
      expect(result.success).toBe(true)
      expect(result.protocol).toMatch(/^IMV-\d{4}$/)
      expect(result.message).toBe('Visit scheduled successfully')
    })

    it('should fail if property does not exist', () => {
      const input: ScheduleVisitInput = {
        propertyId: '999',
        visitorName: 'John Doe',
        date: '2026-11-25T10:00:00Z',
        visitType: 'presencial'
      }
      
      const result = schedulePropertyVisit(input)
      
      expect(result.success).toBe(false)
      expect(result.protocol).toBeUndefined()
      expect(result.message).toBe('Property not found')
    })

    it('should fail if visit type is invalid', () => {
      const input: ScheduleVisitInput = {
        propertyId: '1',
        visitorName: 'John Doe',
        date: '2026-11-25T10:00:00Z',
        visitType: 'invalid' as VisitType
      }
      
      const result = schedulePropertyVisit(input)
      
      expect(result.success).toBe(false)
      expect(result.protocol).toBeUndefined()
      expect(result.message).toBe('Invalid visit type')
    })

    it('should fail if visitor name is empty', () => {
      const input: ScheduleVisitInput = {
        propertyId: '1',
        visitorName: '   ',
        date: '2026-11-25T10:00:00Z',
        visitType: 'presencial'
      }
      
      const result = schedulePropertyVisit(input)
      
      expect(result.success).toBe(false)
      expect(result.protocol).toBeUndefined()
      expect(result.message).toBe('Invalid visitor name')
    })

    it('should fail if date is invalid', () => {
      const input: ScheduleVisitInput = {
        propertyId: '1',
        visitorName: 'John Doe',
        date: 'invalid-date',
        visitType: 'presencial'
      }
      
      const result = schedulePropertyVisit(input)
      
      expect(result.success).toBe(false)
      expect(result.protocol).toBeUndefined()
      expect(result.message).toBe('Invalid or past visit date')
    })

    it('should fail if date is in the past', () => {
      const input: ScheduleVisitInput = {
        propertyId: '1',
        visitorName: 'John Doe',
        date: '2026-11-19T10:00:00Z', // Before mocked time
        visitType: 'presencial'
      }
      
      const result = schedulePropertyVisit(input)
      
      expect(result.success).toBe(false)
      expect(result.protocol).toBeUndefined()
      expect(result.message).toBe('Invalid or past visit date')
    })
  })

  describe('evaluatePurchaseOffer', () => {
    it('should apply 5% discount for a-vista payment with DANHOME5 coupon', () => {
      // Property 1 has priceBrl: 450000
      const input: PurchaseOfferInput = {
        propertyId: '1',
        paymentMethod: 'a-vista',
        coupon: 'DANHOME5'
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(true)
      expect(result.propertyId).toBe('1')
      expect(result.originalPriceBrl).toBe(450000)
      expect(result.discountApplied).toBe(22500) // 5% of 450000
      expect(result.finalPriceBrl).toBe(427500)
      expect(result.message).toBe('Offer evaluated successfully')
    })
    
    it('should apply 5% discount for a-vista payment with lowercase padded coupon', () => {
      // Property 1 has priceBrl: 450000
      const input: PurchaseOfferInput = {
        propertyId: '1',
        paymentMethod: 'a-vista',
        coupon: ' danhome5 '
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(true)
      expect(result.discountApplied).toBe(22500) // 5% of 450000
    })

    it('should properly round monetary discounts to cents', () => {
      const input: PurchaseOfferInput = {
        propertyId: '1',
        paymentMethod: 'a-vista',
        coupon: 'DANHOME5',
        offeredPriceBrl: 123457 // 5% is 6172.85
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(true)
      expect(result.originalPriceBrl).toBe(123457)
      expect(result.discountApplied).toBe(6172.85) 
      expect(result.finalPriceBrl).toBe(117284.15)
    })

    it('should not apply discount for financiado payment even with DANHOME5 coupon', () => {
      const input: PurchaseOfferInput = {
        propertyId: '1',
        paymentMethod: 'financiado',
        coupon: 'DANHOME5'
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(true)
      expect(result.originalPriceBrl).toBe(450000)
      expect(result.discountApplied).toBe(0)
      expect(result.finalPriceBrl).toBe(450000)
    })

    it('should not apply discount for a-vista payment without DANHOME5 coupon', () => {
      const input: PurchaseOfferInput = {
        propertyId: '1',
        paymentMethod: 'a-vista',
        coupon: 'OTHERCOUPON'
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(true)
      expect(result.originalPriceBrl).toBe(450000)
      expect(result.discountApplied).toBe(0)
      expect(result.finalPriceBrl).toBe(450000)
    })

    it('should apply discount on offered price if provided', () => {
      const input: PurchaseOfferInput = {
        propertyId: '1',
        paymentMethod: 'a-vista',
        coupon: 'DANHOME5',
        offeredPriceBrl: 400000
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(true)
      expect(result.originalPriceBrl).toBe(400000)
      expect(result.discountApplied).toBe(20000) // 5% of 400000
      expect(result.finalPriceBrl).toBe(380000)
    })

    it('should fail if offered price is invalid (negative)', () => {
      const input: PurchaseOfferInput = {
        propertyId: '1',
        paymentMethod: 'a-vista',
        offeredPriceBrl: -10000
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid offered price')
    })
    
    it('should fail if offered price is invalid (zero)', () => {
      const input: PurchaseOfferInput = {
        propertyId: '1',
        paymentMethod: 'a-vista',
        offeredPriceBrl: 0
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Invalid offered price')
    })

    it('should fail if property does not exist', () => {
      const input: PurchaseOfferInput = {
        propertyId: '999',
        paymentMethod: 'a-vista'
      }

      const result = evaluatePurchaseOffer(input)

      expect(result.success).toBe(false)
      expect(result.message).toBe('Property not found')
    })
  })
})
