import type { Book, Genre } from '../types'

export const GENRES: readonly Genre[] = ['Fiction', 'Fantasy', 'Science Fiction', 'Mystery', 'Non-Fiction']

export const BOOKS: readonly Book[] = [
  { id: 'dom-casmurro', title: 'Dom Casmurro', author: 'Machado de Assis', genre: 'Fiction', priceCents: 3490, year: 1899, description: 'Bentinho recounts his love for Capitu and the doubt that consumed him.' },
  { id: 'grande-sertao', title: 'Grande Sertão: Veredas', author: 'João Guimarães Rosa', genre: 'Fiction', priceCents: 5990, year: 1956, description: 'A former jagunço tells his life story in the backlands of Brazil.' },
  { id: 'the-hobbit', title: 'The Hobbit', author: 'J.R.R. Tolkien', genre: 'Fantasy', priceCents: 4290, year: 1937, description: 'Bilbo Baggins joins a company of dwarves to reclaim a lost mountain kingdom.' },
  { id: 'a-wizard-of-earthsea', title: 'A Wizard of Earthsea', author: 'Ursula K. Le Guin', genre: 'Fantasy', priceCents: 3990, year: 1968, description: 'A young mage must face the shadow he unleashed.' },
  { id: 'dune', title: 'Dune', author: 'Frank Herbert', genre: 'Science Fiction', priceCents: 5490, year: 1965, description: 'Politics, religion and ecology collide on the desert planet Arrakis.' },
  { id: 'neuromancer', title: 'Neuromancer', author: 'William Gibson', genre: 'Science Fiction', priceCents: 4590, year: 1984, description: 'A washed-up hacker takes one last job in cyberspace.' },
  { id: 'murder-orient-express', title: 'Murder on the Orient Express', author: 'Agatha Christie', genre: 'Mystery', priceCents: 3690, year: 1934, description: 'Hercule Poirot investigates a murder aboard a snowbound train.' },
  { id: 'the-big-sleep', title: 'The Big Sleep', author: 'Raymond Chandler', genre: 'Mystery', priceCents: 3890, year: 1939, description: 'Philip Marlowe is hired by a dying general to deal with blackmail.' },
  { id: 'sapiens', title: 'Sapiens', author: 'Yuval Noah Harari', genre: 'Non-Fiction', priceCents: 5290, year: 2011, description: 'A brief history of humankind from the Stone Age to the present.' },
  { id: 'cosmos', title: 'Cosmos', author: 'Carl Sagan', genre: 'Non-Fiction', priceCents: 4890, year: 1980, description: 'A personal voyage through the universe and the history of science.' }
]

export const findBook = (id: string): Book | undefined => BOOKS.find((book) => book.id === id)

export const booksByGenre = (genre: Genre | 'All'): readonly Book[] =>
  genre === 'All' ? BOOKS : BOOKS.filter((book) => book.genre === genre)
