import { render, screen, fireEvent } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('renders App and increments counter', () => {
  render(<App />)
  
  const button = screen.getByRole('button', { name: /count is 0/i })
  expect(button).toBeDefined()
  
  fireEvent.click(button)
  
  const buttonAfterClick = screen.getByRole('button', { name: /count is 1/i })
  expect(buttonAfterClick).toBeDefined()
})
