import { describe, it, expect } from 'vitest'
import { listProperties, filterProperties, getPropertyById } from './properties'

describe('properties data', () => {
  it('should list all properties', () => {
    const properties = listProperties()
    expect(properties.length).toBe(4)
  })

  it('should filter properties by type', () => {
    const filtered = filterProperties({ type: 'casa' })
    expect(filtered.map(p => p.id)).toEqual(['2'])
  })

  it('should filter properties by minBedrooms', () => {
    const filtered = filterProperties({ minBedrooms: 3 })
    expect(filtered.map(p => p.id)).toEqual(['2', '4'])
  })

  it('should filter properties by minBedrooms 0', () => {
    const filtered = filterProperties({ minBedrooms: 0 })
    expect(filtered.length).toBe(4)
  })

  it('should filter properties by maxPriceBrl', () => {
    const filtered = filterProperties({ maxPriceBrl: 450000 })
    expect(filtered.map(p => p.id)).toEqual(['1', '3'])
  })

  it('should combine filters', () => {
    const filtered = filterProperties({ type: 'apartamento', minBedrooms: 2, maxPriceBrl: 500000 })
    expect(filtered.map(p => p.id)).toEqual(['1'])
  })

  it('should return empty when no properties match', () => {
    const filtered = filterProperties({ type: 'studio', minBedrooms: 3 })
    expect(filtered).toEqual([])
  })

  it('should get property by id', () => {
    const property = getPropertyById('1')
    expect(property).toBeDefined()
    expect(property?.id).toBe('1')
  })

  it('should return undefined for non-existent id', () => {
    const property = getPropertyById('999')
    expect(property).toBeUndefined()
  })
})
