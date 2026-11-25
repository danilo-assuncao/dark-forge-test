import { getFlowerById } from '../data/flowers'
import type { FlowerStem } from '../types'

export const LUXURY_MIN_STEMS = 12
export const LUXURY_DISCOUNT_PERCENT = 15
export const GLASS_VASE_PRICE_CENTS = 8900

export interface BouquetStemInput {
  stemId: string
  quantity: number
}

export interface BouquetInput {
  stems: readonly BouquetStemInput[]
  glassVase?: boolean
}

export interface BouquetPricing {
  totalStems: number
  subtotalCents: number
  discountCents: number
  vaseCents: number
  totalCents: number
  isLuxury: boolean
}

const resolveFlower = (stemId: string): FlowerStem => {
  const flower = getFlowerById(stemId)
  if (flower === undefined) {
    throw new Error(`Unknown flower stem: ${stemId}`)
  }
  return flower
}

const assertQuantity = (line: BouquetStemInput): void => {
  if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
    throw new Error(
      `Invalid quantity for ${line.stemId}: must be a positive integer`
    )
  }
}

const quantitiesById = (
  stems: readonly BouquetStemInput[]
): ReadonlyMap<string, number> =>
  stems.reduce(
    (acc, line) =>
      new Map(acc).set(
        line.stemId,
        (acc.get(line.stemId) ?? 0) + line.quantity
      ),
    new Map<string, number>()
  )

const assertStock = (
  quantities: ReadonlyMap<string, number>,
  flowers: ReadonlyMap<string, FlowerStem>
): void => {
  for (const [stemId, quantity] of quantities) {
    const flower = flowers.get(stemId)
    if (flower !== undefined && quantity > flower.stockStems) {
      throw new Error(
        `Insufficient stock for ${stemId}: requested ${quantity}, available ${flower.stockStems}`
      )
    }
  }
}

export const calculateBouquetPricing = (
  input: BouquetInput
): BouquetPricing => {
  input.stems.forEach(assertQuantity)

  const quantities = quantitiesById(input.stems)
  const flowers = new Map(
    [...quantities.keys()].map((id) => [id, resolveFlower(id)] as const)
  )
  assertStock(quantities, flowers)

  const totalStems = [...quantities.values()].reduce((sum, q) => sum + q, 0)
  const subtotalCents = [...quantities].reduce(
    (sum, [id, quantity]) =>
      sum + (flowers.get(id)?.priceCents ?? 0) * quantity,
    0
  )
  const isLuxury = totalStems >= LUXURY_MIN_STEMS
  const discountCents = isLuxury
    ? Math.round((subtotalCents * LUXURY_DISCOUNT_PERCENT) / 100)
    : 0
  const vaseCents = input.glassVase === true ? GLASS_VASE_PRICE_CENTS : 0

  return {
    totalStems,
    subtotalCents,
    discountCents,
    vaseCents,
    totalCents: subtotalCents - discountCents + vaseCents,
    isLuxury
  }
}
