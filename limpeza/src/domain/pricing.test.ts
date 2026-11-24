import { describe, expect, it } from 'vitest'
import { MAX_AREA, MIN_AREA, calculateQuote, formatCents, isValidArea } from './pricing'

describe('calculateQuote', () => {
  it('prices each package per square metre', () => {
    expect(calculateQuote(100, 'standard')?.totalCents).toBe(45000)
    expect(calculateQuote(100, 'heavy')?.totalCents).toBe(75000)
    expect(calculateQuote(100, 'postConstruction')?.totalCents).toBe(110000)
  })

  it('applies the package minimum for small areas', () => {
    expect(calculateQuote(10, 'standard')?.totalCents).toBe(12000)
    expect(calculateQuote(10, 'heavy')?.totalCents).toBe(20000)
    expect(calculateQuote(20, 'postConstruction')?.totalCents).toBe(35000)
  })

  it('adds extras and ignores duplicates', () => {
    const q = calculateQuote(100, 'standard', ['windows', 'oven', 'windows'])
    expect(q?.extrasCents).toBe(10000)
    expect(q?.totalCents).toBe(55000)
  })

  it('rounds fractional areas to whole cents', () => {
    expect(calculateQuote(33.33, 'standard')?.baseCents).toBe(14999)
  })

  it('rejects invalid areas', () => {
    for (const a of [NaN, Infinity, 0, -5, MIN_AREA - 0.1, MAX_AREA + 1]) {
      expect(calculateQuote(a, 'standard')).toBeNull()
    }
  })

  it('accepts boundary areas', () => {
    expect(isValidArea(MIN_AREA)).toBe(true)
    expect(isValidArea(MAX_AREA)).toBe(true)
  })
})

describe('formatCents', () => {
  it('formats cents as currency', () => {
    expect(formatCents(45050)).toBe('$450.50')
  })
})
