import { describe, it, expect } from 'vitest'
import { listSuites, filterSuitesByGuests, getSuiteById } from './suites'

describe('Suites Data', () => {
  it('lists all suites', () => {
    const suites = listSuites()
    expect(suites).toHaveLength(3)
  })

  it('filters suites by guests', () => {
    const suites = filterSuitesByGuests(4)
    expect(suites.map((s) => s.id)).toEqual(['s2', 's3'])

    expect(filterSuitesByGuests(7)).toEqual([])
    expect(filterSuitesByGuests(1).length).toBe(3)
  })

  it('gets a suite by id', () => {
    const suite = getSuiteById('s2')
    expect(suite).toMatchObject({ name: 'Ocean View Suite', tier: 'vista-mar' })
  })

  it('returns undefined for non-existent id', () => {
    const suite = getSuiteById('invalid')
    expect(suite).toBeUndefined()
  })
})
