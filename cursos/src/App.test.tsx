import { render, screen, fireEvent } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the heading', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /Dan Academy/i })).toBeInTheDocument()
  })

  it('renders tracks and allows adding to cart', () => {
    render(<App />)
    expect(screen.getByText(/React Básico/i)).toBeInTheDocument()
    
    const cartButtons = screen.getAllByRole('button', { name: /Adicionar ao Carrinho/i })
    expect(cartButtons.length).toBeGreaterThan(0)
    
    // Add first track to cart
    fireEvent.click(cartButtons[0])
    
    // Check cart updated
    expect(screen.getByText(/Subtotal/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Remover do Carrinho/i })).toBeInTheDocument()
  })
})
