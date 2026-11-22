import { describe, it, expect } from 'vitest'
import { listRoutes, listShippingModes, findRoute } from './zones'

describe('zones', () => {
  it('should list all routes', () => {
    const routes = listRoutes()
    expect(routes.length).toBeGreaterThan(0)
  })

  it('should list all shipping modes', () => {
    const modes = listShippingModes()
    expect(modes).toEqual(['economico', 'expresso', 'aereo-proximo-dia'])
  })

  it('should find an existing route', () => {
    const route = findRoute('SP', 'RJ')
    expect(route).toBeDefined()
    expect(route?.baseCost).toBe(50)
  })

  it('should return undefined for a non-existing route', () => {
    const route = findRoute('RR', 'AC')
    expect(route).toBeUndefined()
  })
})
