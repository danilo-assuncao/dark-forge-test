import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateFreightQuote } from './freight'
import * as zones from '../data/zones'

vi.mock('../data/zones', () => ({
  findRoute: vi.fn()
}))

describe('calculateFreightQuote', () => {
  beforeEach(() => {
    vi.mocked(zones.findRoute).mockImplementation((originUf, destUf) => {
      const origin = originUf.toUpperCase()
      const dest = destUf.toUpperCase()
      if (origin === 'SP' && dest === 'RJ') return { originUf: 'SP', destUf: 'RJ', baseCost: 50, estimatedDays: 2 }
      if (origin === 'SP' && dest === 'SP') return { originUf: 'SP', destUf: 'SP', baseCost: 20, estimatedDays: 1 }
      return undefined
    })
  })

  it('should calculate freight correctly when actual weight is higher than volumetric weight', () => {
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
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 10,
      lengthCm: 60,
      widthCm: 50,
      heightCm: 40,
      declaredValueBrl: 2000.55,
      quantity: 1
    })

    expect(result.volumetricWeightKg).toBe(20)
    expect(result.billableWeightKg).toBe(20)
    expect(result.baseFreight).toBe(1000)
    expect(result.adValoremCost).toBe(16.00) // 2000.55 * 0.008 = 16.0044 -> 16
    expect(result.totalFreight).toBe(1016)
  })
  
  it('should handle equal volumetric and actual weight', () => {
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 1,
      lengthCm: 60,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 1
    })

    expect(result.volumetricWeightKg).toBe(1)
    expect(result.billableWeightKg).toBe(1)
    expect(result.baseFreight).toBe(50)
  })

  it('should apply corporate discount when quantity is >= 5', () => {
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

    expect(result.baseFreight).toBe(200)
    expect(result.corporateDiscount).toBe(20)
    expect(result.totalFreight).toBe(188)
  })
  
  it('should NOT apply corporate discount when quantity is 4 (boundary test)', () => {
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'SP',
      actualWeightKg: 2,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 4
    })

    expect(result.baseFreight).toBe(160)
    expect(result.corporateDiscount).toBe(0)
    expect(result.totalFreight).toBe(168) // 160 + 8
  })

  it('should apply DANCARGO10 coupon correctly and generate shipping label', () => {
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
  
  it('should not apply discount for invalid coupon', () => {
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 1,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 1,
      coupon: 'INVALID'
    })

    expect(result.couponDiscount).toBe(0)
    expect(result.shippingLabel).toBeUndefined()
    expect(result.totalFreight).toBe(58)
  })

  it('should not apply discount for lowercased coupon', () => {
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 1,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 1,
      coupon: 'dancargo10'
    })

    expect(result.couponDiscount).toBe(0)
    expect(result.shippingLabel).toBeUndefined()
  })

  it('should stack corporate and coupon discounts', () => {
    const result = calculateFreightQuote({
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 1,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 5,
      coupon: 'DANCARGO10'
    })

    expect(result.baseFreight).toBe(250)
    expect(result.corporateDiscount).toBe(25)
    expect(result.couponDiscount).toBe(25)
    expect(result.totalFreight).toBe(208)
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
    }).toThrow('Rota não encontrada para XX até YY.')
  })
  
  it('should validate inputs: reject negative or zero weights and dimensions', () => {
    expect(() => {
      calculateFreightQuote({ originUf: 'SP', destUf: 'RJ', actualWeightKg: -1, lengthCm: 10, widthCm: 10, heightCm: 10, declaredValueBrl: 100, quantity: 1 })
    }).toThrow('Peso e dimensões devem ser números positivos.')
    expect(() => {
      calculateFreightQuote({ originUf: 'SP', destUf: 'RJ', actualWeightKg: 1, lengthCm: 0, widthCm: 10, heightCm: 10, declaredValueBrl: 100, quantity: 1 })
    }).toThrow('Peso e dimensões devem ser números positivos.')
  })

  it('should validate inputs: reject NaN or Infinity dimensions', () => {
    expect(() => {
      calculateFreightQuote({ originUf: 'SP', destUf: 'RJ', actualWeightKg: 1, lengthCm: NaN, widthCm: 10, heightCm: 10, declaredValueBrl: 100, quantity: 1 })
    }).toThrow('Peso e dimensões devem ser números positivos.')
    expect(() => {
      calculateFreightQuote({ originUf: 'SP', destUf: 'RJ', actualWeightKg: 1, lengthCm: 10, widthCm: 10, heightCm: Infinity, declaredValueBrl: 100, quantity: 1 })
    }).toThrow('Peso e dimensões devem ser números positivos.')
  })

  it('should validate inputs: reject invalid quantity', () => {
    expect(() => {
      calculateFreightQuote({ originUf: 'SP', destUf: 'RJ', actualWeightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10, declaredValueBrl: 100, quantity: 0 })
    }).toThrow('A quantidade deve ser um número inteiro positivo.')
    expect(() => {
      calculateFreightQuote({ originUf: 'SP', destUf: 'RJ', actualWeightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10, declaredValueBrl: 100, quantity: 1.5 })
    }).toThrow('A quantidade deve ser um número inteiro positivo.')
  })

  it('should validate inputs: reject negative declared value', () => {
    expect(() => {
      calculateFreightQuote({ originUf: 'SP', destUf: 'RJ', actualWeightKg: 1, lengthCm: 10, widthCm: 10, heightCm: 10, declaredValueBrl: -10, quantity: 1 })
    }).toThrow('O valor declarado deve ser um número não-negativo.')
  })

  it('should apply mode multiplier correctly (default, expresso, aereo-proximo-dia) and combine with discounts', () => {
    const input = {
      originUf: 'SP',
      destUf: 'RJ',
      actualWeightKg: 10,
      lengthCm: 10,
      widthCm: 10,
      heightCm: 10,
      declaredValueBrl: 1000,
      quantity: 5,
      coupon: 'DANCARGO10'
    }

    const resultEco = calculateFreightQuote(input)
    expect(resultEco.baseFreight).toBe(2500)
    expect(resultEco.corporateDiscount).toBe(250)
    expect(resultEco.couponDiscount).toBe(250)
    expect(resultEco.totalFreight).toBe(2008)

    const resultExp = calculateFreightQuote({ ...input, mode: 'expresso' })
    expect(resultExp.baseFreight).toBe(3750)
    expect(resultExp.totalFreight).toBe(3008)

    const resultAer = calculateFreightQuote({ ...input, mode: 'aereo-proximo-dia' })
    expect(resultAer.baseFreight).toBe(6250)
    expect(resultAer.totalFreight).toBe(5008)
  })
})
