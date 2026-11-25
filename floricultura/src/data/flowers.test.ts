import type { FlowerSpecies } from '../types'
import { filterFlowersBySpecies, getFlowerById, listFlowers } from './flowers'

const ALL_SPECIES: FlowerSpecies[] = [
  'rosa',
  'tulipa',
  'girassol',
  'orquidea',
  'lirio',
  'margarida'
]

describe('listFlowers', () => {
  it('returns at least six flowers', () => {
    expect(listFlowers().length).toBeGreaterThanOrEqual(6)
  })

  it('has unique ids', () => {
    const ids = listFlowers().map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses positive integer prices in cents and non-negative stock', () => {
    for (const flower of listFlowers()) {
      expect(Number.isInteger(flower.priceCents)).toBe(true)
      expect(flower.priceCents).toBeGreaterThan(0)
      expect(Number.isInteger(flower.stockStems)).toBe(true)
      expect(flower.stockStems).toBeGreaterThanOrEqual(0)
    }
  })

  it('covers every species at least once', () => {
    const species = new Set(listFlowers().map((f) => f.species))
    for (const s of ALL_SPECIES) {
      expect(species.has(s)).toBe(true)
    }
  })

  it('returns a copy that callers cannot use to mutate the catalog', () => {
    const size = listFlowers().length
    const first = listFlowers()
    first.pop()
    first.push({ ...first[0], id: 'intrusa' })
    first[0].priceCents = 1
    expect(listFlowers()).toHaveLength(size)
    expect(getFlowerById('intrusa')).toBeUndefined()
    expect(listFlowers()[0].priceCents).not.toBe(1)
  })
})

describe('filterFlowersBySpecies', () => {
  it('returns only flowers of the requested species', () => {
    const roses = filterFlowersBySpecies('rosa')
    expect(roses.length).toBeGreaterThan(0)
    expect(roses.every((f) => f.species === 'rosa')).toBe(true)
  })

  it('returns the whole catalog when no species is given', () => {
    expect(filterFlowersBySpecies()).toEqual(listFlowers())
  })

  it('returns an empty list for a species without flowers', () => {
    expect(filterFlowersBySpecies('cacto' as string as FlowerSpecies)).toEqual(
      []
    )
  })

  it('partitions the catalog by species', () => {
    const total = ALL_SPECIES.reduce(
      (sum, s) => sum + filterFlowersBySpecies(s).length,
      0
    )
    expect(total).toBe(listFlowers().length)
  })
})

describe('getFlowerById', () => {
  it('returns the flower with the requested id', () => {
    expect(getFlowerById('girassol')).toMatchObject({
      id: 'girassol',
      species: 'girassol'
    })
  })

  it('returns undefined for unknown or empty ids', () => {
    expect(getFlowerById('unknown')).toBeUndefined()
    expect(getFlowerById('')).toBeUndefined()
  })

  it('matches ids exactly (case-sensitive)', () => {
    expect(getFlowerById('GIRASSOL')).toBeUndefined()
  })

  it('round-trips every catalog item', () => {
    for (const flower of listFlowers()) {
      expect(getFlowerById(flower.id)).toEqual(flower)
    }
  })
})
