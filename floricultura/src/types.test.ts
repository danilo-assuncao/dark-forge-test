import type {
  BouquetSelection,
  DeliveryWindow,
  FlowerSpecies,
  FlowerStem,
  GiftAddon
} from './types'

describe('domain types', () => {
  it('builds values for every exported type', () => {
    const species: FlowerSpecies = 'tulipa'
    const deliveryWindow: DeliveryWindow = 'tarde'
    const stem = {
      id: 'tulipa-rosa',
      name: 'Tulipa Rosa',
      species,
      color: 'rosa',
      priceCents: 1290,
      stockStems: 10
    } satisfies FlowerStem
    const addon = {
      id: 'cartao',
      name: 'Cartão',
      priceCents: 500
    } satisfies GiftAddon
    const selection = {
      stemId: stem.id,
      quantity: 12,
      addonIds: [addon.id],
      deliveryWindow
    } satisfies BouquetSelection

    expect(stem.species).toBe('tulipa')
    expect(selection.deliveryWindow).toBe('tarde')
    expect(selection.addonIds).toEqual(['cartao'])
    expect(selection.stemId).toBe(stem.id)
  })

  it('keeps description optional on FlowerStem', () => {
    const withDescription: FlowerStem = {
      id: 'x',
      name: 'X',
      species: 'rosa',
      color: 'vermelha',
      priceCents: 100,
      stockStems: 1,
      description: 'Flor de teste'
    }
    expect(withDescription.description).toBe('Flor de teste')
  })
})
