import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CarCard } from './CarCard'
import type { Car } from '../types/Car'

describe('CarCard', () => {
  it('renders car details correctly', () => {
    const mockCar: Car = {
      id: 'test-1',
      make: 'TestMake',
      model: 'TestModel',
      year: 2024,
      price: 30000,
      imageUrl: 'https://example.com/test.jpg',
      description: 'Test description.'
    }
    
    render(<CarCard car={mockCar} />)
    
    expect(screen.getByText('TestMake TestModel (2024)')).toBeInTheDocument()
    expect(screen.getByText('$30,000.00')).toBeInTheDocument()
    expect(screen.getByText('Test description.')).toBeInTheDocument()
    
    const image = screen.getByRole('img')
    expect(image).toHaveAttribute('src', 'https://example.com/test.jpg')
    expect(image).toHaveAttribute('alt', 'TestMake TestModel')
  })

  it('renders fractional prices correctly', () => {
    const mockCar2: Car = {
      id: 'test-2',
      make: 'Make',
      model: 'Model',
      year: 2024,
      price: 15430.5,
      imageUrl: 'https://example.com/test2.jpg',
      description: 'Desc'
    }
    render(<CarCard car={mockCar2} />)
    expect(screen.getByText('$15,430.50')).toBeInTheDocument()
  })

  it('renders zero price correctly', () => {
    const mockCar3: Car = {
      id: 'test-3',
      make: 'Make',
      model: 'Model',
      year: 2024,
      price: 0,
      imageUrl: 'https://example.com/test3.jpg',
      description: 'Desc'
    }
    render(<CarCard car={mockCar3} />)
    expect(screen.getByText('$0.00')).toBeInTheDocument()
  })
})
