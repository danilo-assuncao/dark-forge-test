import { describe, it, expect } from 'vitest'
import { listEvents, filterEventsByCity, getEventById } from './events'

describe('events data', () => {
  it('listEvents should return all events', () => {
    const events = listEvents()
    expect(events.length).toBe(3)
    expect(events.map(e => e.id)).toEqual(['1', '2', '3'])
  })

  it('listEvents should not mutate the original data if modified', () => {
    const events = listEvents()
    events.push({
      id: '99',
      name: 'Fake Event',
      city: 'Test City',
      date: '2027-01-01',
      sector: 'pista',
      batch: 1,
      benefit: 'inteira',
      price: 100
    })
    
    const freshEvents = listEvents()
    expect(freshEvents.length).toBe(3)
    expect(freshEvents.find(e => e.id === '99')).toBeUndefined()
  })

  it('filterEventsByCity should return events for a specific city ignoring case and accents', () => {
    const events = filterEventsByCity('sao paulo')
    expect(events.length).toBe(1)
    expect(events[0].name).toBe('Lollapalooza')
  })

  it('filterEventsByCity should ignore extra whitespace', () => {
    const events = filterEventsByCity('  são paulo   ')
    expect(events.length).toBe(1)
    expect(events[0].name).toBe('Lollapalooza')
  })

  it('filterEventsByCity should return empty array if city not found', () => {
    const events = filterEventsByCity('curitiba')
    expect(events.length).toBe(0)
  })

  it('getEventById should return event if id exists', () => {
    const event = getEventById('1')
    expect(event).toBeDefined()
    expect(event?.name).toBe('Rock in Rio')
  })

  it('getEventById should return undefined if id not found', () => {
    const event = getEventById('999')
    expect(event).toBeUndefined()
  })
})
