import { useState } from 'react'
import { BOOKS, GENRES, booksByGenre, findBook } from './data/catalog'
import { addItem, cartTotalCents, decrementItem, formatPrice, itemCount, removeItem } from './domain/cart'
import type { CartItem, Genre } from './types'

export default function App() {
  const [genre, setGenre] = useState<Genre | 'All'>('All')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

  const selected = selectedId ? findBook(selectedId) : undefined
  const books = booksByGenre(genre)

  return (
    <div className="app">
      <header className="header">
        <h1>Dan Books</h1>
        <p>{itemCount(cart)} item(s) in cart</p>
      </header>

      <nav aria-label="Genres" className="genres">
        {(['All', ...GENRES] as const).map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={g === genre}
            onClick={() => {
              setGenre(g)
              setSelectedId(null)
            }}
          >
            {g}
          </button>
        ))}
      </nav>

      <main className="layout">
        <section aria-label="Books">
          {selected ? (
            <article className="details">
              <button type="button" onClick={() => setSelectedId(null)}>
                ← Back to catalog
              </button>
              <h2>{selected.title}</h2>
              <p>
                {selected.author} · {selected.genre} · {selected.year}
              </p>
              <p>{selected.description}</p>
              <p className="price">{formatPrice(selected.priceCents)}</p>
              <button type="button" onClick={() => setCart((c) => addItem(c, selected.id))}>
                Add to cart
              </button>
            </article>
          ) : (
            <ul className="grid">
              {books.map((book) => (
                <li key={book.id} className="card">
                  <h2>{book.title}</h2>
                  <p>{book.author}</p>
                  <p className="price">{formatPrice(book.priceCents)}</p>
                  <button type="button" onClick={() => setSelectedId(book.id)}>
                    Details
                  </button>
                  <button type="button" onClick={() => setCart((c) => addItem(c, book.id))}>
                    Add {book.title} to cart
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-label="Shopping cart" className="cart">
          <h2>Cart</h2>
          {cart.length === 0 ? (
            <p>Your cart is empty.</p>
          ) : (
            <ul>
              {cart.map((item) => {
                const book = findBook(item.bookId)
                if (!book) return null
                return (
                  <li key={item.bookId}>
                    <span>
                      {book.title} × {item.quantity}
                    </span>
                    <button type="button" aria-label={`Decrease ${book.title}`} onClick={() => setCart((c) => decrementItem(c, book.id))}>
                      −
                    </button>
                    <button type="button" aria-label={`Increase ${book.title}`} onClick={() => setCart((c) => addItem(c, book.id))}>
                      +
                    </button>
                    <button type="button" aria-label={`Remove ${book.title}`} onClick={() => setCart((c) => removeItem(c, book.id))}>
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
          <p className="total">Total: {formatPrice(cartTotalCents(cart, BOOKS))}</p>
        </aside>
      </main>
    </div>
  )
}
