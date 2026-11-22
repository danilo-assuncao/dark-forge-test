import { describe, it, expect } from 'vitest'
import { listRoutes, listShippingModes, findRoute } from './zones'

describe('zones', () => {
  it('should list all routes and protect from mutation', () => {
    const routes = listRoutes()
    expect(routes.length).toBe(9)
    // verify it's a copy
    routes.push({ originUf: 'XX', destUf: 'YY', baseCost: 10, estimatedDays: 1 })
    expect(listRoutes().length).toBe(9)
  })

  it('should list all shipping modes and protect from mutation', () => {
    const modes = listShippingModes()
    expect(modes).toEqual(['economico', 'expresso', 'aereo-proximo-dia'])
    modes.push('economico')
    expect(listShippingModes().length).toBe(3)
  })

  it('should find an existing route', () => {
    const route = findRoute('SP', 'RJ')
    expect(route).toBeDefined()
    expect(route?.baseCost).toBe(50)
  })

  it('should find a route regardless of case', () => {
    const route = findRoute('sp', 'rj')
    expect(route).toBeDefined()
    expect(route?.baseCost).toBe(50)
  })

  it('should find reversed direction route', () => {
    const route = findRoute('RJ', 'SP')
    expect(route).toBeDefined()
    expect(route?.baseCost).toBe(50)
  })

  it('should find same-UF route', () => {
    const route = findRoute('SP', 'SP')
    expect(route).toBeDefined()
    expect(route?.baseCost).toBe(20)
  })

  it('should return undefined for a non-existing route', () => {
    const route = findRoute('RR', 'AC')
    expect(route).toBeUndefined()
  })
})
