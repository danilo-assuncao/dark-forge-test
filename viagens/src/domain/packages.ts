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

  if (travelers < 1) {
    throw new Error('Number of travelers must be at least 1')
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

  const subtotal = airfareTotal + hotelTotal + baggageTotal + excursionsTotal

  const discount = travelers >= 4 ? subtotal * 0.08 : 0
  const total = subtotal - discount

  return {
    destinationId,
    travelers,
    airfareTotal,
    hotelTotal,
    baggageTotal,
    excursionsTotal,
    subtotal,
    discount,
    total
  }
}
