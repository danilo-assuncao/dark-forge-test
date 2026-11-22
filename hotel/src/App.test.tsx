import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders Dan Stay SPA heading', () => {
    render(<App />)
    expect(screen.getByText('Dan Stay SPA')).toBeInTheDocument()
  })

  it('filters suites and calculates booking summary correctly', async () => {
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
    
    // Verify total elements are rendered with correct values
    const roomTotalText = screen.getByText((_, element) => {
      return element?.textContent === 'Subtotal (Quarto): R$ 500.00'
    })
    expect(roomTotalText).toBeInTheDocument()
    
    const discountText = screen.getByText((_, element) => {
      return element?.textContent === 'Desconto: R$ 40.00'
    })
    expect(discountText).toBeInTheDocument()
  })
})
