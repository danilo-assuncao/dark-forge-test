import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

vi.mock('./domain/tracking', async () => {
  const actual = await vi.importActual('./domain/tracking')
  return {
    ...actual,
    lookupShipment: vi.fn((code: string) => {
      if (code === 'CRG-1001') {
        return {
          trackingCode: 'CRG-1001',
          status: 'coletado',
          estimatedDeliveryDate: '2026-12-01',
          mode: 'economico'
        }
      }
      return undefined
    })
  }
})

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the heading', () => {
    render(<App />)
    expect(screen.getByText('Dan Cargo')).toBeInTheDocument()
  })

  it('switches between Calculator and Tracking tabs', () => {
    render(<App />)
    expect(screen.getByText('Calculadora de Frete')).toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Rastreamento'))
    expect(screen.getByText('Rastreamento de Encomendas')).toBeInTheDocument()
    expect(screen.queryByText('Calculadora de Frete')).not.toBeInTheDocument()
    
    fireEvent.click(screen.getByText('Calculadora / Despacho'))
    expect(screen.getByText('Calculadora de Frete')).toBeInTheDocument()
  })

  it('calculates freight correctly on valid input', () => {
    render(<App />)
    // It should render results after calculation
    fireEvent.change(screen.getByLabelText(/Origem/i), { target: { value: 'SP' } })
    fireEvent.change(screen.getByLabelText(/Destino/i), { target: { value: 'RJ' } })
    fireEvent.click(screen.getByText('Calcular'))

    expect(screen.getByTestId('calculator-results')).toBeInTheDocument()
    expect(screen.getByText(/Comparador de Modalidades/)).toBeInTheDocument()
  })

  it('can search for a tracking code', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Rastreamento'))

    fireEvent.change(screen.getByPlaceholderText('CRG-1001'), { target: { value: 'CRG-1001' } })
    fireEvent.click(screen.getByText('Buscar'))

    expect(screen.getByTestId('tracking-results')).toBeInTheDocument()
    expect(screen.getByText(/Status da Encomenda: CRG-1001/)).toBeInTheDocument()
  })
})
