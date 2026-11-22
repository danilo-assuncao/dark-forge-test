import { describe, it, expect } from 'vitest'
import {
  listDestinations,
  filterDestinationsByScope,
  getDestinationById
} from './destinations'

describe('destinations', () => {
  it('should list all destinations', () => {
    const list = listDestinations()
    expect(list.length).toBeGreaterThan(0)
  })

  it('should filter destinations by scope', () => {
    const nacional = filterDestinationsByScope('nacional')
    expect(nacional.every((d) => d.scope === 'nacional')).toBe(true)

    const internacional = filterDestinationsByScope('internacional')
    expect(internacional.every((d) => d.scope === 'internacional')).toBe(true)
  })

  it('should get destination by id', () => {
    const dest = getDestinationById('1')
    expect(dest).toBeDefined()
    expect(dest?.id).toBe('1')

    const notFound = getDestinationById('non-existent')
    expect(notFound).toBeUndefined()
  })
})
