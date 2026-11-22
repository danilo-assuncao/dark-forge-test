import { describe, it, expect } from 'vitest'
import { listPetServices, listGroomingAddons, getServiceById } from './catalog'

describe('catalog data', () => {
  it('should list at least 6 pet services', () => {
    const services = listPetServices()
    expect(services.length).toBeGreaterThanOrEqual(6)
  })

  it('should list grooming addons', () => {
    const addons = listGroomingAddons()
    expect(addons.length).toBeGreaterThan(0)
  })

  it('should get a service by id', () => {
    const service = getServiceById('s1')
    expect(service).toBeDefined()
    expect(service?.id).toBe('s1')
  })

  it('should return undefined for unknown service id', () => {
    const service = getServiceById('unknown-id')
    expect(service).toBeUndefined()
  })

  it('should return undefined for empty string and wrong case', () => {
    expect(getServiceById('')).toBeUndefined()
    expect(getServiceById('S1')).toBeUndefined()
  })

  it('should have unique ids for all services', () => {
    const services = listPetServices()
    const ids = services.map((s) => s.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have unique ids for all grooming addons', () => {
    const addons = listGroomingAddons()
    const ids = addons.map((a) => a.id)
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('should have positive prices and basePrice equal to pequeno price for services', () => {
    const services = listPetServices()
    for (const service of services) {
      expect(service.basePrice).toBeGreaterThan(0)
      expect(service.priceBySize.pequeno).toBeGreaterThan(0)
      expect(service.priceBySize.medio).toBeGreaterThan(0)
      expect(service.priceBySize.grande).toBeGreaterThan(0)
      expect(service.basePrice).toBe(service.priceBySize.pequeno)
    }
  })

  it('should have positive prices for grooming addons', () => {
    const addons = listGroomingAddons()
    for (const addon of addons) {
      expect(addon.price).toBeGreaterThan(0)
    }
  })
})
