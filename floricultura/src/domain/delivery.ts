import { getFlowerById } from '../data/flowers'
import type { BouquetSelection, FlowerStem, GiftAddon } from '../types'

export const REFRIGERATED_FREIGHT_CENTS = 1690
export const FREE_FREIGHT_THRESHOLD_CENTS = 16000
export const CLUB_DISCOUNT_PERCENT = 12
export const COUPON_CODE = 'DANFLORA10'
export const COUPON_DISCOUNT_PERCENT = 10
export const PROTOCOL_PREFIX = 'FLR'

export type FulfillmentMode = 'entrega-refrigerada' | 'retirada-atelier'

export type FreeFreightReason =
  'clube-botanico' | 'retirada-atelier' | 'pedido-minimo'

export interface FloraOrderInput {
  selections: readonly BouquetSelection[]
  fulfillment: FulfillmentMode
  clubMember: boolean
  couponCode?: string
  addons?: readonly GiftAddon[]
}

export interface FreightQuote {
  freightCents: number
  freeFreightReason: FreeFreightReason | null
}

export interface DiscountBreakdown {
  clubDiscountCents: number
  couponDiscountCents: number
  couponApplied: boolean
}

export interface FloraOrderResult extends FreightQuote, DiscountBreakdown {
  protocol: string
  fulfillment: FulfillmentMode
  subtotalCents: number
  totalCents: number
}

export type RandomSource = () => number

const percentOf = (cents: number, percent: number): number =>
  Math.round((cents * percent) / 100)

export const isValidCoupon = (code?: string): boolean =>
  code !== undefined && code.trim().toUpperCase() === COUPON_CODE

export const calculateFreight = (
  subtotalCents: number,
  fulfillment: FulfillmentMode,
  clubMember: boolean
): FreightQuote => {
  const freeFreightReason: FreeFreightReason | null = clubMember
    ? 'clube-botanico'
    : fulfillment === 'retirada-atelier'
      ? 'retirada-atelier'
      : subtotalCents >= FREE_FREIGHT_THRESHOLD_CENTS
        ? 'pedido-minimo'
        : null

  return {
    freightCents: freeFreightReason === null ? REFRIGERATED_FREIGHT_CENTS : 0,
    freeFreightReason
  }
}

// Discounts stack sequentially: Clube Botânico 12% first, then the coupon 10%
// over the remaining amount. Each step is rounded to whole cents.
export const applyDiscounts = (
  subtotalCents: number,
  clubMember: boolean,
  couponCode?: string
): DiscountBreakdown => {
  const clubDiscountCents = clubMember
    ? percentOf(subtotalCents, CLUB_DISCOUNT_PERCENT)
    : 0
  const couponApplied = isValidCoupon(couponCode)
  const couponDiscountCents = couponApplied
    ? percentOf(subtotalCents - clubDiscountCents, COUPON_DISCOUNT_PERCENT)
    : 0

  return { clubDiscountCents, couponDiscountCents, couponApplied }
}

export const generateProtocol = (
  random: RandomSource = Math.random
): string => {
  const value = Math.min(Math.max(Math.floor(random() * 10000), 0), 9999)
  return `${PROTOCOL_PREFIX}-${String(value).padStart(4, '0')}`
}

const findStem = (stemId: string): FlowerStem => {
  const stem = getFlowerById(stemId)
  if (stem === undefined) {
    throw new Error(`Flor não encontrada: ${stemId}`)
  }
  return stem
}

const assertQuantity = (selection: BouquetSelection): void => {
  if (!Number.isInteger(selection.quantity) || selection.quantity < 1) {
    throw new Error(
      `Quantidade inválida para ${selection.stemId}: ${selection.quantity}`
    )
  }
}

const resolveAddon = (
  addonId: string,
  addons: readonly GiftAddon[]
): GiftAddon => {
  const addon = addons.find((a) => a.id === addonId)
  if (addon === undefined) {
    throw new Error(`Complemento não encontrado: ${addonId}`)
  }
  return addon
}

const assertStock = (selections: readonly BouquetSelection[]): void => {
  const requested = selections.reduce<Map<string, number>>(
    (acc, s) => acc.set(s.stemId, (acc.get(s.stemId) ?? 0) + s.quantity),
    new Map()
  )
  requested.forEach((quantity, stemId) => {
    const stem = findStem(stemId)
    if (quantity > stem.stockStems) {
      throw new Error(
        `Estoque insuficiente para ${stemId}: ${quantity} > ${stem.stockStems}`
      )
    }
  })
}

const selectionSubtotal = (
  selection: BouquetSelection,
  addons: readonly GiftAddon[]
): number => {
  assertQuantity(selection)
  const stem = findStem(selection.stemId)
  const addonsCents = selection.addonIds
    .map((id) => resolveAddon(id, addons).priceCents)
    .reduce((sum, price) => sum + price, 0)
  return stem.priceCents * selection.quantity + addonsCents
}

// Free-freight threshold is evaluated on the gross subtotal (stems + add-ons,
// before discounts) so applying a discount never removes the exemption.
export const finalizeFloraOrder = (
  input: FloraOrderInput,
  random: RandomSource = Math.random
): FloraOrderResult => {
  if (input.selections.length === 0) {
    throw new Error('O pedido precisa de ao menos uma seleção')
  }
  const addons = input.addons ?? []
  const subtotalCents = input.selections
    .map((s) => selectionSubtotal(s, addons))
    .reduce((sum, value) => sum + value, 0)
  assertStock(input.selections)

  const discounts = applyDiscounts(
    subtotalCents,
    input.clubMember,
    input.couponCode
  )
  const freight = calculateFreight(
    subtotalCents,
    input.fulfillment,
    input.clubMember
  )
  const totalCents = Math.max(
    subtotalCents -
      discounts.clubDiscountCents -
      discounts.couponDiscountCents +
      freight.freightCents,
    0
  )

  return {
    protocol: generateProtocol(random),
    fulfillment: input.fulfillment,
    subtotalCents,
    ...discounts,
    ...freight,
    totalCents
  }
}
