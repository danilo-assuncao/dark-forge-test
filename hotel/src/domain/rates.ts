import { getSuiteById } from '../data/suites'
import type { SuiteItem } from '../types'

export interface RateCalculationInput {
  suiteId: string
  checkInIso: string
  checkOutIso: string
  guests: number
  season: 'baixa' | 'alta'
}

export interface RateCalculationResult {
  nights: number
  baseTotal: number
  extraGuestTotal: number
  subtotal: number
  discountTotal: number
  finalTotal: number
}

const BASE_OCCUPANCY = 2
const EXTRA_GUEST_FEE_PER_NIGHT = 50

export const calculateStayRates = (input: RateCalculationInput): RateCalculationResult => {
  const suite: SuiteItem | undefined = getSuiteById(input.suiteId)
  if (!suite) {
    throw new Error(`Suite not found: ${input.suiteId}`)
  }

  if (input.guests < 1) {
    throw new Error('Number of guests must be at least 1')
  }

  if (input.guests > suite.maxGuests) {
    throw new Error(`Number of guests (${input.guests}) exceeds maximum capacity of the suite (${suite.maxGuests})`)
  }

  const checkIn = new Date(input.checkInIso)
  const checkOut = new Date(input.checkOutIso)

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error('Invalid date format')
  }

  const timeDiff = checkOut.getTime() - checkIn.getTime()
  let nights = Math.round(timeDiff / (1000 * 3600 * 24))
  if (nights < 1) {
    nights = 1
  }

  let nightlyRate = suite.price
  if (input.season === 'alta') {
    nightlyRate = nightlyRate * 1.2
  }

  const baseTotal = nightlyRate * nights

  const extraGuests = Math.max(0, input.guests - BASE_OCCUPANCY)
  const extraGuestTotal = extraGuests * EXTRA_GUEST_FEE_PER_NIGHT * nights

  const subtotal = baseTotal + extraGuestTotal

  let discountTotal = 0
  if (nights >= 5) {
    discountTotal = subtotal * 0.12
  }

  const finalTotal = subtotal - discountTotal

  return {
    nights,
    baseTotal,
    extraGuestTotal,
    subtotal,
    discountTotal,
    finalTotal
  }
}
