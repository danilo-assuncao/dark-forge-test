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

  const totalDownPayment = ownResourcesBrl + fgtsBrl
  const minDownPayment = propertyValueBrl * 0.2
  const downPaymentApproved = totalDownPayment >= minDownPayment

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
    }
  } else if (financedAmountBrl > 0) {
    // Interest is 0
    firstInstallmentBrl = financedAmountBrl / termMonths
    lastInstallmentBrl = financedAmountBrl / termMonths
  }

  const incomeApproved = firstInstallmentBrl <= monthlyIncomeBrl * 0.3

  return {
    financedAmountBrl,
    firstInstallmentBrl,
    lastInstallmentBrl,
    incomeApproved,
    downPaymentApproved
  }
}
