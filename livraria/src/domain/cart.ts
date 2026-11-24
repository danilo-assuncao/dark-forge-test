import type { Book, CartItem } from '../types'

export const addItem = (items: readonly CartItem[], bookId: string): CartItem[] =>
  items.some((item) => item.bookId === bookId)
    ? items.map((item) => (item.bookId === bookId ? { ...item, quantity: item.quantity + 1 } : item))
    : [...items, { bookId, quantity: 1 }]

export const removeItem = (items: readonly CartItem[], bookId: string): CartItem[] =>
  items.filter((item) => item.bookId !== bookId)

export const decrementItem = (items: readonly CartItem[], bookId: string): CartItem[] =>
  items.flatMap((item) =>
    item.bookId !== bookId ? [item] : item.quantity > 1 ? [{ ...item, quantity: item.quantity - 1 }] : []
  )

export const itemCount = (items: readonly CartItem[]): number =>
  items.reduce((sum, item) => sum + item.quantity, 0)

/** Total in cents. Integer math avoids floating-point drift; unknown books and invalid quantities are ignored. */
export const cartTotalCents = (items: readonly CartItem[], catalog: readonly Book[]): number =>
  items.reduce((sum, item) => {
    const book = catalog.find((candidate) => candidate.id === item.bookId)
    if (!book || !Number.isInteger(item.quantity) || item.quantity <= 0) return sum
    return sum + book.priceCents * item.quantity
  }, 0)

export const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`
