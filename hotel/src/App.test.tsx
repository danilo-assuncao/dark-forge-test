import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders Dan Stay SPA heading', () => {
    render(<App />)
    expect(screen.getByText('Dan Stay SPA')).toBeInTheDocument()
  })

  it('filters suites and calculates booking summary correctly (long stay discount)', async () => {
    render(<App />)
    
    // Set check-in and check-out
    const checkInInput = screen.getByLabelText(/Check-in:/i)
    const checkOutInput = screen.getByLabelText(/Check-out:/i)
    
    fireEvent.change(checkInInput, { target: { value: '2027-10-10' } })
    fireEvent.change(checkOutInput, { target: { value: '2027-10-15' } }) // 5 noites
    
    // Select suite (s1 is Standard Room, default guests 2)
    const suiteCard = screen.getByText('Standard Room')
    fireEvent.click(suiteCard)
    
    // Select loyalty tier
    const loyaltySelect = screen.getByLabelText(/Nível Fidelidade:/i)
    fireEvent.change(loyaltySelect, { target: { value: 'ouro' } })

    // Book
    const bookButton = screen.getByText(/Calcular e Reservar/i)
    fireEvent.click(bookButton)

    // Check voucher details
    await waitFor(() => {
      expect(screen.getByText(/Voucher: HTL-/)).toBeInTheDocument()
    })
    
    // Subtotal (Quarto): 500
    // Long stay discount = 60 (12%)
    // Ouro discount = 40 (8% of 500)
    // Total discount = 100
    const roomTotalText = screen.getByText((_, element) => {
      return element?.textContent === 'Subtotal (Quarto): R$ 500.00'
    })
    expect(roomTotalText).toBeInTheDocument()
    
    const discountText = screen.getByText((_, element) => {
      return element?.textContent === 'Desconto: R$ 100.00'
    })
    expect(discountText).toBeInTheDocument()

    const totalText = screen.getByText((_, element) => {
      return element?.textContent === 'Total: R$ 400.00'
    })
    expect(totalText).toBeInTheDocument()
  })

  it('shows error message if suite is not selected', () => {
    render(<App />)
    const bookButton = screen.getByText(/Calcular e Reservar/i)
    fireEvent.click(bookButton)
    expect(screen.getByRole('alert')).toHaveTextContent('Selecione uma suíte')
  })

  it('shows error message if check-out is before check-in', () => {
    render(<App />)
    const checkInInput = screen.getByLabelText(/Check-in:/i)
    const checkOutInput = screen.getByLabelText(/Check-out:/i)
    fireEvent.change(checkInInput, { target: { value: '2027-10-15' } })
    fireEvent.change(checkOutInput, { target: { value: '2027-10-10' } })
    
    const suiteCard = screen.getByText('Standard Room')
    fireEvent.click(suiteCard)

    const bookButton = screen.getByText(/Calcular e Reservar/i)
    fireEvent.click(bookButton)
    expect(screen.getByRole('alert')).toHaveTextContent('Check-out date must be after check-in date')
  })

  it('hides suites when capacity is insufficient', () => {
    render(<App />)
    const guestsInput = screen.getByLabelText(/Hóspedes:/i)
    fireEvent.change(guestsInput, { target: { value: '3' } })
    expect(screen.queryByText('Standard Room')).not.toBeInTheDocument()
    expect(screen.getByText('Ocean View Suite')).toBeInTheDocument()
  })

  it('filters suites by category', () => {
    render(<App />)
    const categorySelect = screen.getByLabelText(/Categoria:/i)
    fireEvent.change(categorySelect, { target: { value: 'presidencial' } })
    expect(screen.queryByText('Standard Room')).not.toBeInTheDocument()
    expect(screen.getByText('Presidential Suite')).toBeInTheDocument()
  })

  it('calculates addons and applies 15% discount for bronze with coupon', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/Check-in:/i), { target: { value: '2027-10-10' } })
    fireEvent.change(screen.getByLabelText(/Check-out:/i), { target: { value: '2027-10-12' } }) // 2 noites
    
    // Default 2 guests
    fireEvent.click(screen.getByText('Standard Room'))
    
    // Café colonial is per-guest-night (50 * 2 guests * 2 nights = 200)
    const cafeColonial = screen.getByLabelText(/Café Colonial/i)
    fireEvent.click(cafeColonial)

    const couponInput = screen.getByPlaceholderText('Ex: DANSTAY15')
    fireEvent.change(couponInput, { target: { value: 'DANSTAY15' } })

    const bookButton = screen.getByText(/Calcular e Reservar/i)
    fireEvent.click(bookButton)

    await waitFor(() => {
      expect(screen.getByText(/Voucher: HTL-/)).toBeInTheDocument()
    })

    const addonsText = screen.getByText((_, element) => element?.textContent === 'Subtotal (Concierge): R$ 200.00')
    expect(addonsText).toBeInTheDocument()

    // 15% discount on room (200 * 0.15 = 30)
    const discountText = screen.getByText((_, element) => element?.textContent === 'Desconto: R$ 30.00')
    expect(discountText).toBeInTheDocument()
  })

  it('displays correct benefits for Ouro tier', async () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/Check-in:/i), { target: { value: '2027-10-10' } })
    fireEvent.change(screen.getByLabelText(/Check-out:/i), { target: { value: '2027-10-12' } })
    fireEvent.click(screen.getByText('Standard Room'))
    
    fireEvent.change(screen.getByLabelText(/Nível Fidelidade:/i), { target: { value: 'ouro' } })
    fireEvent.click(screen.getByText(/Calcular e Reservar/i))

    await waitFor(() => {
      expect(screen.getByText('late check-out cortesia')).toBeInTheDocument()
    })
  })
})
