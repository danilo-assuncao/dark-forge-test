import { getPropertyById } from '../data/properties'
import type { VisitBooking } from '../types'

export type VisitType = 'presencial' | 'videochamada'
export type PaymentMethod = 'a-vista' | 'financiado'

export interface ScheduleVisitInput extends VisitBooking {
  visitType: VisitType
}

export interface ScheduleVisitResult {
  success: boolean
  protocol?: string
  message: string
}

export const schedulePropertyVisit = (input: ScheduleVisitInput): ScheduleVisitResult => {
  const property = getPropertyById(input.propertyId)
  if (!property) {
    return { success: false, message: 'Property not found' }
  }

  if (input.visitType !== 'presencial' && input.visitType !== 'videochamada') {
    return { success: false, message: 'Invalid visit type' }
  }

  const randomCode = Math.floor(1000 + Math.random() * 9000).toString()
  const protocol = `IMV-${randomCode}`

  return {
    success: true,
    protocol,
    message: 'Visit scheduled successfully'
  }
}

export interface PurchaseOfferInput {
  propertyId: string
  paymentMethod: PaymentMethod
  coupon?: string
  offeredPriceBrl?: number
}

export interface PurchaseOfferResult {
  success: boolean
  propertyId: string
  originalPriceBrl: number
  finalPriceBrl: number
  discountApplied: number
  message: string
}

export const evaluatePurchaseOffer = (input: PurchaseOfferInput): PurchaseOfferResult => {
  const property = getPropertyById(input.propertyId)
  if (!property) {
    return { 
      success: false, 
      propertyId: input.propertyId, 
      originalPriceBrl: 0,
      finalPriceBrl: 0, 
      discountApplied: 0, 
      message: 'Property not found' 
    }
  }

  const basePrice = input.offeredPriceBrl !== undefined ? input.offeredPriceBrl : property.priceBrl
  let finalPrice = basePrice
  let discount = 0

  if (input.paymentMethod === 'a-vista' && input.coupon === 'DANHOME5') {
    discount = basePrice * 0.05
    finalPrice = basePrice - discount
  }

  return {
    success: true,
    propertyId: input.propertyId,
    originalPriceBrl: basePrice,
    finalPriceBrl: finalPrice,
    discountApplied: discount,
    message: 'Offer evaluated successfully'
  }
}
