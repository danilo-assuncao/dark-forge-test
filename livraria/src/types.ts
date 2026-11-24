export type Genre = 'Fiction' | 'Fantasy' | 'Science Fiction' | 'Mystery' | 'Non-Fiction'

export type Book = {
  id: string
  title: string
  author: string
  genre: Genre
  priceCents: number
  year: number
  description: string
}

export type CartItem = {
  bookId: string
  quantity: number
}
