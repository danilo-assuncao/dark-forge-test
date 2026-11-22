import { describe, it, expect } from 'vitest'
import { listEvents, filterEventsByCity, getEventById } from './events'

describe('events data', () => {
  it('listEvents should return all events', () => {
    const events = listEvents()
    expect(events.length).toBeGreaterThan(0)
  })

  it('filterEventsByCity should return events for a specific city', () => {
    const events = filterEventsByCity('são paulo')
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
