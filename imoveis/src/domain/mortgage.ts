import type { AmortizationSystem } from '../types'

export interface MortgageInput {
  propertyValueBrl: number
  ownResourcesBrl: number
  fgtsBrl: number
  system: AmortizationSystem
  termMonths: 120 | 240 | 360
  monthlyIncomeBrl: number
  annualInterestRate: number
}

export interface MortgageSimulation {
  financedAmountBrl: number
  firstInstallmentBrl: number
  lastInstallmentBrl: number
  incomeApproved: boolean
  downPaymentApproved: boolean
}

export function simulateMortgage(input: MortgageInput): MortgageSimulation {
  const {
    propertyValueBrl,
    ownResourcesBrl,
    fgtsBrl,
    system,
    termMonths,
    monthlyIncomeBrl,
    annualInterestRate
  } = input

  if (
    !Number.isFinite(propertyValueBrl) ||
    !Number.isFinite(ownResourcesBrl) ||
    !Number.isFinite(fgtsBrl) ||
    !Number.isFinite(monthlyIncomeBrl) ||
    !Number.isFinite(annualInterestRate)
  ) {
    throw new Error('Input values must be finite numbers')
  }

  if (
    propertyValueBrl <= 0 ||
    ownResourcesBrl < 0 ||
    fgtsBrl < 0 ||
    monthlyIncomeBrl < 0 ||
    annualInterestRate < 0
  ) {
    throw new Error('Invalid input values: must be non-negative and property value must be positive')
  }

  const totalDownPayment = ownResourcesBrl + fgtsBrl
  const downPaymentApproved = totalDownPayment * 5 >= propertyValueBrl - 0.001

  const financedAmountBrl = Math.max(0, propertyValueBrl - totalDownPayment)
  const monthlyInterestRate = annualInterestRate / 12

  let firstInstallmentBrl = 0
  let lastInstallmentBrl = 0

  if (financedAmountBrl > 0 && monthlyInterestRate > 0) {
    if (system === 'SAC') {
      const amortization = financedAmountBrl / termMonths
      firstInstallmentBrl = amortization + (financedAmountBrl * monthlyInterestRate)
      lastInstallmentBrl = amortization + (amortization * monthlyInterestRate)
    } else if (system === 'PRICE') {
      const i = monthlyInterestRate
      const n = termMonths
      const pmt = (financedAmountBrl * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
      firstInstallmentBrl = pmt
      lastInstallmentBrl = pmt
    } else {
      const _exhaustiveCheck: never = system
      throw new Error(`Unknown system: ${_exhaustiveCheck}`)
    }
  } else if (financedAmountBrl > 0) {
    // Interest is 0
    if (system === 'SAC' || system === 'PRICE') {
      firstInstallmentBrl = financedAmountBrl / termMonths
      lastInstallmentBrl = financedAmountBrl / termMonths
    } else {
      const _exhaustiveCheck: never = system
      throw new Error(`Unknown system: ${_exhaustiveCheck}`)
    }
  }

  // Use a small epsilon to fix floating point comparison edge cases
  const incomeApproved = firstInstallmentBrl * 10 <= (monthlyIncomeBrl * 3) + 0.001

  return {
    financedAmountBrl,
    firstInstallmentBrl,
    lastInstallmentBrl,
    incomeApproved,
    downPaymentApproved
  }
}
