import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Catalog } from './components/Catalog'
import App from './App'

describe('BebidaApp', () => {
  it('renders the header correctly', () => {
    render(<App />)
    expect(screen.getByText('BebidaApp')).toBeInTheDocument()
  })

  it('renders catalog and filters drinks by search', () => {
    render(<Catalog />)

    expect(screen.getByText('IPA Artesanal')).toBeInTheDocument()
    expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument()

    const searchInput = screen.getByPlaceholderText('Buscar bebidas...')
    fireEvent.change(searchInput, { target: { value: 'IPA' } })

    expect(screen.getByText('IPA Artesanal')).toBeInTheDocument()
    expect(screen.queryByText('Cabernet Sauvignon')).not.toBeInTheDocument()
  })

  it('filters drinks by category', () => {
    render(<Catalog />)

    const wineCategory = screen.getByRole('button', { name: 'Vinho' })
    fireEvent.click(wineCategory)

    expect(screen.getByText('Cabernet Sauvignon')).toBeInTheDocument()
    expect(screen.queryByText('IPA Artesanal')).not.toBeInTheDocument()
  })
})
