import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the header and car list', () => {
    render(<App />)
    expect(screen.getByText('Car Dealership')).toBeInTheDocument()
    expect(screen.getAllByTestId('car-card').length).toBeGreaterThan(0)
  })

  it('filters cars based on search input', async () => {
    render(<App />)
    const searchInput = screen.getByLabelText('Search cars')
    
    // Type 'Toyota'
    await userEvent.type(searchInput, 'Toyota')
    
    // Only Toyota should be visible
    expect(screen.getByText(/Toyota Corolla/i)).toBeInTheDocument()
    expect(screen.queryByText(/Honda Civic/i)).not.toBeInTheDocument()
  })

  it('shows no cars message when search does not match', async () => {
    render(<App />)
    const searchInput = screen.getByLabelText('Search cars')
    
    await userEvent.type(searchInput, 'NonExistentCar')
    
    expect(screen.getByText('No cars available.')).toBeInTheDocument()
    expect(screen.queryAllByTestId('car-card')).toHaveLength(0)
  })
})
