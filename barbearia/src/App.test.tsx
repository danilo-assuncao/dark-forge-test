import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'
import { professionals, services } from './data/seed'
import { availableSlots, formatDate, nextDays } from './domain/schedule'
import type { Booking, Service } from './types'

// Monday 2030-01-07 08:00 local
const NOW = new Date(2030, 0, 7, 8, 0)
const servicesById: Record<string, Service> = Object.fromEntries(services.map((s) => [s.id, s]))
const dan = professionals[0]

describe('seed data', () => {
  it('has professionals and services for hair and beard', () => {
    expect(professionals.length).toBeGreaterThan(1)
    expect(services.some((s) => s.category === 'cabelo')).toBe(true)
    expect(services.some((s) => s.category === 'barba')).toBe(true)
  })
})

describe('availableSlots', () => {
  const corte = servicesById['corte']
  it('returns nothing on non-working days', () => {
    // Monday: Dan does not work
    expect(availableSlots(dan, corte, formatDate(NOW), [], servicesById, NOW)).toEqual([])
  })
  it('excludes booked and overlapping slots', () => {
    const booking: Booking = {
      id: 'x', professionalId: 'dan', serviceId: 'combo',
      date: '2030-01-08', time: '10:00', clientName: 'A'
    }
    const slots = availableSlots(dan, corte, '2030-01-08', [booking], servicesById, NOW)
    expect(slots).toContain('09:30')
    expect(slots).not.toContain('10:00')
    expect(slots).not.toContain('10:30')
    expect(slots).toContain('11:00')
  })
  it('hides past times today', () => {
    const late = new Date(2030, 0, 8, 12, 0)
    const slots = availableSlots(dan, corte, '2030-01-08', [], servicesById, late)
    expect(slots[0]).toBe('12:30')
  })
  it('does not exceed closing time', () => {
    const slots = availableSlots(dan, servicesById['combo'], '2030-01-08', [], servicesById, NOW)
    expect(slots[slots.length - 1]).toBe('17:00')
  })
})

describe('booking flow', () => {
  it('books a slot and then removes it from availability', () => {
    const now = () => NOW
    render(<App now={now} />)
    const tuesday = nextDays(NOW, 7)[1]
    expect(tuesday).toBe('2030-01-08')

    fireEvent.click(screen.getByRole('button', { name: /Corte de cabelo/ }))
    fireEvent.click(screen.getByRole('button', { name: /Dan/ }))
    fireEvent.click(screen.getByRole('button', { name: /ter 08\/01/ }))
    fireEvent.click(screen.getByRole('button', { name: '09:00' }))

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar agendamento' })
    expect(confirmBtn).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'João' } })
    fireEvent.click(confirmBtn)

    expect(screen.getByText('Agendamento confirmado!')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('João')
    expect(screen.getByRole('status')).toHaveTextContent('09:00')

    fireEvent.click(screen.getByRole('button', { name: 'Novo agendamento' }))
    fireEvent.click(screen.getByRole('button', { name: /Corte de cabelo/ }))
    fireEvent.click(screen.getByRole('button', { name: /Dan/ }))
    fireEvent.click(screen.getByRole('button', { name: /ter 08\/01/ }))
    expect(screen.queryByRole('button', { name: '09:00' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '09:30' })).toBeInTheDocument()
  })

  it('only lists professionals who perform the chosen service', () => {
    render(<App now={() => NOW} />)
    fireEvent.click(screen.getByRole('button', { name: /Barba completa/ }))
    expect(screen.getByRole('button', { name: /Bruno/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Rafa/ })).not.toBeInTheDocument()
  })
})
