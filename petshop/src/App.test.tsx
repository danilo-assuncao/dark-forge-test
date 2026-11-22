import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import App from './App'

describe('App component', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Set fixed date for deterministic tests: 2024-05-10T10:00:00Z
    vi.setSystemTime(new Date('2024-05-10T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

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

  it('calculates grooming quote correctly with defaults', () => {
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

  it('displays error when calculating grooming quote with no services', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Calcular Orçamento/i }))
    
    expect(screen.getByText(/Selecione pelo menos um serviço/i)).toBeInTheDocument()
    expect(screen.queryByText(/Total:/i)).not.toBeInTheDocument()
  })

  it('displays error when providing invalid coupon', () => {
    render(<App />)
    fireEvent.click(screen.getByLabelText(/Banho Simples/i))
    const couponInput = screen.getByPlaceholderText(/Ex: DANPET10/i)
    fireEvent.change(couponInput, { target: { value: 'INVALID123' } })
    fireEvent.click(screen.getByRole('button', { name: /Calcular Orçamento/i }))
    
    expect(screen.getByText(/Invalid coupon/i)).toBeInTheDocument()
    expect(screen.queryByText(/Total:/i)).not.toBeInTheDocument()
  })

  it('applies club discount, coupon, and non-default size/coat', () => {
    render(<App />)
    fireEvent.change(screen.getByLabelText(/Porte/i), { target: { value: 'grande' } })
    fireEvent.change(screen.getByLabelText(/Pelagem/i), { target: { value: 'longa' } })
    
    fireEvent.click(screen.getByLabelText(/Banho Simples/i))
    fireEvent.click(screen.getByRole('checkbox', { name: /Clube Pet/i }))
    
    const couponInput = screen.getByPlaceholderText(/Ex: DANPET10/i)
    fireEvent.change(couponInput, { target: { value: 'DANPET10' } })
    
    fireEvent.click(screen.getByRole('button', { name: /Calcular Orçamento/i }))
    
    // Banho Simples (grande, longa) = 60 * 1.2 = 72
    // Clube: 72 * 0.15 = 10.8
    // Subtotal: 72 - 10.8 = 61.2
    // Coupon: 61.2 * 0.1 = 6.12
    // Total: 61.2 - 6.12 = 55.08
    expect(screen.getByText(/Total: R\$ 55.08/i)).toBeInTheDocument()
    expect(screen.getByText(/Desconto Clube: R\$ 10.80/i)).toBeInTheDocument()
    expect(screen.getByText(/Desconto Cupom: R\$ 6.12/i)).toBeInTheDocument()
    expect(screen.getByText(/Protocolo: PET-[A-Z0-9]{4}/)).toBeInTheDocument()
  })

  it('evaluates vaccine wallet deterministically', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Saúde & Nutrição/i }))
    
    // 2024-05-10T10:00:00Z
    // mockRecords: V10: 2023-10-01 (due 2024-10-01) -> em dia (144 dias restantes)
    // Antirrabica: 2024-01-15 (due 2025-01-15) -> em dia (250 dias restantes)
    // Giardia: 2023-05-10 (due 2024-05-10) -> vence hoje
    
    const v10Item = screen.getByText('V10').closest('li')!
    expect(within(v10Item).getByText(/em dia \(144 dias restantes\)/i)).toBeInTheDocument()
    
    const antiItem = screen.getByText('Antirrabica').closest('li')!
    expect(within(antiItem).getByText(/em dia \(250 dias restantes\)/i)).toBeInTheDocument()
    
    const giardiaItem = screen.getByText('Giardia').closest('li')!
    expect(within(giardiaItem).getByText(/vence em breve \(vence hoje\)/i)).toBeInTheDocument()
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
    // Daily Grams = 1058 / 3.5 = ~302.4
    
    // Fixed comment: ~303g
    expect(screen.getByText(/303g/)).toBeInTheDocument()
  })

  it('hides nutrition result on invalid/empty weight', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Saúde & Nutrição/i }))
    const weightInput = screen.getByLabelText(/Peso \(kg\)/i)
    
    fireEvent.change(weightInput, { target: { value: '' } })
    expect(screen.queryByText(/Recomendação Diária:/i)).not.toBeInTheDocument()
    
    fireEvent.change(weightInput, { target: { value: '0' } })
    expect(screen.queryByText(/Recomendação Diária:/i)).not.toBeInTheDocument()
  })

  it('disables activity level and sets 3 meals for filhote', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /Saúde & Nutrição/i }))
    
    const stageSelect = screen.getByLabelText(/Fase da Vida/i)
    const activitySelect = screen.getByLabelText(/Nível de Atividade/i)
    
    fireEvent.change(stageSelect, { target: { value: 'filhote' } })
    expect(activitySelect).toBeDisabled()
    expect(screen.getByText('3')).toBeInTheDocument()
  })
})
