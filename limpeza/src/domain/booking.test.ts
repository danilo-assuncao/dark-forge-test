import { describe, expect, it } from 'vitest'
import { EMPTY_BOOKING, validateBooking, type BookingForm } from './booking'

const today = new Date(2026, 5, 15)
const valid: BookingForm = {
  name: 'Maria Silva',
  email: 'maria@example.com',
  phone: '(11) 91234-5678',
  address: '12 Main Street',
  date: '2026-06-16',
  time: '09:30'
}

describe('validateBooking', () => {
  it('accepts a valid form', () => {
    expect(validateBooking(valid, today)).toEqual({})
  })

  it('flags every field of an empty form', () => {
    expect(Object.keys(validateBooking(EMPTY_BOOKING, today)).sort()).toEqual(
      ['address', 'date', 'email', 'name', 'phone', 'time']
    )
  })

  it('rejects bad email and phone', () => {
    const e = validateBooking({ ...valid, email: 'nope@', phone: '123' }, today)
    expect(e.email).toBeDefined()
    expect(e.phone).toBeDefined()
  })

  it('rejects today, past and impossible dates', () => {
    expect(validateBooking({ ...valid, date: '2026-06-15' }, today).date).toBeDefined()
    expect(validateBooking({ ...valid, date: '2026-01-01' }, today).date).toBeDefined()
    expect(validateBooking({ ...valid, date: '2026-02-30' }, today).date).toBeDefined()
  })

  it('enforces business hours', () => {
    expect(validateBooking({ ...valid, time: '07:59' }, today).time).toBeDefined()
    expect(validateBooking({ ...valid, time: '18:01' }, today).time).toBeDefined()
    expect(validateBooking({ ...valid, time: '08:00' }, today).time).toBeUndefined()
    expect(validateBooking({ ...valid, time: '18:00' }, today).time).toBeUndefined()
  })
})
