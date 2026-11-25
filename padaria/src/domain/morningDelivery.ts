import type { BakeryItem, BasketLine, MorningSlot } from '../types'
import { getBakeById } from '../data/bakes'

export type DeliveryMode = 'entrega' | 'retirada-fornada'

export type FreeDeliveryReason = 'assinante-pao-quente' | 'pedido-minimo' | 'retirada-fornada'

export type Packaging = 'termica-kraft' | 'padrao'

export const DELIVERY_FEE_CENTS = 990
export const FREE_DELIVERY_THRESHOLD_CENTS = 9000

const SLOTS: readonly MorningSlot[] = ['05:30', '06:30', '07:30', '08:30']

export interface MorningDeliveryInput {
  lines: BasketLine[]
  mode: DeliveryMode
  slot: MorningSlot
  subscriber: boolean // assinante Pão Quente
  random?: () => number // [0, 1) — injectable for deterministic tickets
}

export interface MorningDeliveryLine {
  item: BakeryItem
  quantity: number
  subtotalCents: number
}

export interface MorningDeliveryResult {
  ticket: string // BKR-XXXX
  mode: DeliveryMode
  slot: MorningSlot
  readySlot: MorningSlot // fornada mais tardia entre os itens do pedido
  lines: MorningDeliveryLine[]
  packaging: Packaging
  subtotalCents: number
  deliveryFeeCents: number
  freeDeliveryReason: FreeDeliveryReason | null
  totalCents: number
}

export interface DeliveryFee {
  feeCents: number
  freeReason: FreeDeliveryReason | null
}

/** Morning delivery fee: free for subscribers, bake pickup or orders >= R$ 90,00. */
export const calculateDeliveryFee = (
  subtotalCents: number,
  mode: DeliveryMode,
  subscriber: boolean
): DeliveryFee => {
  if (mode === 'retirada-fornada') return { feeCents: 0, freeReason: 'retirada-fornada' }
  if (subscriber) return { feeCents: 0, freeReason: 'assinante-pao-quente' }
  if (subtotalCents >= FREE_DELIVERY_THRESHOLD_CENTS) return { feeCents: 0, freeReason: 'pedido-minimo' }
  return { feeCents: DELIVERY_FEE_CENTS, freeReason: null }
}

/** Hot bread ('pao') travels in a kraft thermal bag. */
export const choosePackaging = (items: BakeryItem[]): Packaging =>
  items.some((i) => i.category === 'pao') ? 'termica-kraft' : 'padrao'

const slotIndex = (slot: MorningSlot): number => SLOTS.indexOf(slot)

/** Latest bake slot among the items: the earliest moment the whole order is out of the oven. */
export const hotBakeWindow = (items: BakeryItem[]): MorningSlot =>
  items.reduce<MorningSlot>((latest, i) => (slotIndex(i.slot) > slotIndex(latest) ? i.slot : latest), SLOTS[0])

const TICKET_PATTERN = /^BKR-\d{4}$/

export const isTicketCode = (code: string): boolean => TICKET_PATTERN.test(code)

/** Builds a BKR-XXXX code; `random` returns a value in [0, 1). */
export const generateTicketCode = (random: () => number = Math.random): string =>
  `BKR-${String(Math.min(9999, Math.max(0, Math.floor(random() * 10000)))).padStart(4, '0')}`

const resolveLines = (lines: BasketLine[]): MorningDeliveryLine[] =>
  lines.map(({ itemId, quantity }) => {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Quantidade inválida para ${itemId}: ${quantity}`)
    }
    const item = getBakeById(itemId)
    if (!item) throw new Error(`Item desconhecido: ${itemId}`)
    return { item, quantity, subtotalCents: item.priceCents * quantity }
  })

/** Validates the basket, prices the morning delivery and issues the BKR-XXXX ticket. */
export const scheduleMorningDelivery = (input: MorningDeliveryInput): MorningDeliveryResult => {
  if (input.lines.length === 0) throw new Error('Adicione ao menos um item ao pedido')
  if (!SLOTS.includes(input.slot)) throw new Error(`Janela matinal inválida: ${input.slot}`)

  const lines = resolveLines(input.lines)
  const items = lines.map((l) => l.item)
  const readySlot = hotBakeWindow(items)
  if (slotIndex(input.slot) < slotIndex(readySlot)) {
    throw new Error(`Janela ${input.slot} antes da fornada das ${readySlot}`)
  }

  const subtotalCents = lines.reduce((sum, l) => sum + l.subtotalCents, 0)
  const { feeCents, freeReason } = calculateDeliveryFee(subtotalCents, input.mode, input.subscriber)

  return {
    ticket: generateTicketCode(input.random),
    mode: input.mode,
    slot: input.slot,
    readySlot,
    lines,
    packaging: choosePackaging(items),
    subtotalCents,
    deliveryFeeCents: feeCents,
    freeDeliveryReason: freeReason,
    totalCents: subtotalCents + feeCents
  }
}
