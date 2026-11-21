import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CarList } from './CarList'

const mockCars = [
  { id: '1', make: 'Make1', model: 'Model1', year: 2020, price: 10000, imageUrl: '', description: '' },
  { id: '2', make: 'Make2', model: 'Model2', year: 2021, price: 20000, imageUrl: '', description: '' },
]

describe('CarList', () => {
  it('renders a list of cars', () => {
    render(<CarList cars={mockCars} />)
    expect(screen.getAllByTestId('car-card')).toHaveLength(2)
  })

  it('renders default empty message when there are no cars', () => {
    render(<CarList cars={[]} />)
    expect(screen.getByText('No cars available.')).toBeInTheDocument()
  })
  
  it('renders custom empty message', () => {
    render(<CarList cars={[]} emptyMessage="Custom empty." />)
    expect(screen.getByText('Custom empty.')).toBeInTheDocument()
  })
})
