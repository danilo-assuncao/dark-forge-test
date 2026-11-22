import { describe, it, expect } from 'vitest'
import { listProperties, filterProperties, getPropertyById } from './properties'

describe('properties data', () => {
  it('should list all properties', () => {
    const properties = listProperties()
    expect(properties.length).toBeGreaterThan(0)
  })

  it('should filter properties by type', () => {
    const filtered = filterProperties({ type: 'casa' })
    expect(filtered.length).toBeGreaterThan(0)
    expect(filtered.every(p => p.type === 'casa')).toBe(true)
  })

  it('should filter properties by minBedrooms', () => {
    const filtered = filterProperties({ minBedrooms: 3 })
    expect(filtered.every(p => p.bedrooms >= 3)).toBe(true)
  })

  it('should filter properties by maxPriceBrl', () => {
    const filtered = filterProperties({ maxPriceBrl: 500000 })
    expect(filtered.every(p => p.priceBrl <= 500000)).toBe(true)
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
