import '@testing-library/jest-dom/vitest'

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App component', () => {
  it('renders Petshop Catalog heading', () => {
    render(<App />)
    const heading = screen.getByRole('heading', { name: /Petshop Catalog/i })
    expect(heading).toBeInTheDocument()
  })
})
