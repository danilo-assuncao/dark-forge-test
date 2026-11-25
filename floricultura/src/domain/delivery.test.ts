import type { BouquetSelection, GiftAddon } from '../types'
import {
  applyDiscounts,
  calculateFreight,
  finalizeFloraOrder,
  generateProtocol,
  isValidCoupon,
  type FloraOrderInput
} from './delivery'

const fixedRandom = () => 0.4242

const select = (
  stemId: string,
  quantity: number,
  addonIds: string[] = []
): BouquetSelection => ({ stemId, quantity, addonIds, deliveryWindow: 'tarde' })

const addons: GiftAddon[] = [
  { id: 'cartao', name: 'Cartão', priceCents: 500 },
  { id: 'vaso', name: 'Vaso de vidro', priceCents: 1030 },
  { id: 'laco', name: 'Laço de cetim', priceCents: 1029 }
]

const order = (overrides: Partial<FloraOrderInput> = {}): FloraOrderInput => ({
  selections: [select('rosa-vermelha', 2)],
  fulfillment: 'entrega-refrigerada',
  clubMember: false,
  addons,
  ...overrides
})

describe('calculateFreight', () => {
  it('charges R$ 16,90 for refrigerated delivery below the threshold', () => {
    expect(calculateFreight(15999, 'entrega-refrigerada', false)).toEqual({
      freightCents: 1690,
      freeFreightReason: null
    })
  })

  it('is free for Clube Botânico members', () => {
    expect(calculateFreight(1000, 'entrega-refrigerada', true)).toEqual({
      freightCents: 0,
      freeFreightReason: 'clube-botanico'
    })
  })

  it('is free for retirada-atelier', () => {
    expect(calculateFreight(1000, 'retirada-atelier', false)).toEqual({
      freightCents: 0,
      freeFreightReason: 'retirada-atelier'
    })
  })

  it('is free for orders of exactly R$ 160,00 or more', () => {
    expect(calculateFreight(16000, 'entrega-refrigerada', false)).toEqual({
      freightCents: 0,
      freeFreightReason: 'pedido-minimo'
    })
  })
})

describe('applyDiscounts', () => {
  it('applies 12% for club members', () => {
    expect(applyDiscounts(10000, true)).toEqual({
      clubDiscountCents: 1200,
      couponDiscountCents: 0,
      couponApplied: false
    })
  })

  it('applies DANFLORA10 ignoring case and surrounding spaces', () => {
    expect(applyDiscounts(10000, false, '  danflora10 ')).toEqual({
      clubDiscountCents: 0,
      couponDiscountCents: 1000,
      couponApplied: true
    })
  })

  it('stacks the coupon over the amount left after the club discount', () => {
    expect(applyDiscounts(10000, true, 'DANFLORA10')).toEqual({
      clubDiscountCents: 1200,
      couponDiscountCents: 880,
      couponApplied: true
    })
  })

  it('ignores unknown coupons', () => {
    expect(isValidCoupon('DANFLORA20')).toBe(false)
    expect(isValidCoupon(undefined)).toBe(false)
    expect(applyDiscounts(10000, false, 'DANFLORA20').couponDiscountCents).toBe(
      0
    )
  })
})

describe('generateProtocol', () => {
  it('formats a four-digit FLR protocol', () => {
    expect(generateProtocol(fixedRandom)).toBe('FLR-4242')
  })

  it('pads with leading zeros and clamps to the 0000-9999 range', () => {
    expect(generateProtocol(() => 0)).toBe('FLR-0000')
    expect(generateProtocol(() => 0.0007)).toBe('FLR-0007')
    expect(generateProtocol(() => 0.99999)).toBe('FLR-9999')
    expect(generateProtocol(() => 1)).toBe('FLR-9999')
  })

  it('uses Math.random by default', () => {
    expect(generateProtocol()).toMatch(/^FLR-\d{4}$/)
  })
})

