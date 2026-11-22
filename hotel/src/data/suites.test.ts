import { describe, it, expect } from 'vitest'
import { listSuites, filterSuitesByGuests, getSuiteById } from './suites'

describe('Suites Data', () => {
  it('lists all suites', () => {
    const suites = listSuites()
    expect(suites.length).toBeGreaterThan(0)
  })

  it('filters suites by guests', () => {
    const suites = filterSuitesByGuests(4)
    expect(suites.every((s) => s.maxGuests >= 4)).toBe(true)
  })

  it('gets a suite by id', () => {
    const suite = getSuiteById('s2')
    expect(suite?.id).toBe('s2')
  })

  it('returns undefined for non-existent id', () => {
    const suite = getSuiteById('invalid')
    expect(suite).toBeUndefined()
  })
})
