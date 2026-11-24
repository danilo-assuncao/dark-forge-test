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
  const pick = (name: RegExp | string) => fireEvent.click(screen.getByRole('button', { name }))

  it('books a slot and then removes it from availability', () => {
    render(<App now={() => NOW} random={() => 0.1234} />)
    expect(nextDays(NOW, 7)[1]).toBe('2030-01-08')

    pick(/Dan/)
    pick(/Corte de cabelo/)
    pick(/ter 08\/01/)
    pick('09:00')

    const confirmBtn = screen.getByRole('button', { name: 'Confirmar agendamento' })
    expect(confirmBtn).toBeDisabled()
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'João' } })
    fireEvent.click(confirmBtn)

    expect(screen.getByText('Agendamento confirmado!')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('João')
    expect(screen.getByRole('status')).toHaveTextContent('09:00')
    expect(screen.getByRole('status')).toHaveTextContent('BRB-1234')

    pick('Novo agendamento')
    pick(/Dan/)
    pick(/Corte de cabelo/)
    pick(/ter 08\/01/)
    expect(screen.queryByRole('button', { name: '09:00' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '09:30' })).toBeInTheDocument()
  })

  it('only lists services the chosen barber performs, grouped by category', () => {
    render(<App now={() => NOW} />)
    expect(screen.queryByRole('group', { name: /Serviços de/ })).not.toBeInTheDocument()
    pick(/Rafa/)
    expect(screen.getByRole('group', { name: 'Serviços de Cabelo' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Serviços de Barba' })).not.toBeInTheDocument()
    pick(/Bruno/)
    expect(screen.getByRole('group', { name: 'Serviços de Barba' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Serviços de Cabelo' })).not.toBeInTheDocument()
  })

  it('highlights the combo category', () => {
    render(<App now={() => NOW} />)
    pick(/Dan/)
    const combo = screen.getByRole('group', { name: /Combo Corte \+ Barba/ })
    expect(combo).toHaveClass('combo-highlight')
    expect(combo).toHaveTextContent('Destaque')
  })

  it('applies combo, VIP and coupon discounts and add-ons to the total', () => {
    render(<App now={() => NOW} />)
    pick(/Dan/)
    pick(/Corte de cabelo/)
    pick(/Barba completa/)
    pick(/Toalha quente/)
    pick(/ter 08\/01/)
    pick('09:00')
    // 4500 + 3500 + 1000 = 9000; combo 15% -> 7650
    expect(screen.getByLabelText('Resumo do valor')).toHaveTextContent('Combo Corte + Barba (-15%)')
    fireEvent.click(screen.getByLabelText(/Clube VIP/))
    fireEvent.change(screen.getByLabelText('Cupom de desconto'), { target: { value: 'danbarber10' } })
    const summary = screen.getByLabelText('Resumo do valor')
    expect(summary).toHaveTextContent('Clube VIP (-20%)')
    expect(summary).toHaveTextContent('Cupom (-10%)')
    // 7650 -> 6120 -> 5508
    expect(summary).toHaveTextContent(/Total\s*R\$\s*55,08/)
  })

  it('extends the blocked time when add-ons are selected', () => {
    render(<App now={() => NOW} random={() => 0.5} />)
    pick(/Dan/)
    pick(/Corte de cabelo/)
    pick(/Vapor de ozônio/)
    pick(/ter 08\/01/)
    pick('09:00')
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Ana' } })
    pick('Confirmar agendamento')
    expect(screen.getByRole('status')).toHaveTextContent('40 min')

    pick('Novo agendamento')
    pick(/Dan/)
    pick(/Corte de cabelo/)
    pick(/ter 08\/01/)
    expect(screen.queryByRole('button', { name: '09:30' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10:00' })).toBeInTheDocument()
  })
})
