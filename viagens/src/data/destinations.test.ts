import { describe, it, expect } from 'vitest'
import {
  listDestinations,
  filterDestinationsByScope,
  getDestinationById
} from './destinations'

describe('destinations', () => {
  it('should list all destinations and have unique ids', () => {
    const list = listDestinations()
    expect(list.length).toBeGreaterThan(0)
    
    const ids = list.map((d) => d.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(list.length)
  })

  it('should filter destinations by scope accurately', () => {
    const all = listDestinations()
    const nacional = filterDestinationsByScope('nacional')
    const internacional = filterDestinationsByScope('internacional')
    
    expect(nacional.length).toBeGreaterThan(0)
    expect(nacional.every((d) => d.scope === 'nacional')).toBe(true)

    expect(internacional.length).toBeGreaterThan(0)
    expect(internacional.every((d) => d.scope === 'internacional')).toBe(true)
    
    expect(nacional.length + internacional.length).toBe(all.length)
  })

  it('should get destination by id', () => {
    const firstId = listDestinations()[0].id
    const dest = getDestinationById(firstId)
    expect(dest).toBeDefined()
    expect(dest?.id).toBe(firstId)

    const notFound = getDestinationById('non-existent')
    expect(notFound).toBeUndefined()
  })
})
