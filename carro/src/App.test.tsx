import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./data/cars', () => ({
  cars: [
    { id: '1', make: 'Toyota', model: 'Corolla', year: 2023, price: 25000, imageUrl: '', description: '' },
    { id: '2', make: 'Honda', model: 'Civic', year: 2022, price: 24000, imageUrl: '', description: '' },
    { id: '3', make: 'Ford', model: 'Mustang', year: 2021, price: 45000, imageUrl: '', description: '' },
    { id: '4', make: 'Tesla', model: 'Model 3', year: 2023, price: 40000, imageUrl: '', description: '' },
    { id: '5', make: 'Toyota', model: 'Camry', year: 2022, price: 26000, imageUrl: '', description: '' },
  ]
}))

describe('App', () => {
  it('renders the header and car list', () => {
    render(<App />)
    expect(screen.getByText('Car Dealership')).toBeInTheDocument()
    expect(screen.getAllByTestId('car-card')).toHaveLength(5)
  })

  it('renders the footer with the current year', () => {
    render(<App />)
    const currentYear = new Date().getFullYear()
    expect(screen.getByText(new RegExp(`© ${currentYear} Auto Sales. All rights reserved.`, 'i'))).toBeInTheDocument()
  })

  it('filters cars by full name (make and model)', async () => {
    render(<App />)
    const searchInput = screen.getByLabelText('Search cars')
    
    await userEvent.type(searchInput, 'Toyota Corolla')
    
    expect(screen.getAllByTestId('car-card')).toHaveLength(1)
    expect(screen.getByText(/Toyota Corolla/i)).toBeInTheDocument()
  })

  it('filters cars by lowercase make and ignores surrounding whitespace', async () => {
    render(<App />)
    const searchInput = screen.getByLabelText('Search cars')
    
    await userEvent.type(searchInput, '  toyota  ')
    
    expect(screen.getAllByTestId('car-card')).toHaveLength(2) // Corolla and Camry
  })

  it('filters cars by model', async () => {
    render(<App />)
    const searchInput = screen.getByLabelText('Search cars')
    
    await userEvent.type(searchInput, 'civic')
    
    expect(screen.getAllByTestId('car-card')).toHaveLength(1)
    expect(screen.getByText(/Honda Civic/i)).toBeInTheDocument()
  })

  it('shows custom empty message when search does not match', async () => {
    render(<App />)
    const searchInput = screen.getByLabelText('Search cars')
    
    await userEvent.type(searchInput, 'NonExistentCar')
    
    expect(screen.getByText('No cars match your search.')).toBeInTheDocument()
    expect(screen.queryAllByTestId('car-card')).toHaveLength(0)
  })
  
  it('restores all cars when search input is cleared', async () => {
    render(<App />)
    const searchInput = screen.getByLabelText('Search cars')
    
    await userEvent.type(searchInput, 'tesla')
    expect(screen.getAllByTestId('car-card')).toHaveLength(1)
    
    await userEvent.clear(searchInput)
    expect(screen.getAllByTestId('car-card')).toHaveLength(5)
  })
})
