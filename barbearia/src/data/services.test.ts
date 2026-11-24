import { listBarbers, listServices } from './services'

describe('catalog', () => {
  it('lists all services', () => {
    expect(listServices()).toHaveLength(5)
  })

  it('filters services by category', () => {
    const barba = listServices('barba')
    expect(barba.length).toBeGreaterThan(0)
    expect(barba.every((s) => s.category === 'barba')).toBe(true)
  })

  it('lists all barbers', () => {
    expect(listBarbers().map((b) => b.id)).toEqual(['dan', 'rafa', 'bruno'])
  })

  it('filters barbers by service', () => {
    expect(listBarbers('degrade').map((b) => b.id)).toEqual(['dan', 'rafa'])
    expect(listBarbers('unknown')).toEqual([])
  })
})
