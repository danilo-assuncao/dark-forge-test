import { describe, expect, it } from 'vitest'
import { BOOKS } from '../data/catalog'
import type { Book } from '../types'
import { addItem, cartTotalCents, decrementItem, formatPrice, itemCount, removeItem } from './cart'

const catalog: Book[] = [
  { id: 'a', title: 'A', author: 'X', genre: 'Fiction', priceCents: 1999, year: 2000, description: '' },
  { id: 'b', title: 'B', author: 'Y', genre: 'Fantasy', priceCents: 10, year: 2001, description: '' }
]

describe('cartTotalCents', () => {
  it('returns 0 for an empty cart', () => {
    expect(cartTotalCents([], catalog)).toBe(0)
  })

  it('multiplies price by quantity and sums lines', () => {
    expect(cartTotalCents([{ bookId: 'a', quantity: 2 }, { bookId: 'b', quantity: 3 }], catalog)).toBe(4028)
  })

  it('avoids floating-point drift', () => {
    expect(cartTotalCents([{ bookId: 'b', quantity: 3 }], catalog)).toBe(30)
  })

  it('ignores unknown books and invalid quantities', () => {
    expect(
      cartTotalCents(
        [{ bookId: 'zzz', quantity: 1 }, { bookId: 'a', quantity: 0 }, { bookId: 'a', quantity: -1 }, { bookId: 'a', quantity: 1.5 }],
        catalog
      )
    ).toBe(0)
  })

  it('works with the seed catalog', () => {
    expect(cartTotalCents([{ bookId: 'dune', quantity: 2 }], BOOKS)).toBe(10980)
  })
})

describe('cart operations', () => {
  it('adds a new item and increments an existing one', () => {
    const once = addItem([], 'a')
    expect(once).toEqual([{ bookId: 'a', quantity: 1 }])
    expect(addItem(once, 'a')).toEqual([{ bookId: 'a', quantity: 2 }])
  })

  it('removes a line entirely', () => {
    expect(removeItem([{ bookId: 'a', quantity: 2 }, { bookId: 'b', quantity: 1 }], 'a')).toEqual([{ bookId: 'b', quantity: 1 }])
  })

  it('decrements and drops the line at zero', () => {
    expect(decrementItem([{ bookId: 'a', quantity: 2 }], 'a')).toEqual([{ bookId: 'a', quantity: 1 }])
    expect(decrementItem([{ bookId: 'a', quantity: 1 }], 'a')).toEqual([])
  })

  it('counts items and formats prices', () => {
    expect(itemCount([{ bookId: 'a', quantity: 2 }, { bookId: 'b', quantity: 1 }])).toBe(3)
    expect(formatPrice(1999)).toBe('$19.99')
  })
})
