import type { LiveEventItem } from '../types'

const events: LiveEventItem[] = [
  {
    id: '1',
    name: 'Rock in Rio',
    city: 'Rio de Janeiro',
    date: '2027-09-02',
    sector: 'pista',
    batch: 1,
    benefit: 'inteira',
    price: 300
  },
  {
    id: '2',
    name: 'Lollapalooza',
    city: 'São Paulo',
    date: '2027-03-24',
    sector: 'vip',
    batch: 2,
    benefit: 'estudante',
    price: 450
  },
  {
    id: '3',
    name: 'Villa Mix',
    city: 'Goiânia',
    date: '2027-07-01',
    sector: 'camarote',
    batch: 3,
    benefit: 'inteira',
    price: 600
  }
]

export const listEvents = (): LiveEventItem[] => {
  return [...events]
}

const normalizeString = (str: string): string => {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export const filterEventsByCity = (city: string): LiveEventItem[] => {
  const normalizedSearch = normalizeString(city)
  return events.filter(event => normalizeString(event.city) === normalizedSearch)
}

export const getEventById = (id: string): LiveEventItem | undefined => {
  return events.find(event => event.id === id)
}
