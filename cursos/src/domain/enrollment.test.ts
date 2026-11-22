import { describe, it, expect } from 'vitest'
import { quoteEnrollment } from './enrollment'

describe('quoteEnrollment', () => {
  it('should apply 25% discount for 2 or more tracks in passaporte modality', () => {
    const result = quoteEnrollment({
      trackIds: ['t1', 't2'],
      modality: 'passaporte',
      basePricePerTrack: 1000
    })
    
    expect(result.totalOriginal).toBe(2000)
    expect(result.totalDiscount).toBe(500) // 25% of 2000
    expect(result.totalFinal).toBe(1500)
    expect(result.appliedDiscounts).toContain('PASSAPORTE_25')
  })

  it('should not apply 25% discount for less than 2 tracks in passaporte modality', () => {
    const result = quoteEnrollment({
      trackIds: ['t1'],
      modality: 'passaporte',
      basePricePerTrack: 1000
    })
    
    expect(result.totalOriginal).toBe(1000)
    expect(result.totalDiscount).toBe(0)
    expect(result.totalFinal).toBe(1000)
    expect(result.appliedDiscounts).toHaveLength(0)
  })

  it('should apply 15% discount for student scholarship in avulsa modality', () => {
    const result = quoteEnrollment({
      trackIds: ['t1'],
      modality: 'avulsa',
      isStudentScholarship: true,
      basePricePerTrack: 1000
    })
    
    expect(result.totalOriginal).toBe(1000)
    expect(result.totalDiscount).toBe(150) // 15% of 1000
    expect(result.totalFinal).toBe(850)
    expect(result.appliedDiscounts).toContain('STUDENT_15')
  })

  it('should apply 20% discount for DANEDU20 coupon in avulsa modality', () => {
    const result = quoteEnrollment({
      trackIds: ['t1'],
      modality: 'avulsa',
      coupon: 'DANEDU20',
      basePricePerTrack: 1000
    })
    
    expect(result.totalOriginal).toBe(1000)
    expect(result.totalDiscount).toBe(200) // 20% of 1000
    expect(result.totalFinal).toBe(800)
    expect(result.appliedDiscounts).toContain('COUPON_DANEDU20')
  })

  it('should stack student scholarship and coupon discounts in avulsa modality', () => {
    const result = quoteEnrollment({
      trackIds: ['t1'],
      modality: 'avulsa',
      isStudentScholarship: true,
      coupon: 'DANEDU20',
      basePricePerTrack: 1000
    })
    
    expect(result.totalOriginal).toBe(1000)
    expect(result.totalDiscount).toBe(350) // 15% + 20% = 35% of 1000
    expect(result.totalFinal).toBe(650)
    expect(result.appliedDiscounts).toContain('STUDENT_15')
    expect(result.appliedDiscounts).toContain('COUPON_DANEDU20')
  })

  it('should not apply student or coupon discounts in passaporte modality', () => {
    const result = quoteEnrollment({
      trackIds: ['t1', 't2'],
      modality: 'passaporte',
      isStudentScholarship: true,
      coupon: 'DANEDU20',
      basePricePerTrack: 1000
    })
    
    // Only passaporte discount applies (25%)
    expect(result.totalOriginal).toBe(2000)
    expect(result.totalDiscount).toBe(500)
    expect(result.totalFinal).toBe(1500)
    expect(result.appliedDiscounts).toContain('PASSAPORTE_25')
    expect(result.appliedDiscounts).not.toContain('STUDENT_15')
    expect(result.appliedDiscounts).not.toContain('COUPON_DANEDU20')
  })

  it('should not apply 20% discount for invalid coupon in avulsa modality', () => {
    const result = quoteEnrollment({
      trackIds: ['t1'],
      modality: 'avulsa',
      coupon: 'INVALID',
      basePricePerTrack: 1000
    })
    
    expect(result.totalDiscount).toBe(0)
    expect(result.totalFinal).toBe(1000)
  })

  it('should throw an error for an invalid track id', () => {
    expect(() => {
      quoteEnrollment({
        trackIds: ['invalid-track'],
        modality: 'avulsa'
      })
    }).toThrow('Track with id invalid-track not found')
  })
})
