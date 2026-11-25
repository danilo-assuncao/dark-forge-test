import type { BakeCategory, MorningSlot } from '../types'
import { filterBakesByCategory, getBakeById, listBakes } from './bakes'

const CATEGORIES: BakeCategory[] = ['pao', 'doce', 'salgado', 'bolo']
const SLOTS: MorningSlot[] = ['05:30', '06:30', '07:30', '08:30']

describe('bakes catalog', () => {
  it('lists all bakes with unique ids', () => {
    const bakes = listBakes()
    expect(bakes).toHaveLength(8)
    expect(new Set(bakes.map((b) => b.id)).size).toBe(bakes.length)
  })

  it('returns a copy so callers cannot mutate the catalog', () => {
    const bakes = listBakes()
    bakes.pop()
    expect(listBakes()).toHaveLength(8)
  })

  it('covers every category and morning slot with valid prices', () => {
    const bakes = listBakes()
    expect(CATEGORIES.every((c) => bakes.some((b) => b.category === c))).toBe(true)
    expect(SLOTS.every((s) => bakes.some((b) => b.slot === s))).toBe(true)
    expect(bakes.every((b) => SLOTS.includes(b.slot))).toBe(true)
    expect(bakes.every((b) => Number.isInteger(b.priceCents) && b.priceCents > 0)).toBe(true)
  })

  it('filters bakes by category', () => {
    expect(filterBakesByCategory('pao').map((b) => b.id)).toEqual(['pao-frances', 'pao-integral', 'baguete'])
    expect(filterBakesByCategory('bolo').map((b) => b.id)).toEqual(['bolo-fuba'])
  })

  it('returns an empty list when no bake matches the category', () => {
    expect(filterBakesByCategory('torta' as BakeCategory)).toEqual([])
  })

  it('finds a bake by id', () => {
    expect(getBakeById('croissant')).toMatchObject({ name: 'Croissant de manteiga', category: 'doce', slot: '07:30' })
  })

  it('returns undefined for an unknown id', () => {
    expect(getBakeById('inexistente')).toBeUndefined()
    expect(getBakeById('')).toBeUndefined()
  })
})
