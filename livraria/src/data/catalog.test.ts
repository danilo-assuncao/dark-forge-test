import { describe, expect, it } from 'vitest'
import { BOOKS, GENRES, booksByGenre, findBook } from './catalog'

describe('catalog', () => {
  it('has unique ids and valid prices', () => {
    expect(new Set(BOOKS.map((b) => b.id)).size).toBe(BOOKS.length)
    expect(BOOKS.every((b) => Number.isInteger(b.priceCents) && b.priceCents > 0)).toBe(true)
  })

  it('has at least one book per genre', () => {
    GENRES.forEach((genre) => expect(booksByGenre(genre).length).toBeGreaterThan(0))
  })

  it('filters by genre and finds by id', () => {
    expect(booksByGenre('All')).toHaveLength(BOOKS.length)
    expect(booksByGenre('Mystery').every((b) => b.genre === 'Mystery')).toBe(true)
    expect(findBook('dune')?.title).toBe('Dune')
    expect(findBook('nope')).toBeUndefined()
  })
})
