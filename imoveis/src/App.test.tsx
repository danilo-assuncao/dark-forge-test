import '@testing-library/jest-dom'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the property catalog', () => {
    render(<App />)
    expect(screen.getByText('Dan Home')).toBeTruthy()
    expect(screen.getByText('Lindo apartamento no centro')).toBeTruthy()
    expect(screen.getByText('Casa com quintal')).toBeTruthy()
  })

  it('filters properties by type', () => {
    render(<App />)
    const typeSelect = screen.getByLabelText(/Tipo:/i)
    fireEvent.change(typeSelect, { target: { value: 'casa' } })
    
    expect(screen.getByText('Casa com quintal')).toBeTruthy()
    expect(screen.queryByText('Lindo apartamento no centro')).toBeNull()
  })

  it('filters properties by max price', () => {
    render(<App />)
    const maxPriceInput = screen.getByLabelText(/Máx\. Preço/i)
    fireEvent.change(maxPriceInput, { target: { value: '400000' } })
    
    expect(screen.getByText('Studio moderno')).toBeTruthy() // 320k
    expect(screen.queryByText('Lindo apartamento no centro')).toBeNull() // 450k
  })

  it('can open and use mortgage simulator', () => {
    render(<App />)
    const simBtns = screen.getAllByText('Simular Financiamento')
    fireEvent.click(simBtns[0]) // click on the first property's simulate button
    
    expect(screen.getByText('Simulador de Financiamento')).toBeTruthy()
    
    const incomeInput = screen.getByLabelText(/Renda Mensal/i)
    fireEvent.change(incomeInput, { target: { value: '20000' } })
    
    const calcBtn = screen.getByText('Calcular')
    fireEvent.click(calcBtn)
    
    expect(screen.getByText(/Resultado:/i)).toBeTruthy()
    
    const closeBtn = screen.getByText('Fechar')
    fireEvent.click(closeBtn)
    expect(screen.queryByText('Simulador de Financiamento')).toBeNull()
  })

  it('handles negative inputs and displays error in mortgage simulator', () => {
    render(<App />)
    const simBtns = screen.getAllByText('Simular Financiamento')
    fireEvent.click(simBtns[0])

    const incomeInput = screen.getByLabelText(/Renda Mensal/i)
    fireEvent.change(incomeInput, { target: { value: '-20000' } })
    
    const calcBtn = screen.getByText('Calcular')
    fireEvent.click(calcBtn)
    
    expect(screen.getByText(/Invalid input values: must be non-negative/i)).toBeTruthy()
  })

  it('can open and schedule visit', () => {
    render(<App />)
    const visitBtns = screen.getAllByText('Agendar Visita')
    fireEvent.click(visitBtns[0])
    
    expect(screen.getByText('Agendar Nova Visita')).toBeTruthy()
    
    const nameInput = screen.getByLabelText(/Seu Nome:/i)
    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    
    // tomorrow
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateInput = screen.getByLabelText(/Data da Visita/i)
    fireEvent.change(dateInput, { target: { value: tomorrow.toISOString().slice(0, 16) } })
    
    const schedBtn = screen.getByText('Agendar')
    fireEvent.click(schedBtn)
    
    expect(screen.getByText(/Visit scheduled successfully/i)).toBeTruthy()
  })

  it('rejects visit scheduling with empty name or past date', () => {
    render(<App />)
    const visitBtns = screen.getAllByText('Agendar Visita')
    fireEvent.click(visitBtns[0])

    const nameInput = screen.getByLabelText(/Seu Nome:/i)
    fireEvent.change(nameInput, { target: { value: '   ' } })
    
    const schedBtn = screen.getByText('Agendar')
    fireEvent.click(schedBtn)
    
    expect(screen.getByText(/Invalid visitor name/i)).toBeTruthy()

    fireEvent.change(nameInput, { target: { value: 'João Silva' } })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const dateInput = screen.getByLabelText(/Data da Visita/i)
    fireEvent.change(dateInput, { target: { value: yesterday.toISOString().slice(0, 16) } })
    
    fireEvent.click(schedBtn)
    expect(screen.getByText(/Invalid or past visit date/i)).toBeTruthy()
  })

  it('can open and evaluate purchase offer with coupon', () => {
    render(<App />)
    const offerBtns = screen.getAllByText('Fazer Proposta')
    fireEvent.click(offerBtns[0]) // property 1, 450000
    
    expect(screen.getByText('Fazer Nova Proposta')).toBeTruthy()
    
    const couponInput = screen.getByLabelText(/Cupom de Desconto/i)
    fireEvent.change(couponInput, { target: { value: 'DANHOME5' } })
    
    const offerBtn = screen.getByText('Enviar Proposta')
    fireEvent.click(offerBtn)
    
    // Desconto de 5% sobre 450000 = 22500
    expect(screen.getByText(/Offer evaluated successfully/i)).toBeTruthy()
    expect(screen.getByText(/R\$\s*22\.500,00/i)).toBeTruthy() // check discount
  })

  it('rejects purchase offer with invalid price', () => {
    render(<App />)
    const offerBtns = screen.getAllByText('Fazer Proposta')
    fireEvent.click(offerBtns[0])
    
    const offerPriceInput = screen.getByLabelText(/Preço Ofertado/i)
    fireEvent.change(offerPriceInput, { target: { value: '-1000' } })
    
    const offerBtn = screen.getByText('Enviar Proposta')
    fireEvent.click(offerBtn)
    
    expect(screen.getByText(/Invalid offered price/i)).toBeTruthy()
  })

  it('shows no results message when filters exclude all properties', () => {
    render(<App />)
    const typeSelect = screen.getByLabelText(/Tipo:/i)
    fireEvent.change(typeSelect, { target: { value: 'cobertura' } })
    
    const maxPriceInput = screen.getByLabelText(/Máx\. Preço/i)
    fireEvent.change(maxPriceInput, { target: { value: '1000' } })

    expect(screen.getByText(/Nenhum imóvel encontrado/i)).toBeTruthy()
  })

  it('handles rejected branches in mortgage simulator (income or down payment)', () => {
    render(<App />)
    const simBtns = screen.getAllByText('Simular Financiamento')
    fireEvent.click(simBtns[0])

    const incomeInput = screen.getByLabelText(/Renda Mensal/i)
    fireEvent.change(incomeInput, { target: { value: '1000' } }) // too low for a 450k property
    
    const ownResourcesInput = screen.getByLabelText(/Recursos Próprios/i)
    fireEvent.change(ownResourcesInput, { target: { value: '1000' } }) // 1k on 450k is < 20%
    
    const calcBtn = screen.getByText('Calcular')
    fireEvent.click(calcBtn)
    
    expect(screen.getByText(/❌ Renda Reprovada/i)).toBeTruthy()
    expect(screen.getByText(/❌ Entrada Reprovada/i)).toBeTruthy()
  })
})
