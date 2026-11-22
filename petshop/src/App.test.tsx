import '@testing-library/jest-dom/vitest'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

// We will mock Math.random/crypto for consistent protocols if needed, but not necessary if we just check for 'PET-'.
describe('App component', () => {
  it('renders Dan Pet heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /Dan Pet/i })
    expect(heading).toBeInTheDocument()
  })

  it('navigates between tabs', () => {
    render(<App />)
    
    // Initially GroomingTab should be visible
    expect(screen.getByRole('heading', { name: /Banho & Tosa/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Saúde & Nutrição/i })).not.toBeInTheDocument()

    // Click Health tab
    fireEvent.click(screen.getByRole('button', { name: /Saúde & Nutrição/i }))
    expect(screen.getByRole('heading', { name: /Saúde & Nutrição/i })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Banho & Tosa/i })).not.toBeInTheDocument()
  })

  it('calculates grooming quote correctly', () => {
    render(<App />)
    // Select Banho Simples
    fireEvent.click(screen.getByLabelText(/Banho Simples/i))
    // Select Hidratação
    fireEvent.click(screen.getByRole('checkbox', { name: /^Hidratação$/i }))
    // Click calcular
    fireEvent.click(screen.getByRole('button', { name: /Calcular Orçamento/i }))
    
    // Default size is pequeno, coat curta. 
    // Banho Simples (pequeno) = 30
    // Hidratação (addon) = 30
    // Total = 60
    expect(screen.getByText(/Total: R\$ 60.00/i)).toBeInTheDocument()
  })

  it('calculates nutrition recommendations correctly', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Saúde & Nutrição/i }))
    
    // Set weight to 20kg
    const weightInput = screen.getByLabelText(/Peso \(kg\)/i)
    fireEvent.change(weightInput, { target: { value: '20' } })
    
    // Weight 20 -> RER = 70 * (20^0.75) = ~661
    // Adult, Moderate -> 1.6
    // DER = 661 * 1.6 = ~1058
    // Daily Grams = 1058 / 3.5 = ~302
    
    expect(screen.getByText(/303g/i)).toBeInTheDocument()
  })
})
