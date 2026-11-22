import { getEventById } from '../data/events'
import type { SectorTier, BatchNumber, TicketBenefitType } from '../types'

export interface OrderItemInput {
  eventId: string
  quantity: number
  sector?: SectorTier
  batch?: BatchNumber
  benefit?: TicketBenefitType
}

export interface OrderInput {
  items: OrderItemInput[]
  deliveryMethod: 'digital' | 'bilheteria'
  coupon?: string
}

export interface OrderResult {
  subtotal: number
  discount: number
  fee: number
  total: number
}

const SECTOR_MULTIPLIERS: Record<SectorTier, number> = {
  pista: 1.0,
  vip: 1.6,
  camarote: 2.5
}

const BATCH_MULTIPLIERS: Record<BatchNumber, number> = {
  1: 1.0,
  2: 1.15,
  3: 1.30
}

export function calculateTicketsOrder(input: OrderInput): OrderResult {
  if (!input.items || input.items.length === 0) {
    throw new Error('Order must contain at least one item')
  }

  let subtotal = 0

  for (const item of input.items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new Error(`Invalid quantity: ${item.quantity}`)
    }

    const event = getEventById(item.eventId)
    if (!event) {
      throw new Error(`Event not found: ${item.eventId}`)
    }

    const sector = item.sector ?? event.sector
    const batch = item.batch ?? event.batch
    const benefit = item.benefit ?? event.benefit

    if (!(sector in SECTOR_MULTIPLIERS)) {
      throw new Error(`Invalid sector: ${sector}`)
    }
    if (!(batch in BATCH_MULTIPLIERS)) {
      throw new Error(`Invalid batch: ${batch}`)
    }
    const validBenefits = ['inteira', 'estudante', 'idoso', 'social']
    if (!validBenefits.includes(benefit)) {
      throw new Error(`Invalid benefit: ${benefit}`)
    }

    const sectorMult = SECTOR_MULTIPLIERS[sector]
    const batchMult = BATCH_MULTIPLIERS[batch]
    
    const faceValue = event.price * sectorMult * batchMult
    const isMeia = benefit === 'estudante' || benefit === 'idoso' || benefit === 'social'
    
    const finalTicketPrice = isMeia ? faceValue * 0.5 : faceValue

    subtotal += finalTicketPrice * item.quantity
  }

  subtotal = Math.round(subtotal * 100) / 100

  let discount = 0
  if (input.coupon === 'DANSHOW10') {
    discount = Math.round((subtotal * 0.10) * 100) / 100
  }

  const discountedSubtotal = subtotal - discount

  let fee = 0
  if (input.deliveryMethod !== 'bilheteria') {
    fee = Math.round((discountedSubtotal * 0.10) * 100) / 100
  }

  const total = Math.round((discountedSubtotal + fee) * 100) / 100

  return {
    subtotal,
    discount,
    fee,
    total
  }
}
