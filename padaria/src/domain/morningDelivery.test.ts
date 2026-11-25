import type { BasketLine, MorningSlot } from '../types'
import { getBakeById } from '../data/bakes'
import {
  DELIVERY_FEE_CENTS,
  FREE_DELIVERY_THRESHOLD_CENTS,
  calculateDeliveryFee,
  choosePackaging,
  generateTicketCode,
  hotBakeWindow,
  isTicketCode,
  scheduleMorningDelivery,
  type MorningDeliveryInput
} from './morningDelivery'

const bake = (id: string) => {
  const item = getBakeById(id)
  if (!item) throw new Error(`missing fixture ${id}`)
  return item
}

const input = (overrides: Partial<MorningDeliveryInput> = {}): MorningDeliveryInput => ({
  lines: [{ itemId: 'pao-frances', quantity: 10 }],
  mode: 'entrega',
  slot: '06:30',
  subscriber: false,
  random: () => 0.0042,
  ...overrides
})

describe('calculateDeliveryFee', () => {
  it('charges R$ 9,90 for a regular delivery below R$ 90,00', () => {
    expect(DELIVERY_FEE_CENTS).toBe(990)
    expect(calculateDeliveryFee(5000, 'entrega', false)).toEqual({ feeCents: 990, freeReason: null })
  })

  it('is free for Pão Quente subscribers', () => {
    expect(calculateDeliveryFee(100, 'entrega', true)).toEqual({ feeCents: 0, freeReason: 'assinante-pao-quente' })
  })

  it('is free for bake pickup', () => {
    expect(calculateDeliveryFee(100, 'retirada-fornada', false)).toEqual({ feeCents: 0, freeReason: 'retirada-fornada' })
  })

  it('applies the R$ 90,00 threshold inclusively', () => {
    expect(FREE_DELIVERY_THRESHOLD_CENTS).toBe(9000)
    expect(calculateDeliveryFee(8999, 'entrega', false).feeCents).toBe(990)
    expect(calculateDeliveryFee(9000, 'entrega', false)).toEqual({ feeCents: 0, freeReason: 'pedido-minimo' })
    expect(calculateDeliveryFee(9001, 'entrega', false).feeCents).toBe(0)
  })
})

describe('choosePackaging', () => {
  it('uses the kraft thermal bag when the order has hot bread', () => {
    expect(choosePackaging([bake('sonho'), bake('baguete')])).toBe('termica-kraft')
  })

  it('uses standard packaging without bread', () => {
    expect(choosePackaging([bake('sonho'), bake('pao-de-queijo'), bake('bolo-fuba')])).toBe('padrao')
  })
})

describe('hotBakeWindow', () => {
  it('returns the latest bake slot among the items', () => {
    expect(hotBakeWindow([bake('pao-frances')])).toBe('05:30')
    expect(hotBakeWindow([bake('pao-frances'), bake('croissant'), bake('sonho')])).toBe('07:30')
  })
})

describe('BKR ticket', () => {
  it('formats four zero-padded digits', () => {
    expect(generateTicketCode(() => 0)).toBe('BKR-0000')
    expect(generateTicketCode(() => 0.0042)).toBe('BKR-0042')
    expect(generateTicketCode(() => 0.99999)).toBe('BKR-9999')
  })

  it('clamps out-of-range random values', () => {
    expect(generateTicketCode(() => 1)).toBe('BKR-9999')
    expect(generateTicketCode(() => -0.5)).toBe('BKR-0000')
  })

  it('validates ticket codes', () => {
    expect(isTicketCode(generateTicketCode())).toBe(true)
    expect(isTicketCode('BKR-123')).toBe(false)
    expect(isTicketCode('BRB-1234')).toBe(false)
  })
})

describe('scheduleMorningDelivery', () => {
  it('prices a small delivery with fee, thermal bag and ticket', () => {
    const result = scheduleMorningDelivery(input({ lines: [{ itemId: 'pao-frances', quantity: 10 }, { itemId: 'sonho', quantity: 2 }] }))
    expect(result).toMatchObject({
      ticket: 'BKR-0042',
      mode: 'entrega',
      slot: '06:30',
      readySlot: '06:30',
      packaging: 'termica-kraft',
      subtotalCents: 2300,
      deliveryFeeCents: 990,
      freeDeliveryReason: null,
      totalCents: 3290
    })
    expect(result.lines.map((l) => [l.item.id, l.subtotalCents])).toEqual([['pao-frances', 1000], ['sonho', 1300]])
  })

  it('waives the fee at exactly R$ 90,00', () => {
    const result = scheduleMorningDelivery(input({ lines: [{ itemId: 'baguete', quantity: 10 }], slot: '07:30' }))
    expect(result.subtotalCents).toBe(9000)
    expect(result.deliveryFeeCents).toBe(0)
    expect(result.freeDeliveryReason).toBe('pedido-minimo')
    expect(result.totalCents).toBe(9000)
  })

  it('waives the fee for subscribers and pickup', () => {
    expect(scheduleMorningDelivery(input({ subscriber: true })).totalCents).toBe(1000)
    expect(scheduleMorningDelivery(input({ mode: 'retirada-fornada' })).freeDeliveryReason).toBe('retirada-fornada')
  })

  it('uses standard packaging for orders without bread', () => {
    const result = scheduleMorningDelivery(input({ lines: [{ itemId: 'bolo-fuba', quantity: 1 }], slot: '08:30' }))
    expect(result.packaging).toBe('padrao')
  })

  it('rejects a slot earlier than the hot bake window', () => {
    expect(() => scheduleMorningDelivery(input({ lines: [{ itemId: 'esfiha', quantity: 1 }], slot: '07:30' }))).toThrow(
      'Janela 07:30 antes da fornada das 08:30'
    )
  })

  it('rejects invalid baskets', () => {
    expect(() => scheduleMorningDelivery(input({ lines: [] }))).toThrow('Adicione ao menos um item')
    expect(() => scheduleMorningDelivery(input({ lines: [{ itemId: 'pao-frances', quantity: 0 }] }))).toThrow('Quantidade inválida')
    expect(() => scheduleMorningDelivery(input({ lines: [{ itemId: 'pao-frances', quantity: 1.5 }] }))).toThrow('Quantidade inválida')
    expect(() => scheduleMorningDelivery(input({ lines: [{ itemId: 'torta', quantity: 1 }] }))).toThrow('Item desconhecido: torta')
    expect(() => scheduleMorningDelivery(input({ slot: '09:30' as MorningSlot }))).toThrow('Janela matinal inválida')
  })

  it('issues a valid random ticket by default and does not mutate the input', () => {
    const lines: BasketLine[] = [{ itemId: 'pao-frances', quantity: 3 }]
    const snapshot = structuredClone(lines)
    const result = scheduleMorningDelivery({ lines, mode: 'entrega', slot: '05:30', subscriber: false })
    expect(isTicketCode(result.ticket)).toBe(true)
    expect(lines).toEqual(snapshot)
  })
})
