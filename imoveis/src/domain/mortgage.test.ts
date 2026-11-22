import { describe, it, expect } from 'vitest'
import { simulateMortgage, type MortgageInput } from './mortgage'

describe('Mortgage Simulator', () => {
  it('should deny down payment if less than 20% of property value', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 50000,
      fgtsBrl: 40000, // total 90k, min is 100k
      system: 'SAC',
      termMonths: 360,
      monthlyIncomeBrl: 15000,
      annualInterestRate: 0.1
    }

    const result = simulateMortgage(input)
    expect(result.downPaymentApproved).toBe(false)
  })

  it('should approve down payment if exactly 20%', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 60000,
      fgtsBrl: 40000, // total 100k, min is 100k
      system: 'SAC',
      termMonths: 360,
      monthlyIncomeBrl: 15000,
      annualInterestRate: 0.1
    }

    const result = simulateMortgage(input)
    expect(result.downPaymentApproved).toBe(true)
    expect(result.financedAmountBrl).toBe(400000)
  })

  it('should approve down payment if more than 20%', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 150000,
      fgtsBrl: 0,
      system: 'PRICE',
      termMonths: 120,
      monthlyIncomeBrl: 10000,
      annualInterestRate: 0.1
    }

    const result = simulateMortgage(input)
    expect(result.downPaymentApproved).toBe(true)
    expect(result.financedAmountBrl).toBe(350000)
  })

  it('should calculate SAC installments correctly', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 100000,
      fgtsBrl: 0,
      system: 'SAC',
      termMonths: 120, // 10 years
      monthlyIncomeBrl: 20000,
      annualInterestRate: 0.12 // 1% per month
    }

    const result = simulateMortgage(input)
    const financed = 400000
    const amort = 400000 / 120 // 3333.33
    const monthlyInterestRate = 0.01 // 12% / 12

    const expectedFirst = amort + (financed * monthlyInterestRate) // 3333.33 + 4000 = 7333.33
    const expectedLast = amort + (amort * monthlyInterestRate) // 3333.33 + 33.33 = 3366.66

    expect(result.firstInstallmentBrl).toBeCloseTo(expectedFirst, 2)
    expect(result.lastInstallmentBrl).toBeCloseTo(expectedLast, 2)
  })

  it('should calculate PRICE installments correctly', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 100000,
      fgtsBrl: 0,
      system: 'PRICE',
      termMonths: 120, // 10 years
      monthlyIncomeBrl: 20000,
      annualInterestRate: 0.12 // 1% per month
    }

    const result = simulateMortgage(input)
    const financed = 400000
    const i = 0.01
    const n = 120

    const expectedPmt = (financed * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)

    expect(result.firstInstallmentBrl).toBeCloseTo(expectedPmt, 2)
    expect(result.lastInstallmentBrl).toBeCloseTo(expectedPmt, 2)
  })

  it('should deny income if first installment is more than 30% of monthly income', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 100000,
      fgtsBrl: 0,
      system: 'SAC',
      termMonths: 120, // first install ~ 7333.33
      monthlyIncomeBrl: 20000, // 30% is 6000
      annualInterestRate: 0.12
    }

    const result = simulateMortgage(input)
    expect(result.incomeApproved).toBe(false)
  })

  it('should approve income if first installment is exactly 30% of monthly income', () => {
    // We want first install to be exactly 30% of income.
    // Let's set monthly income to firstInstallment / 0.3
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 100000,
      fgtsBrl: 0,
      system: 'SAC',
      termMonths: 120, // first install = 7333.333333333333
      monthlyIncomeBrl: (400000 / 120 + 4000) / 0.3, // ~24444.444
      annualInterestRate: 0.12
    }

    const result = simulateMortgage(input)
    expect(result.incomeApproved).toBe(true)
  })

  it('should approve income if first installment is less than 30% of monthly income', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 100000,
      fgtsBrl: 0,
      system: 'SAC',
      termMonths: 120, // first install ~ 7333.33
      monthlyIncomeBrl: 25000, // 30% is 7500
      annualInterestRate: 0.12
    }

    const result = simulateMortgage(input)
    expect(result.incomeApproved).toBe(true)
  })

  it('should handle zero interest rate gracefully (SAC)', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 100000,
      fgtsBrl: 0,
      system: 'SAC',
      termMonths: 120,
      monthlyIncomeBrl: 20000,
      annualInterestRate: 0
    }

    const result = simulateMortgage(input)
    const expected = 400000 / 120
    expect(result.firstInstallmentBrl).toBeCloseTo(expected, 2)
    expect(result.lastInstallmentBrl).toBeCloseTo(expected, 2)
  })

  it('should handle zero interest rate gracefully (PRICE)', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 100000,
      fgtsBrl: 0,
      system: 'PRICE',
      termMonths: 120,
      monthlyIncomeBrl: 20000,
      annualInterestRate: 0
    }

    const result = simulateMortgage(input)
    const expected = 400000 / 120
    expect(result.firstInstallmentBrl).toBeCloseTo(expected, 2)
    expect(result.lastInstallmentBrl).toBeCloseTo(expected, 2)
  })

  it('should handle fully financed-off property (financed = 0)', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 500000,
      fgtsBrl: 0,
      system: 'SAC',
      termMonths: 120,
      monthlyIncomeBrl: 10000,
      annualInterestRate: 0.1
    }

    const result = simulateMortgage(input)
    expect(result.financedAmountBrl).toBe(0)
    expect(result.firstInstallmentBrl).toBe(0)
    expect(result.lastInstallmentBrl).toBe(0)
    expect(result.incomeApproved).toBe(true)
    expect(result.downPaymentApproved).toBe(true)
  })

  it('should deny if both down payment and income are insufficient', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 50000,
      fgtsBrl: 0, // total 50k, less than 100k
      system: 'SAC',
      termMonths: 120,
      monthlyIncomeBrl: 10000, // 30% = 3000
      annualInterestRate: 0.12 // install > 7000
    }

    const result = simulateMortgage(input)
    expect(result.downPaymentApproved).toBe(false)
    expect(result.incomeApproved).toBe(false)
  })

  it('should throw on negative inputs', () => {
    const input: MortgageInput = {
      propertyValueBrl: 500000,
      ownResourcesBrl: -10000,
      fgtsBrl: 0,
      system: 'SAC',
      termMonths: 120,
      monthlyIncomeBrl: 20000,
      annualInterestRate: 0.12
    }

    expect(() => simulateMortgage(input)).toThrow('Invalid input values')
  })

  it('should throw on zero or negative property value', () => {
    const input: MortgageInput = {
      propertyValueBrl: 0,
      ownResourcesBrl: 10000,
      fgtsBrl: 0,
      system: 'SAC',
      termMonths: 120,
      monthlyIncomeBrl: 20000,
      annualInterestRate: 0.12
    }

    expect(() => simulateMortgage(input)).toThrow('Invalid input values')
  })

  it('should throw on invalid system at runtime', () => {
    const input = {
      propertyValueBrl: 500000,
      ownResourcesBrl: 100000,
      fgtsBrl: 0,
      system: 'UNKNOWN' as any,
      termMonths: 120,
      monthlyIncomeBrl: 20000,
      annualInterestRate: 0.12
    }

    expect(() => simulateMortgage(input as MortgageInput)).toThrow('Unknown system')
  })
})
