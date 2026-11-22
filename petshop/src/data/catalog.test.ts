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
    expect(service?.name).toBe('Banho Simples')
  })

  it('should return undefined for unknown service id', () => {
    const service = getServiceById('unknown-id')
    expect(service).toBeUndefined()
  })
})
