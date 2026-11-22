import { getDestinationById } from '../data/destinations'
import type { CabinClass } from '../types'

export interface BuildPackageQuoteInput {
  destinationId: string
  travelers: number
  cabinClass: CabinClass
  hotelDays: number
  hotelDailyRate: number
  extraBaggageCount: number
  extraBaggageUnitRate: number
  selectedExcursionIds: string[]
}

export interface PackageQuote {
  destinationId: string
  travelers: number
  airfareTotal: number
  hotelTotal: number
  baggageTotal: number
  excursionsTotal: number
  subtotal: number
  discount: number
  total: number
}

export function buildTravelPackageQuote(input: BuildPackageQuoteInput): PackageQuote {
  const {
    destinationId,
    travelers,
    cabinClass,
    hotelDays,
    hotelDailyRate,
    extraBaggageCount,
    extraBaggageUnitRate,
    selectedExcursionIds
  } = input

  if (!Number.isInteger(travelers) || travelers < 1) {
    throw new Error('Number of travelers must be at least 1')
  }

  if (!Number.isInteger(hotelDays) || hotelDays < 0) {
    throw new Error('Hotel days must be a non-negative integer')
  }
  if (!Number.isFinite(hotelDailyRate) || hotelDailyRate < 0) {
    throw new Error('Hotel daily rate must be a non-negative number')
  }
  if (!Number.isInteger(extraBaggageCount) || extraBaggageCount < 0) {
    throw new Error('Extra baggage count must be a non-negative integer')
  }
  if (!Number.isFinite(extraBaggageUnitRate) || extraBaggageUnitRate < 0) {
    throw new Error('Extra baggage unit rate must be a non-negative number')
  }

  const uniqueExcursions = new Set(selectedExcursionIds)
  if (uniqueExcursions.size !== selectedExcursionIds.length) {
    throw new Error('Duplicate excursion ids are not allowed')
  }

  const destination = getDestinationById(destinationId)
  if (!destination) {
    throw new Error(`Destination with id ${destinationId} not found`)
  }

  if (!destination.availableCabins.includes(cabinClass)) {
    throw new Error(`Cabin class ${cabinClass} is not available for destination ${destinationId}`)
  }

  const baseFare = destination.price
  const cabinMultiplier = cabinClass === 'executiva' ? 2.2 : 1
  const airfareTotal = baseFare * cabinMultiplier * travelers

  const hotelTotal = hotelDays * hotelDailyRate
  
  const baggageTotal = extraBaggageCount * extraBaggageUnitRate

  let excursionsTotal = 0
  for (const excursionId of selectedExcursionIds) {
    const excursion = destination.excursions.find((e) => e.id === excursionId)
    if (!excursion) {
      throw new Error(`Excursion with id ${excursionId} not found in destination ${destinationId}`)
    }
    // Excursions are per traveler
    excursionsTotal += excursion.price * travelers
  }

  const round = (val: number) => Number(val.toFixed(2))

  const subtotal = round(airfareTotal + hotelTotal + baggageTotal + excursionsTotal)

  const discount = travelers >= 4 ? round(subtotal * 0.08) : 0
  const total = round(subtotal - discount)

  return {
    destinationId,
    travelers,
    airfareTotal: round(airfareTotal),
    hotelTotal: round(hotelTotal),
    baggageTotal: round(baggageTotal),
    excursionsTotal: round(excursionsTotal),
    subtotal,
    discount,
    total
  }
}
