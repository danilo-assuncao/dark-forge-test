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
    throw new Error('Suite not found')
  }

  if (!Number.isInteger(input.guests) || input.guests < 1) {
    throw new Error('Number of guests must be an integer of at least 1')
  }

  if (input.guests > suite.maxGuests) {
    throw new Error('Number of guests exceeds maximum capacity of the suite')
  }

  if (input.season !== 'baixa' && input.season !== 'alta') {
    throw new Error('Invalid season')
  }

  const checkIn = new Date(input.checkInIso)
  const checkOut = new Date(input.checkOutIso)

  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error('Invalid date format')
  }

  const checkInUtc = Date.UTC(checkIn.getUTCFullYear(), checkIn.getUTCMonth(), checkIn.getUTCDate())
  const checkOutUtc = Date.UTC(checkOut.getUTCFullYear(), checkOut.getUTCMonth(), checkOut.getUTCDate())

  const timeDiff = checkOutUtc - checkInUtc
  const nights = Math.round(timeDiff / (1000 * 3600 * 24))

  if (nights <= 0) {
    throw new Error('Check-out date must be after check-in date')
  }

  let nightlyRate = suite.price
  if (input.season === 'alta') {
    nightlyRate = Math.round(nightlyRate * 1.2 * 100) / 100
  }

  const baseTotal = Math.round(nightlyRate * nights * 100) / 100

  const extraGuests = Math.max(0, input.guests - BASE_OCCUPANCY)
  const extraGuestTotal = Math.round(extraGuests * EXTRA_GUEST_FEE_PER_NIGHT * nights * 100) / 100

  const subtotal = Math.round((baseTotal + extraGuestTotal) * 100) / 100

  let discountTotal = 0
  if (nights >= 5) {
    discountTotal = Math.round(subtotal * 0.12 * 100) / 100
  }

  const finalTotal = Math.round((subtotal - discountTotal) * 100) / 100

  return {
    nights,
    baseTotal,
    extraGuestTotal,
    subtotal,
    discountTotal,
    finalTotal
  }
}
