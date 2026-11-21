import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the header', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /Móveis SPA/i })
    expect(heading).toBeInTheDocument()
  })
})
