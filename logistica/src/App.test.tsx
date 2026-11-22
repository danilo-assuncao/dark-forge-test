import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import App from './App'
import * as zones from './data/zones'

describe('App', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Freeze time to a known date so SLA calculations are deterministic
    vi.setSystemTime(new Date('2026-11-20T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
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

  describe('CalculatorPanel', () => {
    it('calculates freight and asserts modality prices and shipping label', () => {
      render(<App />)
      fireEvent.change(screen.getByLabelText(/Origem/i), { target: { value: 'SP' } })
      fireEvent.change(screen.getByLabelText(/Destino/i), { target: { value: 'RJ' } })
      fireEvent.change(screen.getByLabelText(/Peso Real/i), { target: { value: '10' } })
      fireEvent.change(screen.getByLabelText(/Comp\./i), { target: { value: '50' } })
      fireEvent.change(screen.getByLabelText(/Largura/i), { target: { value: '50' } })
      fireEvent.change(screen.getByLabelText(/Altura/i), { target: { value: '50' } })
      fireEvent.change(screen.getByLabelText(/Valor Declarado/i), { target: { value: '1000' } })
      fireEvent.change(screen.getByLabelText(/Cupom/i), { target: { value: 'DANCARGO10' } })
      fireEvent.click(screen.getByText('Calcular'))

      expect(screen.getByTestId('calculator-results')).toBeInTheDocument()
      
      // volumetric is 50*50*50 / 6000 = 20.833 kg
      expect(screen.getAllByText(/20\.83 kg/).length).toBeGreaterThan(0)
      
      // base freight for SP->RJ is 50/kg
      // billable weight is 20.833
      // baseFreight = 50 * 20.833 = 1041.67
      // adValorem = 1000 * 0.008 = 8
      // coupon = 10% of 1041.67 = 104.17
      // total = 1041.67 + 8 - 104.17 = 945.50
      
      expect(screen.getByText(/R\$ 945\.50/)).toBeInTheDocument()
      
      // expresso = 1.5 * 1041.67 = 1562.50 base
      // coupon = 156.25
      // total = 1562.50 + 8 - 156.25 = 1414.25
      expect(screen.getByText(/R\$ 1414\.25/)).toBeInTheDocument()
      
      // aereo = 2.5 * 1041.67 = 2604.17 base
      // coupon = 260.42
      // total = 2604.17 + 8 - 260.42 = 2351.75
      expect(screen.getByText(/R\$ 2351\.75/)).toBeInTheDocument()

      expect(screen.getByText('CRG-XXXX')).toBeInTheDocument()
    })

    it('shows error on invalid domain input', () => {
      render(<App />)
      fireEvent.change(screen.getByLabelText(/Peso Real/i), { target: { value: '0' } })
      fireEvent.click(screen.getByText('Calcular'))

      expect(screen.getByText(/Peso e dimensões devem ser números positivos\./)).toBeInTheDocument()
      expect(screen.queryByTestId('calculator-results')).not.toBeInTheDocument()

      fireEvent.change(screen.getByLabelText(/Peso Real/i), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(/Quantidade/i), { target: { value: '0' } })
      fireEvent.click(screen.getByText('Calcular'))
      expect(screen.getByText(/A quantidade deve ser um número inteiro positivo\./)).toBeInTheDocument()

      fireEvent.change(screen.getByLabelText(/Quantidade/i), { target: { value: '1.5' } })
      fireEvent.click(screen.getByText('Calcular'))
      expect(screen.getByText(/A quantidade deve ser um número inteiro positivo\./)).toBeInTheDocument()

      fireEvent.change(screen.getByLabelText(/Quantidade/i), { target: { value: '1' } })
      fireEvent.change(screen.getByLabelText(/Valor Declarado/i), { target: { value: '-10' } })
      fireEvent.click(screen.getByText('Calcular'))
      expect(screen.getByText(/O valor declarado deve ser um número não-negativo\./)).toBeInTheDocument()

      fireEvent.change(screen.getByLabelText(/Valor Declarado/i), { target: { value: '100' } })
      
      const findRouteSpy = vi.spyOn(zones, 'findRoute').mockReturnValue(undefined)
      fireEvent.click(screen.getByText('Calcular'))
      expect(screen.getByText(/Rota não encontrada/)).toBeInTheDocument()
      findRouteSpy.mockRestore()

      fireEvent.change(screen.getByLabelText(/Altura/i), { target: { value: '' } })
      fireEvent.click(screen.getByText('Calcular'))
      // Number('') is 0, which triggers the positive number error
      expect(screen.getByText(/Peso e dimensões devem ser números positivos\./)).toBeInTheDocument()
    })

    it('calculates freight without coupon and shipping label', () => {
      render(<App />)
      fireEvent.change(screen.getByLabelText(/Origem/i), { target: { value: 'SP' } })
      fireEvent.change(screen.getByLabelText(/Destino/i), { target: { value: 'RJ' } })
      fireEvent.change(screen.getByLabelText(/Cupom/i), { target: { value: '' } })
      fireEvent.click(screen.getByText('Calcular'))

      expect(screen.getByTestId('calculator-results')).toBeInTheDocument()
      expect(screen.queryByText('CRG-XXXX')).not.toBeInTheDocument()
    })
  })

  describe('TrackingPanel', () => {
    beforeEach(() => {
      render(<App />)
      fireEvent.click(screen.getByText('Rastreamento'))
    })

    it('shows error for unknown tracking code or empty', () => {
      fireEvent.change(screen.getByPlaceholderText('CRG-1001'), { target: { value: 'INVALID' } })
      fireEvent.click(screen.getByText('Buscar'))
      expect(screen.getByText('Encomenda não encontrada.')).toBeInTheDocument()
      expect(screen.queryByTestId('tracking-results')).not.toBeInTheDocument()

      fireEvent.change(screen.getByPlaceholderText('CRG-1001'), { target: { value: '   ' } })
      fireEvent.click(screen.getByText('Buscar'))
      expect(screen.getByText('Encomenda não encontrada.')).toBeInTheDocument()
    })

    it('handles lowercase and padded code normalization', () => {
      fireEvent.change(screen.getByPlaceholderText('CRG-1001'), { target: { value: '  crg-1001  ' } })
      fireEvent.click(screen.getByText('Buscar'))
      expect(screen.getByTestId('tracking-results')).toBeInTheDocument()
    })

    it('shows on-time status for future delivery and due-today', () => {
      // 2026-12-01 vs 2026-11-20
      fireEvent.change(screen.getByPlaceholderText('CRG-1001'), { target: { value: 'CRG-1001' } })
      fireEvent.click(screen.getByText('Buscar'))

      expect(screen.getByTestId('tracking-results')).toBeInTheDocument()
      expect(screen.getByTestId('sla-on-time')).toHaveTextContent('No prazo (11 dias restantes)')

      // due-today
      fireEvent.change(screen.getByPlaceholderText('CRG-1001'), { target: { value: 'CRG-1002' } })
      fireEvent.click(screen.getByText('Buscar'))
      expect(screen.getByTestId('sla-on-time')).toHaveTextContent('No prazo (0 dias restantes)')
    })

    it('shows delivered-on-time status', () => {
      // 'entregue' shipment ignores dates for delay status
      fireEvent.change(screen.getByPlaceholderText('CRG-1001'), { target: { value: 'CRG-1004' } })
      fireEvent.click(screen.getByText('Buscar'))

      expect(screen.getByTestId('sla-on-time')).toHaveTextContent('Entregue')
    })

    it('shows delayed status for past delivery', () => {
      vi.setSystemTime(new Date('2026-12-05T12:00:00Z'))
      fireEvent.change(screen.getByPlaceholderText('CRG-1001'), { target: { value: 'CRG-1001' } })
      fireEvent.click(screen.getByText('Buscar'))

      expect(screen.getByTestId('sla-delayed')).toHaveTextContent('Atrasado (4 dias)')
    })
  })
})
