import { render, screen } from '@testing-library/react'
import App from './App'
import { describe, it, expect } from 'vitest'

describe('App', () => {
  it('renders Vite and React logos', () => {
    render(<App />)
    expect(screen.getByAltText('React logo')).toBeInTheDocument()
    expect(screen.getByAltText('Vite logo')).toBeInTheDocument()
  })
})
