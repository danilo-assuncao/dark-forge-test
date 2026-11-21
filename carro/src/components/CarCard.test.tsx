import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CarCard } from './CarCard'
import type { Car } from '../types/Car'

const mockCar: Car = {
  id: 'test-1',
  make: 'TestMake',
  model: 'TestModel',
  year: 2024,
  price: 30000,
  imageUrl: 'https://example.com/test.jpg',
  description: 'Test description.'
}

describe('CarCard', () => {
  it('renders car details correctly', () => {
    render(<CarCard car={mockCar} />)
    
    expect(screen.getByText('TestMake TestModel (2024)')).toBeInTheDocument()
    expect(screen.getByText('$30,000.00')).toBeInTheDocument()
    expect(screen.getByText('Test description.')).toBeInTheDocument()
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'https://example.com/test.jpg')
    expect(image).toHaveAttribute('alt', 'TestMake TestModel')
  })
})
