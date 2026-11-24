import { professionals, services } from '../data/seed'
import type { Booking, Service } from '../types'
import {
  confirmBarberAppointment,
  generateComandaCode,
  isBarberAvailable,
  isComandaCode,
  totalDurationMin,
  totalPriceCents
} from './schedule'

const byId: Record<string, Service> = Object.fromEntries(services.map((s) => [s.id, s]))
const dan = professionals[0]
const corte = byId.corte
const barba = byId.barba
// 2026-11-25 is a Wednesday (Dan works)
const date = '2026-11-25'
const now = new Date(2026, 10, 24, 12, 0)

describe('totals', () => {
  it('sums service durations', () => {
    expect(totalDurationMin([corte, barba])).toBe(60)
    expect(totalDurationMin([])).toBe(0)
  })

  it('includes add-ons in duration and price', () => {
    expect(totalDurationMin([corte], ['toalha-quente', 'vapor-ozonio'])).toBe(45)
    expect(totalPriceCents([corte], ['toalha-quente', 'vapor-ozonio'])).toBe(7000)
  })

  it('ignores duplicated add-ons and rejects unknown ones', () => {
    expect(totalPriceCents([corte], ['vapor-ozonio', 'vapor-ozonio'])).toBe(6000)
    expect(() => totalDurationMin([corte], ['x'])).toThrow()
  })
})

describe('isBarberAvailable', () => {
  const booking: Booking = {
    id: 'b1',
    professionalId: 'dan',
    serviceId: 'corte',
    date,
    time: '09:00',
    clientName: 'Ana'
  }

  it('accepts a free slot and rejects a busy one', () => {
    expect(isBarberAvailable(dan, 30, date, '09:30', [booking], byId, now)).toBe(true)
    expect(isBarberAvailable(dan, 30, date, '09:00', [booking], byId, now)).toBe(false)
  })

  it('rejects overlap, off-days and outside working hours', () => {
    expect(isBarberAvailable(dan, 60, date, '09:00', [booking], byId, now)).toBe(false)
    expect(isBarberAvailable(dan, 30, '2026-11-23', '10:00', [], byId, now)).toBe(false)
    expect(isBarberAvailable(dan, 60, date, '17:30', [], byId, now)).toBe(false)
  })
})

describe('comanda code', () => {
  it('matches BRB-XXXX', () => {
    expect(generateComandaCode(() => 0)).toBe('BRB-0000')
    expect(generateComandaCode(() => 0.99999)).toBe('BRB-9999')
    expect(isComandaCode(generateComandaCode())).toBe(true)
    expect(isComandaCode('BRB-12')).toBe(false)
  })
})

describe('confirmBarberAppointment', () => {
  const base = { professional: dan, services: [corte], date, time: '10:00', clientName: ' Joao ' }
  const ctx = { bookings: [], servicesById: byId, now, random: () => 0.1234 }

  it('issues a comanda', () => {
    expect(confirmBarberAppointment({ ...base, addonIds: ['toalha-quente'] }, ctx)).toEqual({
      code: 'BRB-1234',
      barberId: 'dan',
      clientName: 'Joao',
      date,
      time: '10:00',
      serviceIds: ['corte'],
      addonIds: ['toalha-quente'],
      durationMin: 35,
      totalCents: 5500
    })
  })

  it('rejects unavailable times', () => {
    const bookings: Booking[] = [
      { id: 'b', professionalId: 'dan', serviceId: 'corte', date, time: '10:00', clientName: 'A' }
    ]
    expect(() => confirmBarberAppointment(base, { ...ctx, bookings })).toThrow('indisponível')
  })

  it('rejects invalid requests', () => {
    expect(() => confirmBarberAppointment({ ...base, clientName: ' ' }, ctx)).toThrow()
    expect(() => confirmBarberAppointment({ ...base, services: [] }, ctx)).toThrow()
    expect(() =>
      confirmBarberAppointment({ ...base, professional: professionals[1], services: [barba] }, ctx)
    ).toThrow('não realiza')
  })
})
