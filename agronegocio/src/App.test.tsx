import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders heading and increments counter on button click', () => {
    render(<App />)

    // Check heading
    const heading = screen.getByRole('heading', { name: /Agronegócio SPA/i })
    expect(heading).toBeInTheDocument()

    // Check initial counter value
    const button = screen.getByRole('button', { name: /Ações registradas: 0/i })
    expect(button).toBeInTheDocument()

    // Click button and check if counter increments to 1
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /Ações registradas: 1/i })).toBeInTheDocument()

    // Click button again and check if counter increments to 2
    fireEvent.click(button)
    expect(screen.getByRole('button', { name: /Ações registradas: 2/i })).toBeInTheDocument()
  })
})
