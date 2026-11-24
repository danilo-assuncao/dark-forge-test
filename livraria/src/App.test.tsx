import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('adds and removes books from the cart and updates the total', () => {
    render(<App />)
    expect(screen.getByText('Your cart is empty.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add Dune to cart' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add Dune to cart' }))
    expect(screen.getByText('Total: $109.80')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Remove Dune' }))
    expect(screen.getByText('Total: $0.00')).toBeInTheDocument()
  })

  it('filters by genre and shows details', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Mystery' }))
    expect(screen.queryByText('Dune')).not.toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: 'Details' })[0])
    expect(screen.getByText('Murder on the Orient Express')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add to cart' })).toBeInTheDocument()
  })
})
