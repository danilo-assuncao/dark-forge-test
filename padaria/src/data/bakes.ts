import type { BakeCategory, BakeryItem } from '../types'

const bakes: readonly BakeryItem[] = [
  { id: 'pao-frances', name: 'Pão francês', category: 'pao', priceCents: 100, slot: '05:30' },
  { id: 'pao-integral', name: 'Pão integral', category: 'pao', priceCents: 1200, slot: '06:30' },
  { id: 'baguete', name: 'Baguete', category: 'pao', priceCents: 900, slot: '07:30' },
  { id: 'sonho', name: 'Sonho de creme', category: 'doce', priceCents: 650, slot: '06:30' },
  { id: 'croissant', name: 'Croissant de manteiga', category: 'doce', priceCents: 800, slot: '07:30' },
  { id: 'pao-de-queijo', name: 'Pão de queijo', category: 'salgado', priceCents: 450, slot: '05:30' },
  { id: 'esfiha', name: 'Esfiha de carne', category: 'salgado', priceCents: 700, slot: '08:30' },
  { id: 'bolo-fuba', name: 'Bolo de fubá', category: 'bolo', priceCents: 2500, slot: '08:30' }
]

export const listBakes = (): BakeryItem[] => [...bakes]

export const filterBakesByCategory = (category: BakeCategory): BakeryItem[] =>
  bakes.filter((b) => b.category === category)

export const getBakeById = (id: string): BakeryItem | undefined =>
  bakes.find((b) => b.id === id)