describe('finalizeFloraOrder', () => {
  it('adds refrigerated freight to a regular order', () => {
    expect(finalizeFloraOrder(order(), fixedRandom)).toEqual({
      protocol: 'FLR-4242',
      fulfillment: 'entrega-refrigerada',
      subtotalCents: 1780,
      clubDiscountCents: 0,
      couponDiscountCents: 0,
      couponApplied: false,
      freightCents: 1690,
      freeFreightReason: null,
      totalCents: 3470
    })
  })

  it('gives club members 12% off and free freight', () => {
    const result = finalizeFloraOrder(order({ clubMember: true }), fixedRandom)
    expect(result.clubDiscountCents).toBe(214)
    expect(result.freightCents).toBe(0)
    expect(result.freeFreightReason).toBe('clube-botanico')
    expect(result.totalCents).toBe(1566)
  })

  it('applies DANFLORA10 on top of freight', () => {
    const result = finalizeFloraOrder(
      order({ couponCode: 'danflora10' }),
      fixedRandom
    )
    expect(result.couponApplied).toBe(true)
    expect(result.couponDiscountCents).toBe(178)
    expect(result.totalCents).toBe(1780 - 178 + 1690)
  })

  it('combines club and coupon discounts sequentially', () => {
    const result = finalizeFloraOrder(
      order({
        selections: [select('orquidea-phalaenopsis', 2)],
        clubMember: true,
        couponCode: 'DANFLORA10'
      }),
      fixedRandom
    )
    expect(result.subtotalCents).toBe(9980)
    expect(result.clubDiscountCents).toBe(1198)
    expect(result.couponDiscountCents).toBe(878)
    expect(result.totalCents).toBe(7904)
  })

  it('waives freight for retirada-atelier', () => {
    const result = finalizeFloraOrder(
      order({ fulfillment: 'retirada-atelier' }),
      fixedRandom
    )
    expect(result.fulfillment).toBe('retirada-atelier')
    expect(result.freeFreightReason).toBe('retirada-atelier')
    expect(result.totalCents).toBe(1780)
  })

  it('waives freight at exactly R$ 160,00 including add-ons', () => {
    const result = finalizeFloraOrder(
      order({ selections: [select('orquidea-phalaenopsis', 3, ['vaso'])] }),
      fixedRandom
    )
    expect(result.subtotalCents).toBe(16000)
    expect(result.freeFreightReason).toBe('pedido-minimo')
    expect(result.totalCents).toBe(16000)
  })

  it('charges freight at R$ 159,99', () => {
    const result = finalizeFloraOrder(
      order({ selections: [select('orquidea-phalaenopsis', 3, ['laco'])] }),
      fixedRandom
    )
    expect(result.subtotalCents).toBe(15999)
    expect(result.freightCents).toBe(1690)
    expect(result.totalCents).toBe(17689)
  })

  it('keeps the threshold exemption when the coupon lowers the total', () => {
    const result = finalizeFloraOrder(
      order({
        selections: [select('orquidea-phalaenopsis', 3, ['vaso'])],
        couponCode: 'DANFLORA10'
      }),
      fixedRandom
    )
    expect(result.freightCents).toBe(0)
    expect(result.totalCents).toBe(14400)
  })

  it('charges add-ons once per selection', () => {
    const result = finalizeFloraOrder(
      order({ selections: [select('rosa-vermelha', 3, ['cartao'])] }),
      fixedRandom
    )
    expect(result.subtotalCents).toBe(890 * 3 + 500)
  })

  it('emits a FLR-XXXX protocol by default', () => {
    expect(finalizeFloraOrder(order()).protocol).toMatch(/^FLR-\d{4}$/)
  })

  it('does not mutate the input', () => {
    const input = order({ selections: [select('girassol', 2, ['cartao'])] })
    const snapshot = structuredClone(input)
    finalizeFloraOrder(input, fixedRandom)
    expect(input).toEqual(snapshot)
  })

  it('rejects an empty order', () => {
    expect(() => finalizeFloraOrder(order({ selections: [] }))).toThrow(
      /ao menos uma seleção/
    )
  })

  it('rejects unknown stems and add-ons', () => {
    expect(() =>
      finalizeFloraOrder(order({ selections: [select('cacto', 1)] }))
    ).toThrow(/Flor não encontrada: cacto/)
    expect(() =>
      finalizeFloraOrder(
        order({ selections: [select('girassol', 1, ['balao'])] })
      )
    ).toThrow(/Complemento não encontrado: balao/)
  })

  it.each([0, -1, 1.5])('rejects invalid quantity %s', (quantity) => {
    expect(() =>
      finalizeFloraOrder(order({ selections: [select('girassol', quantity)] }))
    ).toThrow(/Quantidade inválida/)
  })

  it('rejects out-of-stock stems', () => {
    expect(() =>
      finalizeFloraOrder(order({ selections: [select('margarida', 1)] }))
    ).toThrow(/Estoque insuficiente para margarida/)
  })

  it('checks stock across selections of the same stem', () => {
    expect(() =>
      finalizeFloraOrder(
        order({
          selections: [
            select('orquidea-phalaenopsis', 7),
            select('orquidea-phalaenopsis', 6)
          ]
        })
      )
    ).toThrow(/Estoque insuficiente para orquidea-phalaenopsis: 13 > 12/)
  })
})
