import { DEDICATION_MAX_LENGTH, listGiftAddons, quoteGiftAddons } from './gifts'

const EXPECTED_IDS = [
  'cartao-caligrafado',
  'bombons-artesanais',
  'sache-conservante',
  'fita-cetim-botanica'
]

const priceOf = (id: string): number => {
  const addon = listGiftAddons().find((a) => a.id === id)
  if (addon === undefined) throw new Error(`missing addon ${id}`)
  return addon.priceCents
}

describe('listGiftAddons', () => {
  it('offers exactly the four gift add-ons', () => {
    expect(listGiftAddons().map((a) => a.id)).toEqual(EXPECTED_IDS)
  })

  it('has unique ids and names', () => {
    const addons = listGiftAddons()
    expect(new Set(addons.map((a) => a.id)).size).toBe(addons.length)
    expect(new Set(addons.map((a) => a.name)).size).toBe(addons.length)
  })

  it('uses positive integer prices in cents', () => {
    for (const addon of listGiftAddons()) {
      expect(Number.isInteger(addon.priceCents)).toBe(true)
      expect(addon.priceCents).toBeGreaterThan(0)
      expect(addon.name.trim()).not.toBe('')
    }
  })

  it('returns a copy that callers cannot use to mutate the catalog', () => {
    const first = listGiftAddons()
    first[0].priceCents = 1
    first.pop()
    const second = listGiftAddons()
    expect(second).toHaveLength(4)
    expect(second[0].priceCents).not.toBe(1)
  })
})

describe('quoteGiftAddons', () => {
  it('sums the selected add-on prices', () => {
    const result = quoteGiftAddons({
      addonIds: ['bombons-artesanais', 'sache-conservante']
    })
    expect(result).toEqual({
      ok: true,
      items: listGiftAddons().filter((a) =>
        ['bombons-artesanais', 'sache-conservante'].includes(a.id)
      ),
      totalCents: priceOf('bombons-artesanais') + priceOf('sache-conservante')
    })
  })

  it('quotes every add-on together', () => {
    const result = quoteGiftAddons({
      addonIds: EXPECTED_IDS,
      dedication: 'Feliz aniversário!'
    })
    const total = EXPECTED_IDS.reduce((sum, id) => sum + priceOf(id), 0)
    expect(result.ok && result.totalCents).toBe(total)
  })

  it('returns an empty quote when nothing is selected', () => {
    expect(quoteGiftAddons({ addonIds: [] })).toEqual({
      ok: true,
      items: [],
      totalCents: 0
    })
  })

  it('counts duplicated add-ons only once', () => {
    const result = quoteGiftAddons({
      addonIds: ['fita-cetim-botanica', 'fita-cetim-botanica']
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.items).toHaveLength(1)
    expect(result.totalCents).toBe(priceOf('fita-cetim-botanica'))
  })

  it('rejects unknown add-ons', () => {
    expect(
      quoteGiftAddons({ addonIds: ['bombons-artesanais', 'ursinho'] })
    ).toEqual({
      ok: false,
      errors: [{ code: 'unknown-addon', addonId: 'ursinho' }]
    })
  })

  it('accepts a dedication exactly at the character limit', () => {
    const dedication = 'a'.repeat(DEDICATION_MAX_LENGTH)
    const result = quoteGiftAddons({
      addonIds: ['cartao-caligrafado'],
      dedication
    })
    expect(result).toEqual({
      ok: true,
      items: [listGiftAddons()[0]],
      dedication,
      totalCents: priceOf('cartao-caligrafado')
    })
  })

  it('rejects a dedication one character over the limit', () => {
    const result = quoteGiftAddons({
      addonIds: ['cartao-caligrafado'],
      dedication: 'a'.repeat(DEDICATION_MAX_LENGTH + 1)
    })
    expect(result).toEqual({
      ok: false,
      errors: [
        {
          code: 'dedication-too-long',
          length: DEDICATION_MAX_LENGTH + 1,
          maxLength: DEDICATION_MAX_LENGTH
        }
      ]
    })
  })

  it('counts accented letters and emoji as one character each', () => {
    const dedication = 'ç🌹'.repeat(DEDICATION_MAX_LENGTH / 2)
    expect(dedication.length).toBeGreaterThan(DEDICATION_MAX_LENGTH)
    const result = quoteGiftAddons({
      addonIds: ['cartao-caligrafado'],
      dedication
    })
    expect(result.ok).toBe(true)
  })

  it('trims surrounding whitespace before checking the limit', () => {
    const body = 'b'.repeat(DEDICATION_MAX_LENGTH)
    const result = quoteGiftAddons({
      addonIds: ['cartao-caligrafado'],
      dedication: `  ${body}\n`
    })
    expect(result.ok && result.dedication).toBe(body)
  })

  it('requires the calligraphy card for a dedication', () => {
    expect(
      quoteGiftAddons({
        addonIds: ['bombons-artesanais'],
        dedication: 'Com carinho'
      })
    ).toEqual({ ok: false, errors: [{ code: 'dedication-requires-card' }] })
  })

  it('ignores a blank dedication', () => {
    expect(
      quoteGiftAddons({ addonIds: ['sache-conservante'], dedication: '   ' })
    ).toEqual({
      ok: true,
      items: [listGiftAddons()[2]],
      totalCents: priceOf('sache-conservante')
    })
  })

  it('reports every problem at once', () => {
    const result = quoteGiftAddons({
      addonIds: ['vaso'],
      dedication: 'x'.repeat(DEDICATION_MAX_LENGTH + 5)
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((e) => e.code)).toEqual([
      'unknown-addon',
      'dedication-requires-card',
      'dedication-too-long'
    ])
  })

  it('does not mutate the input', () => {
    const addonIds = ['cartao-caligrafado', 'cartao-caligrafado']
    const input = { addonIds, dedication: ' Oi ' }
    quoteGiftAddons(input)
    expect(input).toEqual({
      addonIds: ['cartao-caligrafado', 'cartao-caligrafado'],
      dedication: ' Oi '
    })
  })

  it('returns items that do not alias the catalog', () => {
    const result = quoteGiftAddons({ addonIds: ['cartao-caligrafado'] })
    if (!result.ok) throw new Error('expected ok')
    result.items[0].priceCents = 0
    expect(priceOf('cartao-caligrafado')).toBeGreaterThan(0)
  })
})
