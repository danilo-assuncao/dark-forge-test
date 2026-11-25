import type { GiftAddon } from '../types'

export type GiftAddonId =
  | 'cartao-caligrafado'
  | 'bombons-artesanais'
  | 'sache-conservante'
  | 'fita-cetim-botanica'

/** Add-on that carries the handwritten dedication. */
export const DEDICATION_ADDON_ID: GiftAddonId = 'cartao-caligrafado'

/**
 * Maximum dedication length, counted in Unicode code points after trimming,
 * so accented letters and emoji count as a single character each.
 */
export const DEDICATION_MAX_LENGTH = 140

const giftAddons: readonly (GiftAddon & { id: GiftAddonId })[] = [
  { id: 'cartao-caligrafado', name: 'Cartão Caligrafado', priceCents: 1200 },
  { id: 'bombons-artesanais', name: 'Bombons Artesanais', priceCents: 3490 },
  {
    id: 'sache-conservante',
    name: 'Sachê Conservante Floral',
    priceCents: 390
  },
  { id: 'fita-cetim-botanica', name: 'Fita de Cetim Botânica', priceCents: 590 }
]

export interface GiftQuoteInput {
  addonIds: readonly string[]
  dedication?: string
}

export type GiftQuoteError =
  | { code: 'unknown-addon'; addonId: string }
  | { code: 'dedication-requires-card' }
  | { code: 'dedication-too-long'; length: number; maxLength: number }

export type GiftQuoteResult =
  | {
      ok: true
      items: GiftAddon[]
      dedication?: string
      totalCents: number
    }
  | { ok: false; errors: GiftQuoteError[] }

const copy = (addon: GiftAddon): GiftAddon => ({ ...addon })

export const listGiftAddons = (): GiftAddon[] => giftAddons.map(copy)

const countCharacters = (text: string): number => [...text].length

/**
 * Quotes the selected gift add-ons. Duplicate ids are counted once, unknown ids
 * are reported as errors, and a non-blank dedication requires the calligraphy
 * card and must fit within DEDICATION_MAX_LENGTH characters.
 */
export const quoteGiftAddons = ({
  addonIds,
  dedication
}: GiftQuoteInput): GiftQuoteResult => {
  const errors: GiftQuoteError[] = []
  const uniqueIds = [...new Set(addonIds)]

  const items = uniqueIds.flatMap((addonId) => {
    const addon = giftAddons.find((a) => a.id === addonId)
    if (addon === undefined) {
      errors.push({ code: 'unknown-addon', addonId })
      return []
    }
    return [copy(addon)]
  })

  const text = (dedication ?? '').trim()
  if (text !== '') {
    if (!uniqueIds.includes(DEDICATION_ADDON_ID)) {
      errors.push({ code: 'dedication-requires-card' })
    }
    const length = countCharacters(text)
    if (length > DEDICATION_MAX_LENGTH) {
      errors.push({
        code: 'dedication-too-long',
        length,
        maxLength: DEDICATION_MAX_LENGTH
      })
    }
  }

  if (errors.length > 0) return { ok: false, errors }

  const totalCents = items.reduce((sum, item) => sum + item.priceCents, 0)
  return text === ''
    ? { ok: true, items, totalCents }
    : { ok: true, items, dedication: text, totalCents }
}
