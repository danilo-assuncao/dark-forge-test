import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import '@testing-library/jest-dom/vitest'
import App from './App'

describe('App', () => {
  it('renders correctly', () => {
    render(<App />)
    expect(screen.getByText(/Count is 0/i)).toBeInTheDocument()
  })
})
