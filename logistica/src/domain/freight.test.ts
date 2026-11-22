import { describe, it, expect } from 'vitest'
import { calculateFreightQuote } from './freight'

describe('calculateFreightQuote', () => {
  it('should calculate freight correctly when actual weight is higher than volumetric weight', () => {
    // Volume: 10 * 10 * 10 / 6000 = 1000 / 6000 = 0.166... kg
    // Actual weight: 10 kg
    // Route SP -> RJ, baseCost is 50
    // baseFreight = 50 * 10 * 1 = 500
    // adValorem = 1000 * 0.008 = 8
    // Total: 508
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 10,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 1
    })

    expect(result.volumetricWeightKg).toBeCloseTo(0.1666, 3)
    expect(result.billableWeightKg).toBe(10)
    expect(result.baseFreight).toBe(500)
    expect(result.adValoremCost).toBe(8)
    expect(result.corporateDiscount).toBe(0)
    expect(result.couponDiscount).toBe(0)
    expect(result.totalFreight).toBe(508)
    expect(result.shippingLabel).toBeUndefined()
  })

  it('should calculate freight correctly when volumetric weight is higher', () => {
    // Volume: 60 * 50 * 40 / 6000 = 120000 / 6000 = 20 kg
    // Actual weight: 10 kg
    // Route SP -> RJ, baseCost is 50
    // baseFreight = 50 * 20 * 1 = 1000
    // adValorem = 2000 * 0.008 = 16
    // Total: 1016
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 10,
      lengthCm: 60,
      widthCm: 50,
      heightCm: 40,
      declaredValueBrl: 2000,
      quantity: 1
    })

    expect(result.volumetricWeightKg).toBe(20)
    expect(result.billableWeightKg).toBe(20)
    expect(result.baseFreight).toBe(1000)
    expect(result.adValoremCost).toBe(16)
    expect(result.totalFreight).toBe(1016)
  })

  it('should apply corporate discount when quantity is >= 5', () => {
    // Volume: 10 * 10 * 10 / 6000 = ~0.16kg, actual = 2kg
    // Route SP -> SP, baseCost 20
    // baseFreight = 20 * 2 * 5 = 200
    // adValorem = 1000 * 0.008 = 8
    // corpDiscount = 200 * 0.1 = 20
    // Total = 200 + 8 - 20 = 188
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'SP',
      actualWeightKg: 2,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 5
    })

    expect(result.billableWeightKg).toBe(2)
    expect(result.baseFreight).toBe(200)
    expect(result.corporateDiscount).toBe(20)
    expect(result.totalFreight).toBe(188)
  })

  it('should apply DANCARGO10 coupon correctly and generate shipping label', () => {
    // Route SP -> RJ, baseCost 50
    // actualWeight 1, volume weight tiny -> billable 1
    // qty 1
    // baseFreight = 50 * 1 * 1 = 50
    // adValorem = 1000 * 0.008 = 8
    // coupon = 50 * 0.1 = 5
    // Total = 50 + 8 - 5 = 53
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 1,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 1,
      coupon: 'DANCARGO10'
    })

    expect(result.couponDiscount).toBe(5)
    expect(result.shippingLabel).toBe('CRG-XXXX')
    expect(result.totalFreight).toBe(53)
  })

  it('should throw error for unknown route', () => {
    expect(() => {
      calculateFreightQuote({
        originUf: 'XX',
        destUf: 'YY',
        actualWeightKg: 1,
        lengthCm: 10,
        widthCm: 10,
        heightCm: 10,
        declaredValueBrl: 1000,
        quantity: 1
      })
    }).toThrow('Route not found for XX to YY')
  })
})
